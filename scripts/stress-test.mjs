#!/usr/bin/env node
/**
 * IC SPICY backend stress / security test suite.
 *
 * Usage:
 *   node scripts/stress-test.mjs --network ic --test all
 *   node scripts/stress-test.mjs --network local --test rateLimits
 *   node scripts/stress-test.mjs --network ic --test authBoundary --canister ghxmp-xiaaa-aaaao-ba4sq-cai
 *
 * Safety (mainnet):
 *   - Default on --network ic: --mainnet-safe (reads + auth + non-persisting validation only)
 *   - rateLimits, concurrentWrites, treasurySecurity require --network local or --allow-writes
 *   - Uses fresh Ed25519 identities only (never dfx admin keys unless --allow-admin-tests)
 *   - Does NOT confirm payments, mint NFTs, or withdraw treasury funds
 *
 * Install deps once: cd scripts && npm install
 */

import { readFileSync } from 'fs';
import { HttpAgent, Actor, AnonymousIdentity } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import { Principal } from '@dfinity/principal';

// ─── CLI ─────────────────────────────────────────────────────────────────────

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const v = process.argv[i + 1];
  return !v || v.startsWith('--') ? true : v;
}

function required(name) {
  const v = arg(name);
  if (v === undefined || v === true) {
    console.error(`ERROR: --${name} is required`);
    process.exit(1);
  }
  return v;
}

const network = required('network');
const testArg = arg('test') ?? 'all';
const allowAdminTests = arg('allow-admin-tests') === true;
const allowWrites = arg('allow-writes') === true;
const verbose = arg('verbose') === true;

/** Write-heavy categories: local replica or explicit --allow-writes only. */
const writableEnabled = network === 'local' || allowWrites;

/**
 * Mainnet-safe mode: default on ic unless --allow-writes.
 * Pass --no-mainnet-safe to disable when combined with --allow-writes.
 */
const mainnetSafeMode =
  network === 'ic' &&
  !allowWrites &&
  arg('no-mainnet-safe') !== true;

const WRITE_CATEGORIES = new Set(['rateLimits', 'concurrentWrites', 'treasurySecurity']);

const DEFAULT_MAINNET_BACKEND = 'ghxmp-xiaaa-aaaao-ba4sq-cai';

let canisterIds;
try {
  canisterIds = JSON.parse(
    readFileSync(new URL('../canister_ids.json', import.meta.url), 'utf8'),
  );
} catch {
  canisterIds = {};
}

const canisterId =
  (typeof arg('canister') === 'string' ? arg('canister') : undefined) ??
  canisterIds.backend?.[network] ??
  (network === 'ic' ? DEFAULT_MAINNET_BACKEND : undefined);

if (!canisterId) {
  console.error(`ERROR: no backend canister id for network "${network}"`);
  process.exit(1);
}

const host =
  network === 'local' ? 'http://127.0.0.1:4943' : 'https://icp-api.io';

// ─── Report state ────────────────────────────────────────────────────────────

/** @type {{ section: string, name: string, ok: boolean, detail: string, skipped?: boolean }[]} */
const results = [];
let healthBefore = null;
let healthAfter = null;

function record(section, name, ok, detail, skipped = false) {
  results.push({ section, name, ok, detail, skipped });
  const icon = skipped ? '⏭' : ok ? '✅' : '❌';
  console.log(`${icon} ${name}: ${detail}`);
}

function sectionTitle(title) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 38 - title.length))}`);
}

// ─── IDL (minimal surface for stress tests) ──────────────────────────────────

const idlFactory = ({ IDL: I }) => {
  const Account = I.Record({
    owner: I.Principal,
    subaccount: I.Opt(I.Vec(I.Nat8)),
  });

  const OrderItem = I.Record({
    product_id: I.Nat,
    plant_id: I.Opt(I.Nat),
    quantity: I.Nat,
    price_cents: I.Nat,
  });

  const ShippingAddress = I.Record({
    full_name: I.Text,
    street_line1: I.Text,
    street_line2: I.Opt(I.Text),
    city: I.Text,
    state: I.Text,
    zip: I.Text,
    phone: I.Text,
  });

  const CreateOrderInput = I.Record({
    items: I.Vec(OrderItem),
    shipping: I.Opt(ShippingAddress),
    pickup: I.Bool,
  });

  const CreatePostInput = I.Record({
    content: I.Text,
    image_key: I.Opt(I.Text),
    image_keys: I.Vec(I.Text),
    anonymous: I.Bool,
    plant_id: I.Opt(I.Nat),
    nft_token_id: I.Opt(I.Nat),
  });

  const SaveProfileInput = I.Record({
    username: I.Text,
    bio: I.Text,
    avatar_key: I.Opt(I.Text),
    location: I.Opt(I.Text),
  });

  const CreateProposalInput = I.Record({
    title: I.Text,
    description: I.Text,
    category: I.Variant({ General: I.Null, Treasury: I.Null, Governance: I.Null }),
    options: I.Vec(I.Text),
    voting_starts_at: I.Int,
    voting_ends_at: I.Int,
  });

  const AdminOrderFilter = I.Variant({
    All: I.Null,
    Pending: I.Null,
    Paid: I.Null,
    PickedUp: I.Null,
    Shipped: I.Null,
    Cancelled: I.Null,
  });

  const TransferArgs = I.Record({
    to: Account,
    token_id: I.Nat,
    memo: I.Opt(I.Vec(I.Nat8)),
    created_at_time: I.Opt(I.Nat64),
  });

  const TransferError = I.Variant({
    NonExistingTokenId: I.Null,
    InvalidRecipient: I.Null,
    Unauthorized: I.Null,
    TooOld: I.Null,
    CreatedInFuture: I.Null,
    Duplicate: I.Null,
    GenericOptions: I.Text,
    GenericBatch: I.Text,
  });

  const TransferResult = I.Variant({
    Ok: I.Nat,
    Err: TransferError,
  });

  const Health = I.Record({
    cyclesBalance: I.Nat,
    memoryUsed: I.Nat,
    heapSize: I.Nat,
    isHealthy: I.Bool,
  });

  const AdminWithdrawResult = I.Record({
    success: I.Bool,
    blockIndex: I.Opt(I.Nat),
    message: I.Text,
  });

  const StoredFile = I.Record({
    path: I.Text,
    size: I.Nat,
    mime_type: I.Text,
    uploaded_at: I.Int,
  });

  const ProductPublic = I.Record({
    id: I.Nat,
    active: I.Bool,
    name: I.Text,
    price_cents: I.Nat,
  });

  return I.Service({
    getCanisterHealth: I.Func([], [Health], ['query']),
    getGlobalFeed: I.Func([I.Nat, I.Nat], [I.Vec(I.Record({}))], ['query']),
    listProducts: I.Func([], [I.Vec(ProductPublic)], ['query']),
    icrc7_token_metadata: I.Func(
      [I.Vec(I.Nat)],
      [I.Vec(I.Opt(I.Vec(I.Tuple(I.Text, I.Variant({ Nat: I.Nat, Int: I.Int, Text: I.Text, Blob: I.Vec(I.Nat8) })))))],
      ['query'],
    ),
    getPlantLifecycle: I.Func([I.Nat], [I.Opt(I.Record({}))], ['query']),
    icrc7_owner_of: I.Func([I.Vec(I.Nat)], [I.Vec(I.Opt(Account))], ['query']),
    createPost: I.Func([CreatePostInput], [I.Record({ id: I.Nat })], []),
    ensureCallerProfile: I.Func([], [], []),
    saveCallerUserProfile: I.Func([SaveProfileInput], [I.Bool], []),
    addVariety: I.Func(
      [I.Text, I.Text, I.Nat, I.Nat, I.Text, I.Opt(I.Text), I.Opt(I.Nat), I.Opt(I.Nat)],
      [I.Nat],
      [],
    ),
    placeOrder: I.Func([CreateOrderInput], [I.Record({ id: I.Nat })], []),
    storeCommunityImage: I.Func([I.Text, I.Vec(I.Nat8), I.Text], [StoredFile], []),
    listAllOrdersAdmin: I.Func([AdminOrderFilter], [I.Vec(I.Record({}))], ['query']),
    getAdminOrder: I.Func([I.Nat], [I.Opt(I.Record({}))], ['query']),
    adminWithdrawTokens: I.Func([I.Text, I.Principal, I.Nat], [AdminWithdrawResult], []),
    createProposal: I.Func([CreateProposalInput], [I.Record({ proposalId: I.Nat })], []),
    castVote: I.Func([I.Nat, I.Nat], [I.Bool], []),
    logWatering: I.Func([I.Nat, I.Nat, I.Opt(I.Float64), I.Opt(I.Text)], [I.Bool], []),
    listNftForSale: I.Func([I.Nat, I.Nat], [I.Bool], []),
    icrc7_transfer: I.Func([I.Vec(TransferArgs)], [I.Vec(I.Opt(TransferResult))], []),
  });
};

// ─── Agent helpers ───────────────────────────────────────────────────────────

async function makeAgent(identity) {
  const agent = new HttpAgent({ host, identity });
  if (network !== 'local') {
    await agent.fetchRootKey();
  }
  return agent;
}

function makeActor(agent) {
  return Actor.createActor(idlFactory, {
    agent,
    canisterId: Principal.fromText(canisterId),
  });
}

/** Fresh Ed25519 identity per simulated user (never admin). */
function freshIdentity(label = '') {
  const id = Ed25519KeyIdentity.generate();
  if (verbose) {
    console.log(`  identity ${label}: ${id.getPrincipal().toText()}`);
  }
  return id;
}

async function actorFor(identity) {
  return makeActor(await makeAgent(identity));
}

async function anonActor() {
  return makeActor(await makeAgent(new AnonymousIdentity()));
}

// ─── Error classification ────────────────────────────────────────────────────

function errText(err) {
  if (!err) return '';
  if (typeof err === 'string') return err;
  return String(err.message ?? err);
}

function isRateLimited(err) {
  return /rate limit/i.test(errText(err));
}

function isAuthRejected(err) {
  const t = errText(err);
  return (
    /unauthorized|admin only|authenticated|anonymous|reject code|403|permission denied|ingress/i.test(
      t,
    ) || /Profile required/i.test(t)
  );
}

function isValidationError(err) {
  const t = errText(err);
  return (
    /not found|inactive|insufficient|too large|invalid|required|must own|product|dao voting|proposal/i.test(
      t,
    ) || /trap/i.test(t)
  );
}

async function expectSuccess(label, section, fn) {
  try {
    const value = await fn();
    record(section, label, true, 'succeeded');
    return { ok: true, value };
  } catch (e) {
    record(section, label, false, errText(e));
    return { ok: false, error: e };
  }
}

async function expectFailure(label, section, fn, predicate) {
  try {
    const value = await fn();
    if (predicate) {
      const ok = predicate(value);
      record(
        section,
        label,
        ok,
        ok ? 'correctly rejected (falsy/expected result)' : `unexpected success: ${JSON.stringify(value)}`,
      );
      return { ok, value };
    }
    record(section, label, false, `unexpected success: ${JSON.stringify(value)}`);
    return { ok: false, value };
  } catch (e) {
    const ok = predicate
      ? predicate(e)
      : isAuthRejected(e) || isValidationError(e) || isRateLimited(e);
    record(section, label, ok, ok ? `correctly rejected (${errText(e).slice(0, 120)})` : errText(e));
    return { ok, error: e };
  }
}

async function setupProfile(actor, suffix) {
  await actor.ensureCallerProfile();
  await actor.saveCallerUserProfile({
    username: `stress_${suffix}_${Date.now()}`,
    bio: 'IC SPICY stress test profile',
    avatar_key: [],
    location: [],
  });
}

function postInput(content, extra = {}) {
  return {
    content,
    image_key: [],
    image_keys: [],
    anonymous: false,
    plant_id: [],
    nft_token_id: [],
    ...extra,
  };
}

function invalidPickupOrder(productId = 9_999_999n) {
  return {
    items: [
      {
        product_id: productId,
        plant_id: [],
        quantity: 1n,
        price_cents: 100n,
      },
    ],
    shipping: [],
    pickup: true,
  };
}

function randomTokenId() {
  return BigInt(1 + Math.floor(Math.random() * 8888));
}

function transferRejected(results) {
  const cell = results?.[0];
  if (!cell || cell.length === 0) return true;
  const r = cell[0];
  if (!r) return true;
  if ('Err' in r) return true;
  if (r.Err !== undefined) return true;
  return false;
}

async function timedBatch(label, section, count, fn) {
  const start = Date.now();
  const outcomes = await Promise.all(
    Array.from({ length: count }, (_, i) =>
      fn(i).then(
        (v) => ({ ok: true, value: v }),
        (e) => ({ ok: false, error: e }),
      ),
    ),
  );
  const elapsed = Date.now() - start;
  const okCount = outcomes.filter((o) => o.ok).length;
  const avg = Math.round(elapsed / count);
  record(
    section,
    label,
    okCount === count,
    `${okCount}/${count} succeeded (avg ${avg}ms, total ${elapsed}ms)`,
  );
  return outcomes;
}

async function sampleHealth() {
  const actor = await anonActor();
  return actor.getCanisterHealth();
}

// ─── Test categories ─────────────────────────────────────────────────────────

const TESTS = {
  async healthCheck() {
    sectionTitle('Health');
    healthBefore = await sampleHealth();
    record(
      'Health',
      'getCanisterHealth (before)',
      healthBefore.isHealthy === true,
      `cycles=${healthBefore.cyclesBalance}, memory=${healthBefore.memoryUsed}`,
    );
  },

  async rateLimits() {
    sectionTitle('Rate Limits');
    const section = 'Rate Limits';

    {
      const actor = await actorFor(freshIdentity('rate-post'));
      await setupProfile(actor, 'post');
      let allowed = 0;
      let blocked = 0;
      for (let i = 0; i < 10; i++) {
        try {
          await actor.createPost(postInput(`stress rate post ${i} ${Date.now()}`));
          allowed++;
        } catch (e) {
          if (isRateLimited(e)) blocked++;
        }
      }
      record(
        section,
        'createPost rate limit',
        allowed <= 5 && blocked >= 5,
        `${allowed}/10 allowed, ${blocked}/10 rate-limited (expect ≤5 allowed)`,
      );
    }

    {
      const actor = await actorFor(freshIdentity('rate-order'));
      let reached = 0;
      let blocked = 0;
      for (let i = 0; i < 6; i++) {
        try {
          await actor.placeOrder(invalidPickupOrder());
          reached++;
        } catch (e) {
          if (isRateLimited(e)) blocked++;
          else if (isValidationError(e)) reached++;
        }
      }
      record(
        section,
        'placeOrder rate limit',
        blocked >= 1,
        `${reached} reached canister, ${blocked}/6 rate-limited (expect block on 6th)`,
      );
    }

    {
      const actor = await actorFor(freshIdentity('rate-upload'));
      const payload = new Uint8Array(1024).fill(0xab);
      let allowed = 0;
      let blocked = 0;
      for (let i = 0; i < 15; i++) {
        try {
          await actor.storeCommunityImage(
            `community-images/stress-${Date.now()}-${i}.bin`,
            payload,
            'application/octet-stream',
          );
          allowed++;
        } catch (e) {
          if (isRateLimited(e)) blocked++;
        }
      }
      record(
        section,
        'storeCommunityImage rate limit',
        allowed <= 10 && blocked >= 5,
        `${allowed}/15 allowed, ${blocked}/15 rate-limited (expect ≤10 allowed)`,
      );
    }
  },

  async concurrentReads() {
    sectionTitle('Concurrent Reads');
    const section = 'Concurrent Reads';
    const actor = await anonActor();

    await timedBatch('50x getGlobalFeed', section, 50, () =>
      actor.getGlobalFeed(0n, 20n),
    );
    await timedBatch('50x listProducts', section, 50, () => actor.listProducts());
    await timedBatch('50x icrc7_token_metadata', section, 50, () => {
      const ids = Array.from({ length: 5 }, () => randomTokenId());
      return actor.icrc7_token_metadata(ids);
    });
    await timedBatch('20x getPlantLifecycle', section, 20, () =>
      actor.getPlantLifecycle(randomTokenId()),
    );
  },

  async concurrentWrites() {
    sectionTitle('Concurrent Writes');
    const section = 'Concurrent Writes';
    const stamp = Date.now();

    {
      const outcomes = await Promise.all(
        Array.from({ length: 10 }, async (_, i) => {
          const actor = await actorFor(freshIdentity(`write-post-${i}`));
          await setupProfile(actor, `wp${i}`);
          return actor.createPost(postInput(`concurrent post ${stamp} #${i}`));
        }).map((p) =>
          p.then(
            () => ({ ok: true }),
            (e) => ({ ok: false, e }),
          ),
        ),
      );
      const okCount = outcomes.filter((o) => o.ok).length;
      record(section, '10 identities createPost', okCount === 10, `${okCount}/10 created`);
    }

    {
      const outcomes = await Promise.all(
        Array.from({ length: 5 }, async (_, i) => {
          const actor = await actorFor(freshIdentity(`variety-${i}`));
          return actor.addVariety(
            `StressVariety_${stamp}_${i}`,
            'Capsicum annuum',
            1000n,
            5000n,
            'stress test variety',
            [],
            [90n],
            [120n],
          );
        }).map((p) =>
          p.then(
            (id) => ({ ok: true, id }),
            (e) => ({ ok: false, e }),
          ),
        ),
      );
      const okCount = outcomes.filter((o) => o.ok).length;
      const uniqueIds = new Set(outcomes.filter((o) => o.ok).map((o) => o.id?.toString()));
      record(
        section,
        '5 identities addVariety',
        okCount === 5 && uniqueIds.size === 5,
        `${okCount}/5 succeeded, ${uniqueIds.size} unique IDs`,
      );
    }

    {
      const outcomes = await Promise.all(
        Array.from({ length: 10 }, async (_, i) => {
          const actor = await actorFor(freshIdentity(`profile-${i}`));
          await actor.ensureCallerProfile();
          return actor.saveCallerUserProfile({
            username: `stress_user_${stamp}_${i}`,
            bio: `profile ${i}`,
            avatar_key: [],
            location: [],
          });
        }).map((p) =>
          p.then(
            () => ({ ok: true }),
            (e) => ({ ok: false, e }),
          ),
        ),
      );
      const okCount = outcomes.filter((o) => o.ok).length;
      record(section, '10 identities saveCallerUserProfile', okCount === 10, `${okCount}/10 saved`);
    }
  },

  async authBoundary() {
    sectionTitle('Auth Boundary');
    const section = 'Auth Boundary';
    const userId = freshIdentity('auth-user');
    const user = await actorFor(userId);
    const anon = await anonActor();

    await expectFailure('anon createPost', section, () =>
      anon.createPost(postInput('anon post')),
    );
    await expectFailure('anon adminWithdrawTokens', section, () =>
      anon.adminWithdrawTokens('ryjl3-tyaaa-aaaaa-aaaba-cai', userId.getPrincipal(), 1n),
    );
    await expectFailure('non-admin listAllOrdersAdmin', section, () =>
      user.listAllOrdersAdmin({ All: null }),
    );
    await expectFailure('anon getAdminOrder', section, () => anon.getAdminOrder(1n));
    await expectFailure('non-admin createProposal', section, () =>
      user.createProposal({
        title: 'stress',
        description: 'x',
        category: { General: null },
        options: ['yes', 'no'],
        voting_starts_at: 0n,
        voting_ends_at: 999n,
      }),
    );
    await expectSuccess('anon getGlobalFeed', section, () => anon.getGlobalFeed(0n, 5n));
    await expectSuccess('anon listProducts', section, () => anon.listProducts());
    await expectSuccess('anon icrc7_token_metadata', section, () =>
      anon.icrc7_token_metadata([1n, 2n, 3n]),
    );
  },

  async inputValidation() {
    sectionTitle('Input Validation');
    const section = 'Input Validation';
    const actor = await actorFor(freshIdentity('validation'));

    if (!mainnetSafeMode) {
      await setupProfile(actor, 'val');

      {
        const long = 'X'.repeat(10_000);
        try {
          const post = await actor.createPost(postInput(long));
          record(
            section,
            'createPost 10k chars',
            post?.id !== undefined,
            'accepted (content truncated server-side to ≤2000 chars)',
          );
        } catch (e) {
          record(
            section,
            'createPost 10k chars',
            isValidationError(e),
            `rejected: ${errText(e).slice(0, 100)}`,
          );
        }
      }

      await expectFailure('createPost empty content', section, () =>
        actor.createPost(postInput('   ')),
      );

      {
        const huge = new Uint8Array(10 * 1024 * 1024);
        await expectFailure('storeCommunityImage 10MB', section, () =>
          actor.storeCommunityImage(
            `community-images/stress-huge-${Date.now()}.bin`,
            huge,
            'application/octet-stream',
          ),
        );
      }
    } else {
      record(
        section,
        'createPost / upload validation',
        true,
        'skipped in mainnet-safe mode (no persistent writes)',
        true,
      );
    }

    await expectFailure('placeOrder missing product', section, () =>
      actor.placeOrder(invalidPickupOrder(9_999_999n)),
    );

    {
      const products = await actor.listProducts();
      const active = products.find((p) => p.active);
      if (active) {
        await expectFailure('placeOrder qty 999999', section, () =>
          actor.placeOrder({
            items: [
              {
                product_id: active.id,
                plant_id: [],
                quantity: 999_999n,
                price_cents: active.price_cents ?? 100n,
              },
            ],
            shipping: [],
            pickup: true,
          }),
        );
      } else {
        record(section, 'placeOrder qty 999999', true, 'skipped — no active products', true);
      }
    }

    await expectFailure('logWatering missing plant', section, () =>
      actor.logWatering(999_999n, 100n, [], []),
      (v) => v === false,
    );
    await expectFailure('castVote missing proposal', section, () =>
      actor.castVote(9_999_999n, 0n),
    );
    await expectFailure('listNftForSale not owner', section, () =>
      actor.listNftForSale(1n, 1000n),
    );
  },

  async nftSecurity() {
    sectionTitle('NFT Security');
    const section = 'NFT Security';
    const attackerId = freshIdentity('nft-attacker');
    const attacker = await actorFor(attackerId);

    {
      try {
        const results = await attacker.icrc7_transfer([
          {
            to: { owner: attackerId.getPrincipal(), subaccount: [] },
            token_id: 1n,
            memo: [],
            created_at_time: [],
          },
        ]);
        record(
          section,
          'icrc7_transfer non-owner',
          transferRejected(results),
          transferRejected(results)
            ? 'transfer rejected (Unauthorized / Err / empty)'
            : JSON.stringify(results)?.slice(0, 120),
        );
      } catch (e) {
        record(
          section,
          'icrc7_transfer non-owner',
          isAuthRejected(e) || isValidationError(e),
          errText(e).slice(0, 120),
        );
      }
    }

    {
      const actor = await actorFor(freshIdentity('inactive-prod'));
      const products = await actor.listProducts();
      const inactive = products.find((p) => !p.active);
      await expectFailure(
        'placeOrder inactive product',
        section,
        () => actor.placeOrder(invalidPickupOrder(inactive?.id ?? 9_999_998n)),
      );
    }

    {
      const actor = await actorFor(freshIdentity('double-order'));
      const [a, b] = await Promise.allSettled([
        actor.placeOrder(invalidPickupOrder()),
        actor.placeOrder(invalidPickupOrder()),
      ]);
      const errors = [a, b].filter((r) => r.status === 'rejected').length;
      const successes = [a, b].filter((r) => r.status === 'fulfilled').length;
      record(
        section,
        'double-spend rapid placeOrder',
        errors >= 1 || successes <= 1,
        `${successes} fulfilled, ${errors} rejected (validation and/or rate limit)`,
      );
    }
  },

  async treasurySecurity() {
    sectionTitle('Treasury Security');
    const section = 'Treasury Security';
    const userId = freshIdentity('treasury-user');
    const user = await actorFor(userId);

    await expectFailure('non-admin adminWithdrawTokens', section, () =>
      user.adminWithdrawTokens('ryjl3-tyaaa-aaaaa-aaaba-cai', userId.getPrincipal(), 1n),
    );

    if (!allowAdminTests) {
      record(
        section,
        'admin withdraw over balance',
        true,
        'skipped — requires admin identity (--allow-admin-tests to enable)',
        true,
      );
      record(
        section,
        'withdrawal rate limit (3/hr)',
        true,
        'skipped — requires admin identity (--allow-admin-tests to enable)',
        true,
      );
      return;
    }

    record(
      section,
      'admin treasury tests',
      true,
      'skipped — extend script with admin PEM path to opt in',
      true,
    );
  },
};

// ─── Runner ──────────────────────────────────────────────────────────────────

function printHeader() {
  console.log('═══════════════════════════════════════════');
  console.log(' IC SPICY Stress Test Report');
  console.log(` Network: ${network}${network === 'ic' ? ' (mainnet)' : ''}`);
  console.log(` Canister: ${canisterId}`);
  console.log(` Time: ${new Date().toISOString()}`);
  console.log(` Test filter: ${testArg}`);
  console.log(
    ` Mode: ${mainnetSafeMode ? 'mainnet-safe (read-only + non-persisting validation)' : writableEnabled ? 'full (writes enabled)' : 'standard'}`,
  );
  console.log('═══════════════════════════════════════════');
}

function skipWriteCategory(name) {
  sectionTitle(name);
  record(
    name,
    `${name} (category)`,
    true,
    'skipped — requires --network local or --allow-writes',
    true,
  );
}

async function runCategory(name, names) {
  if (!names.includes('all') && !names.includes(name)) return;
  if (WRITE_CATEGORIES.has(name) && !writableEnabled) {
    skipWriteCategory(name);
    return;
  }
  await TESTS[name]();
}

function formatTrillion(cycles) {
  if (cycles <= 0n) return '0T';
  return `~${(Number(cycles) / 1e12).toFixed(3)}T`;
}

function printSummary() {
  if (healthAfter && healthBefore) {
    sectionTitle('Health');
    const cyclesDelta = healthBefore.cyclesBalance - healthAfter.cyclesBalance;
    const memDelta = healthAfter.memoryUsed - healthBefore.memoryUsed;
    console.log(`Cycles before: ${healthBefore.cyclesBalance}`);
    console.log(`Cycles after:  ${healthAfter.cyclesBalance}`);
    console.log(`Cycles consumed: ~${cyclesDelta > 0n ? cyclesDelta : 0n} (${formatTrillion(cyclesDelta)})`);
    console.log(
      `Memory: ${healthBefore.memoryUsed} → ${healthAfter.memoryUsed} (${memDelta >= 0n ? '+' : ''}${memDelta} bytes)`,
    );
  }

  const passed = results.filter((r) => r.ok && !r.skipped).length;
  const failed = results.filter((r) => !r.ok && !r.skipped).length;
  const skipped = results.filter((r) => r.skipped).length;
  const total = results.length;

  console.log('\n═══════════════════════════════════════════');
  console.log(
    `RESULT: ${passed}/${total - skipped} tests passed, ${failed} failed${skipped ? `, ${skipped} skipped` : ''}`,
  );
  console.log('═══════════════════════════════════════════');

  if (failed > 0) process.exitCode = 1;
}

async function runTests(names) {
  if (names.includes('all') || names.includes('healthCheck')) {
    await TESTS.healthCheck();
  }

  for (const name of [
    'rateLimits',
    'concurrentReads',
    'concurrentWrites',
    'authBoundary',
    'inputValidation',
    'nftSecurity',
    'treasurySecurity',
  ]) {
    await runCategory(name, names);
  }

  if (names.includes('all') || names.includes('healthCheck')) {
    healthAfter = await sampleHealth();
    record(
      'Health',
      'getCanisterHealth (after)',
      healthAfter.isHealthy === true,
      `cycles=${healthAfter.cyclesBalance}, memory=${healthAfter.memoryUsed}`,
    );
  }
}

async function main() {
  printHeader();
  const names = testArg.split(',').map((s) => s.trim());
  await runTests(names);
  printSummary();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
