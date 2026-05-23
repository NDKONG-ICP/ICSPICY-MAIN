#!/usr/bin/env node
// Export critical on-chain data to JSON for disaster recovery.
//
// Usage:
//   node scripts/backup-data.mjs --network ic [--identity-name ic_deploy] [--out backups/]
//
// Run weekly (cron). Requires an identity that can query the backend canister.

import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { HttpAgent, Actor } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { Principal } from '@dfinity/principal';
import { readFileSync } from 'fs';

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
const outDir = arg('out') ?? 'backups';
const identityName = arg('identity-name') ?? 'ic_deploy';
const identityPath =
  arg('identity-path') ??
  `${process.env.HOME}/.config/dfx/identity/${identityName}/identity.pem`;

let canisterIds;
try {
  canisterIds = JSON.parse(
    readFileSync(new URL('../canister_ids.json', import.meta.url), 'utf8'),
  );
} catch {
  console.error('ERROR: could not read canister_ids.json');
  process.exit(1);
}

const backendId = canisterIds.backend?.[network];
if (!backendId) {
  console.error(`ERROR: no backend canister id for network "${network}"`);
  process.exit(1);
}

const host =
  network === 'local' ? 'http://127.0.0.1:4943' : 'https://icp-api.io';

const idlFactory = ({ IDL: I }) => {
  const Account = I.Record({
    owner: I.Principal,
    subaccount: I.Opt(I.Vec(I.Nat8)),
  });
  return I.Service({
    icrc7_tokens: I.Func(
      [I.Opt(I.Nat), I.Opt(I.Nat)],
      [I.Vec(I.Nat)],
      ['query'],
    ),
    icrc7_owner_of: I.Func(
      [I.Vec(I.Nat)],
      [I.Vec(I.Opt(Account))],
      ['query'],
    ),
    listProducts: I.Func([], [I.Vec(I.Record({}))], ['query']),
    listAllOrdersAdmin: I.Func(
      [I.Variant({ All: I.Null, Pending: I.Null, Paid: I.Null, PickedUp: I.Null, Shipped: I.Null, Cancelled: I.Null })],
      [I.Vec(I.Record({}))],
      ['query'],
    ),
    getAdminInventory: I.Func(
      [
        I.Opt(I.Variant({})),
        I.Opt(I.Nat),
        I.Opt(I.Bool),
      ],
      [I.Vec(I.Record({}))],
      ['query'],
    ),
    listVarieties: I.Func([], [I.Vec(I.Record({}))], ['query']),
    getCanisterHealth: I.Func(
      [],
      [
        I.Record({
          cyclesBalance: I.Nat,
          memoryUsed: I.Nat,
          heapSize: I.Nat,
          isHealthy: I.Bool,
        }),
      ],
      ['query'],
    ),
  });
};

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function main() {
  const pem = readFileSync(identityPath, 'utf8');
  const identity = Secp256k1KeyIdentity.fromPem(pem);
  const agent = new HttpAgent({ host, identity });
  if (network !== 'local') {
    await agent.fetchRootKey();
  }

  const actor = Actor.createActor(idlFactory, {
    agent,
    canisterId: Principal.fromText(backendId),
  });

  console.log(`Backing up backend ${backendId} on ${network}…`);

  const stamp = timestamp();
  mkdirSync(outDir, { recursive: true });

  const health = await actor.getCanisterHealth();
  writeFileSync(
    join(outDir, `health-${stamp}.json`),
    JSON.stringify(health, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2),
  );

  const products = await actor.listProducts();
  writeFileSync(
    join(outDir, `products-${stamp}.json`),
    JSON.stringify(products, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2),
  );

  const varieties = await actor.listVarieties();
  writeFileSync(
    join(outDir, `varieties-${stamp}.json`),
    JSON.stringify(varieties, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2),
  );

  // Admin inventory (all plants)
  const allPlants = await actor.getAdminInventory([], [], []);
  writeFileSync(
    join(outDir, `plants-${stamp}.json`),
    JSON.stringify(allPlants, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2),
  );

  // Orders require admin
  try {
    const orders = await actor.listAllOrdersAdmin({ All: null });
    writeFileSync(
      join(outDir, `orders-${stamp}.json`),
      JSON.stringify(orders, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2),
    );
  } catch (e) {
    console.warn('WARN: listAllOrdersAdmin failed (admin identity required):', e.message);
  }

  // NFT ownership: paginate icrc7_tokens then batch owner_of
  const TOKEN_PAGE = 500n;
  let prev = null;
  const ownership = [];
  for (;;) {
    const tokens = await actor.icrc7_tokens([prev], [TOKEN_PAGE]);
    if (!tokens || tokens.length === 0) break;
    const owners = await actor.icrc7_owner_of(tokens);
    for (let i = 0; i < tokens.length; i++) {
      ownership.push({
        tokenId: tokens[i].toString(),
        owner: owners[i]?.[0]
          ? {
              owner: owners[i][0].owner.toText(),
              subaccount: owners[i][0].subaccount?.[0] ?? null,
            }
          : null,
      });
    }
    if (tokens.length < Number(TOKEN_PAGE)) break;
    prev = tokens[tokens.length - 1];
  }
  writeFileSync(
    join(outDir, `nft-ownership-${stamp}.json`),
    JSON.stringify(ownership, null, 2),
  );

  const manifest = {
    network,
    backendId,
    exportedAt: new Date().toISOString(),
    files: [
      `health-${stamp}.json`,
      `products-${stamp}.json`,
      `varieties-${stamp}.json`,
      `plants-${stamp}.json`,
      `orders-${stamp}.json`,
      `nft-ownership-${stamp}.json`,
    ],
    counts: {
      products: products.length,
      varieties: varieties.length,
      plants: allPlants.length,
      nftTokens: ownership.length,
    },
  };
  writeFileSync(join(outDir, `manifest-${stamp}.json`), JSON.stringify(manifest, null, 2));

  console.log('Backup complete:', join(outDir, `manifest-${stamp}.json`));
  console.log(JSON.stringify(manifest.counts, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
