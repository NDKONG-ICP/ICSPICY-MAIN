#!/usr/bin/env node
/**
 * Approve Bonsai marketplace + create 1.2 ICP listings for manifest tokens.
 *
 *   node scripts/bonsai-drop-list.js
 *   node scripts/bonsai-drop-list.js --approve-only
 *   node scripts/bonsai-drop-list.js --list-only
 */

import "dotenv/config";
import { loadCaptainIdentity, loadMnemonicFromEnv } from "../src/identity.js";
import {
  assertManifestReady,
  loadManifest,
  saveManifest,
} from "../src/lib/bonsai-drop/manifest.js";
import {
  BONSAI_COLLECTION_ID,
  DROP_PRICE_E8S,
  ICRC7_BATCH,
  isPepperHeadToken,
} from "../src/lib/bonsai-drop/constants.js";
import {
  captainAccount,
  createIcspicyLedgerActor,
  createMarketplaceActor,
  marketplaceSpenderAccount,
} from "../src/lib/bonsai-drop/actors.js";
import { createBonsaiClient } from "../src/clients/bonsai.js";

const APPROVE_ONLY = process.argv.includes("--approve-only");
const LIST_ONLY = process.argv.includes("--list-only");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const manifest = loadManifest();
  assertManifestReady(manifest);
  if (BigInt(manifest.priceE8s) !== DROP_PRICE_E8S) {
    throw new Error(`Manifest price ${manifest.priceE8s} != ${DROP_PRICE_E8S}`);
  }

  const identity = await loadCaptainIdentity(loadMnemonicFromEnv());
  const ledger = await createIcspicyLedgerActor(identity);
  const marketplace = await createMarketplaceActor(identity);
  const bonsai = await createBonsaiClient({ identity });
  const spender = marketplaceSpenderAccount();
  const me = captainAccount(identity.getPrincipal().toText());

  const approved = new Set(manifest.phases.approved.map(Number));
  const listed = new Set(Object.keys(manifest.phases.listings).map(Number));
  manifest.phases.listSkipped = manifest.phases.listSkipped ?? [];
  const skipped = new Set(manifest.phases.listSkipped.map(Number));

  if (!LIST_ONLY) {
    const needApprove = manifest.tokenIds.filter((id) => !approved.has(Number(id)));
    console.log(`[bonsai-drop-list] approving ${needApprove.length} tokens`);
    for (let i = 0; i < needApprove.length; i += ICRC7_BATCH) {
      const batch = needApprove.slice(i, i + ICRC7_BATCH);
      const now = BigInt(Date.now()) * 1_000_000n;
      const args = batch.map((tokenId) => ({
        token_id: BigInt(tokenId),
        approval_info: {
          from_subaccount: [],
          spender,
          memo: [],
          expires_at: [],
          created_at_time: [now],
        },
      }));
      const results = await ledger.icrc37_approve_tokens(args);
      for (let j = 0; j < batch.length; j += 1) {
        const inner = results[j]?.[0];
        if (!inner || "Err" in inner) {
          throw new Error(
            `approve ${batch[j]} failed: ${JSON.stringify(inner?.Err ?? "empty")}`,
          );
        }
        manifest.phases.approved.push(Number(batch[j]));
        approved.add(Number(batch[j]));
      }
      saveManifest(manifest);
      process.stdout.write(
        `\r[bonsai-drop-list] approved ${manifest.phases.approved.length}/${manifest.tokenIds.length}`,
      );
      await sleep(200);
    }
    console.log("");
  }

  if (APPROVE_ONLY) return;

  const captainText = me.owner.toText();
  const onChainAll = await bonsai.listCollectionListings(Number(BONSAI_COLLECTION_ID));
  let backfilled = 0;
  for (const l of onChainAll) {
    if (!l.active || l.seller.toText() !== captainText) continue;
    const tid = Number(l.tokenId);
    if (!manifest.tokenIds.includes(tid)) continue;
    if (BigInt(l.priceE8s) !== BigInt(manifest.priceE8s)) continue;
    if (!listed.has(tid)) {
      manifest.phases.listings[String(tid)] = Number(l.id);
      listed.add(tid);
      backfilled += 1;
    }
  }
  if (backfilled) {
    saveManifest(manifest);
    console.log(`[bonsai-drop-list] backfilled ${backfilled} listings from chain`);
  }

  const needList = manifest.tokenIds.filter(
    (id) => !listed.has(Number(id)) && !skipped.has(Number(id)),
  );
  console.log(`[bonsai-drop-list] listing ${needList.length} tokens @ 1.2 ICP`);
  for (const tokenId of needList) {
    const id = Number(tokenId);
    if (isPepperHeadToken(id)) throw new Error(`Refusing PepperHead ${id}`);
    if (!manifest.tokenIds.includes(id)) throw new Error(`Token ${id} not in manifest`);

    const owners = await ledger.icrc7_owner_of([BigInt(id)]);
    const owner = owners[0]?.[0];
    if (owner?.owner?.toText?.() !== me.owner.toText()) {
      throw new Error(`Token ${id} not owned by Captain`);
    }

    const already = onChainAll.find(
      (l) =>
        l.active &&
        Number(l.tokenId) === id &&
        l.seller.toText() === captainText &&
        BigInt(l.priceE8s) === BigInt(manifest.priceE8s),
    );
    if (already) {
      manifest.phases.listings[String(id)] = Number(already.id);
      listed.add(id);
      saveManifest(manifest);
      process.stdout.write(
        `\r[bonsai-drop-list] listed ${Object.keys(manifest.phases.listings).length}/${manifest.tokenIds.length}`,
      );
      await sleep(50);
      continue;
    }

    let listingId = null;
    for (let attempt = 0; attempt < 3 && listingId == null; attempt += 1) {
      try {
        listingId = await bonsai.createBazaarListing(
          BONSAI_COLLECTION_ID,
          id,
          manifest.priceE8s,
        );
      } catch (err) {
        console.error(`\n[bonsai-drop-list] token ${id} attempt ${attempt + 1}: ${err.message ?? err}`);
      }
      if (listingId == null) await sleep(1500);
    }
    if (listingId == null) {
      manifest.phases.listSkipped.push(id);
      skipped.add(id);
      saveManifest(manifest);
      console.error(`\n[bonsai-drop-list] skipped token ${id}`);
      continue;
    }
    manifest.phases.listings[String(id)] = Number(listingId);
    listed.add(id);
    saveManifest(manifest);
    process.stdout.write(
      `\r[bonsai-drop-list] listed ${Object.keys(manifest.phases.listings).length}/${manifest.tokenIds.length}`,
    );
    await sleep(250);
  }
  console.log("");

  const onChain = await bonsai.listCollectionListings(Number(BONSAI_COLLECTION_ID));
  const captain = identity.getPrincipal().toText();
  const ours = onChain.filter(
    (l) => l.active && l.seller.toText() === captain && manifest.tokenIds.includes(Number(l.tokenId)),
  );
  console.log(
    `[bonsai-drop-list] reconciliation: ${ours.length} active Captain listings in collection 1`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
