import { Actor, HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";

export const BGA_OWNERSHIP = "bx2z5-bqaaa-aaaau-ag4na-cai";
export const BGA_FOIL_LEDGER = "i6rxy-gaaaa-aaaau-ahaba-cai";
export const BGA_ARENA_UI = "bq37j-miaaa-aaaau-ag4nq-cai";
export const BGA_RANKED_LOBBY = "paqal-qyaaa-aaaau-ag5oq-cai";
export const BGA_ESCROW = "b6zsb-xyaaa-aaaau-ag4mq-cai";

function ownershipIdl({ IDL: l }) {
  const sku = l.Record({
    id: l.Text,
    name: l.Text,
    cardsPerPack: l.Nat,
    priceE8s: l.Nat,
    priceUsdCents: l.Nat,
    priceHbarTinybars: l.Nat,
  });
  const bal = l.Record({
    warden: l.Nat,
    captain: l.Nat,
    wardenHedera: l.Nat,
    captainHedera: l.Nat,
  });
  const openRes = l.Variant({
    ok: l.Record({
      receiptId: l.Nat,
      opener: l.Principal,
      packTokenId: l.Nat,
      skuId: l.Text,
      seedHex: l.Text,
      cardIds: l.Vec(l.Nat),
      cardTokenIds: l.Vec(l.Nat),
      openedAt: l.Int,
    }),
    err: l.Text,
  });
  return l.Service({
    health: l.Func([], [l.Text], ["query"]),
    listPackSkus: l.Func([], [l.Vec(sku)], ["query"]),
    getPackBalance: l.Func([l.Principal], [bal], ["query"]),
    getOwnedCardIds: l.Func([l.Principal], [l.Vec(l.Nat)], ["query"]),
    getPlayableCardIds: l.Func([l.Principal], [l.Vec(l.Nat)], ["query"]),
    consumePackCredit: l.Func([l.Text], [l.Text], []),
    migrateCreditToSealedPack: l.Func([l.Text], [l.Text], []),
    openSealedPack: l.Func([l.Nat], [openRes], []),
    registerOpenedCards: l.Func([l.Vec(l.Nat)], [l.Text], []),
  });
}

function foilIdl({ IDL: l }) {
  return l.Service({
    health: l.Func([], [l.Text], ["query"]),
    packsCollectionId: l.Func([], [l.Nat], ["query"]),
    cardsCollectionId: l.Func([], [l.Nat], ["query"]),
    tokensOfCollection: l.Func(
      [l.Principal, l.Nat],
      [l.Vec(l.Nat)],
      ["query"],
    ),
  });
}

function escrowIdl({ IDL: l }) {
  return l.Service({
    health: l.Func([], [l.Text], ["query"]),
    getStakesOpen: l.Func([], [l.Bool], ["query"]),
    getFeeE8s: l.Func([], [l.Nat], ["query"]),
  });
}

export async function createBladeGroveClient({
  identity,
  host = "https://icp-api.io",
} = {}) {
  const agent = await HttpAgent.create({ host, identity });
  const ownership = Actor.createActor(ownershipIdl, {
    agent,
    canisterId: BGA_OWNERSHIP,
  });
  const foil = Actor.createActor(foilIdl, {
    agent,
    canisterId: BGA_FOIL_LEDGER,
  });
  const escrow = Actor.createActor(escrowIdl, {
    agent,
    canisterId: BGA_ESCROW,
  });

  const me = identity?.getPrincipal?.() ?? null;

  return {
    principalText: me ? me.toText() : null,

    async onChainStatus() {
      const owner = me;
      if (!owner) throw new Error("Blade Grove client needs identity");
      const [bal, owned, playable, packsColl, sealed, stakesOpen, feeE8s] =
        await Promise.all([
          ownership.getPackBalance(owner),
          ownership.getOwnedCardIds(owner),
          ownership.getPlayableCardIds(owner),
          foil.packsCollectionId(),
          foil
            .packsCollectionId()
            .then((pc) => foil.tokensOfCollection(owner, pc)),
          escrow.getStakesOpen().catch(() => false),
          escrow.getFeeE8s().catch(() => 0n),
        ]);
      return {
        packCredits: {
          warden: Number(bal.warden),
          captain: Number(bal.captain),
          wardenHedera: Number(bal.wardenHedera),
          captainHedera: Number(bal.captainHedera),
        },
        ownedCardIds: owned.map(Number),
        playableCardIds: playable.map(Number),
        sealedPackTokenIds: sealed.map((t) => t.toString()),
        packsCollectionId: packsColl.toString(),
        stakesOpen: Boolean(stakesOpen),
        rankedFeeE8s: feeE8s.toString(),
      };
    },

    async openAllPacks() {
      if (!me) throw new Error("identity required");
      const opened = [];
      const notes = [];

      // Sealed NFT packs first
      const packsColl = await foil.packsCollectionId();
      const sealed = await foil.tokensOfCollection(me, packsColl);
      for (const tokenId of sealed) {
        const res = await ownership.openSealedPack(tokenId);
        if ("ok" in res) {
          opened.push({
            kind: "sealed",
            packTokenId: tokenId.toString(),
            skuId: res.ok.skuId,
            cardIds: res.ok.cardIds.map(Number),
          });
        } else {
          notes.push(`sealed ${tokenId}: ${res.err}`);
        }
      }

      // Credits → migrate then open if sealed appeared; else consume credit path
      const bal = await ownership.getPackBalance(me);
      for (const [sku, count] of [
        ["warden_pack", Number(bal.warden)],
        ["captain_pack", Number(bal.captain)],
      ]) {
        for (let i = 0; i < count; i++) {
          try {
            const migrated = await ownership.migrateCreditToSealedPack(sku);
            notes.push(`migrate ${sku}: ${migrated}`);
          } catch (err) {
            try {
              const consumed = await ownership.consumePackCredit(sku);
              notes.push(`consume ${sku}: ${consumed}`);
            } catch (err2) {
              notes.push(
                `${sku} open failed: ${err2 instanceof Error ? err2.message : String(err2)}`,
              );
            }
          }
        }
      }

      // Open any newly migrated sealed packs
      const sealed2 = await foil.tokensOfCollection(me, packsColl);
      for (const tokenId of sealed2) {
        if (opened.some((o) => o.packTokenId === tokenId.toString())) continue;
        const res = await ownership.openSealedPack(tokenId);
        if ("ok" in res) {
          opened.push({
            kind: "sealed",
            packTokenId: tokenId.toString(),
            skuId: res.ok.skuId,
            cardIds: res.ok.cardIds.map(Number),
          });
        } else {
          notes.push(`sealed ${tokenId}: ${res.err}`);
        }
      }

      const playable = (await ownership.getPlayableCardIds(me)).map(Number);
      return { opened, playableCardIds: playable, notes };
    },
  };
}
