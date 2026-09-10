// BonsaiOS / Canopy client for Captain Capsaicin.
//
// Canopy (https://7h6n6-eqaaa-aaaau-ag6da-cai.icp0.io) is the BonsaiOS wallet UI.
// For agents, the friend-confirmed path is a plain self-authenticating principal
// used for registry CRM, Orbit mint, and Bazaar trade — same principal across
// the ecosystem (see worker/src/lib/wallets.js role canopy_bonsai).

import { Actor, HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";

export const BONSAI_REGISTRY = "vxhwo-oiaaa-aaaau-aghdq-cai";
export const BONSAI_MARKET_REGISTRY = "jyi55-xqaaa-aaaau-agwlq-cai";
export const BONSAI_LAUNCHPAD = "i4fsp-oqaaa-aaaau-agwnq-cai";
export const BONSAI_TREASURY = "j7j3j-2iaaa-aaaau-agwla-cai";
export const BONSAI_NFT_LEDGER = "ivgzt-yyaaa-aaaau-agwma-cai";
export const BONSAI_BAZAAR_UI = "iabi6-zqaaa-aaaau-agwpq-cai";
export const BONSAI_CANOPY_UI = "7h6n6-eqaaa-aaaau-ag6da-cai";
export const ICP_LEDGER = "ryjl3-tyaaa-aaaaa-aaaba-cai";

/** Orbit Spots (SPOT Orbit) — collection 18, public phase 14 @ 0.05 ICP. */
export const ORBIT_SPOTS_COLLECTION_ID = 18n;
export const ORBIT_SPOTS_PHASE_ID = 14n;
export const ORBIT_SPOTS_MINT_E8S = 5_000_000n;

const ICP_FEE_FALLBACK = 10_000n;

function emptyOptText() {
  return [];
}

function socialLinksEmpty() {
  return {
    afluencer: emptyOptText(),
    benable: emptyOptText(),
    crumbeatr: emptyOptText(),
    discord: emptyOptText(),
    distrikt: emptyOptText(),
    dscvr: emptyOptText(),
    github: emptyOptText(),
    instagram: emptyOptText(),
    nuance: emptyOptText(),
    openChat: emptyOptText(),
    relationOne: emptyOptText(),
    taggr: emptyOptText(),
    telegram: emptyOptText(),
    theSwop: emptyOptText(),
    tiktok: emptyOptText(),
    trybe: emptyOptText(),
    twitter: emptyOptText(),
    website: emptyOptText(),
  };
}

function walletAddressesEmpty() {
  return {
    btc: emptyOptText(),
    eth: emptyOptText(),
    hbar: emptyOptText(),
    sol: emptyOptText(),
  };
}

function registryIdlFactory({ IDL: I }) {
  const SocialLinks = I.Record({
    afluencer: I.Opt(I.Text),
    benable: I.Opt(I.Text),
    crumbeatr: I.Opt(I.Text),
    discord: I.Opt(I.Text),
    distrikt: I.Opt(I.Text),
    dscvr: I.Opt(I.Text),
    github: I.Opt(I.Text),
    instagram: I.Opt(I.Text),
    nuance: I.Opt(I.Text),
    openChat: I.Opt(I.Text),
    relationOne: I.Opt(I.Text),
    taggr: I.Opt(I.Text),
    telegram: I.Opt(I.Text),
    theSwop: I.Opt(I.Text),
    tiktok: I.Opt(I.Text),
    trybe: I.Opt(I.Text),
    twitter: I.Opt(I.Text),
    website: I.Opt(I.Text),
  });
  const WalletAddresses = I.Record({
    btc: I.Opt(I.Text),
    eth: I.Opt(I.Text),
    hbar: I.Opt(I.Text),
    sol: I.Opt(I.Text),
  });
  const BookmarkFolder = I.Record({
    entryIds: I.Vec(I.Nat),
    id: I.Nat,
    name: I.Text,
  });
  const EntryRating = I.Record({ entryId: I.Nat, rating: I.Nat });
  const CatalogUrlRatingV1 = I.Record({ rating: I.Nat, url: I.Text });
  const NftChain = I.Variant({
    bitcoin: I.Null,
    ckbtc_ordinals: I.Null,
    evm: I.Null,
    hedera: I.Null,
    icp: I.Null,
    solana: I.Null,
  });
  const PinnedNft = I.Record({
    chain: NftChain,
    contractId: I.Text,
    imageUrl: I.Opt(I.Text),
    name: I.Text,
    tokenId: I.Text,
    walletAddress: I.Text,
  });
  const MusicScrobbleV1 = I.Record({
    artistName: I.Opt(I.Text),
    chain: I.Text,
    collectionName: I.Opt(I.Text),
    contractId: I.Text,
    coverUrl: I.Text,
    listenUrl: I.Opt(I.Text),
    name: I.Text,
    scrobbledAt: I.Int,
    tokenId: I.Text,
    trackKey: I.Text,
    walletAddress: I.Text,
  });
  const ExtendedUserProfile = I.Record({
    avatarBlobHash: I.Opt(I.Text),
    avatarUrl: I.Opt(I.Text),
    badges: I.Vec(I.Text),
    bannerBlobHash: I.Opt(I.Text),
    bannerUrl: I.Opt(I.Text),
    bio: I.Text,
    bioniqPrincipal: I.Opt(I.Text),
    bioniqWatchCanisters: I.Opt(I.Vec(I.Text)),
    bookmarkFolders: I.Vec(BookmarkFolder),
    bookmarks: I.Vec(I.Nat),
    catalogUrlRatings: I.Vec(CatalogUrlRatingV1),
    chestClaimsTotal: I.Opt(I.Nat),
    displayName: I.Text,
    icpWatchCanisters: I.Opt(I.Vec(I.Text)),
    joinedAt: I.Int,
    marketHoldings: I.Opt(I.Vec(I.Tuple(I.Nat, I.Nat))),
    marketHoldingsUpdatedAt: I.Opt(I.Nat64),
    oisyPrincipal: I.Opt(I.Text),
    openChatCommunities: I.Opt(I.Vec(I.Text)),
    openToLine: I.Text,
    pinnedCollectionBadges: I.Vec(I.Nat),
    pinnedNfts: I.Vec(PinnedNft),
    profileMediaOwnerCanister: I.Opt(I.Text),
    ratedEntries: I.Vec(EntryRating),
    recentMusicScrobbles: I.Vec(MusicScrobbleV1),
    socialLinks: SocialLinks,
    submittedEntries: I.Vec(I.Nat),
    username: I.Text,
    walletAddresses: WalletAddresses,
  });
  return I.Service({
    getCallerCrmStatus: I.Func(
      [],
      [
        I.Record({
          email: I.Opt(I.Text),
          hasEmail: I.Bool,
          hasII: I.Bool,
          hasName: I.Bool,
          hasOisy: I.Bool,
          hasProfile: I.Bool,
          score: I.Nat,
        }),
      ],
      ["query"],
    ),
    getCallerUserProfile: I.Func([], [I.Opt(ExtendedUserProfile)], ["query"]),
    getPublicUserProfile: I.Func(
      [I.Principal],
      [I.Opt(ExtendedUserProfile)],
      ["query"],
    ),
    saveCallerUserProfile: I.Func([ExtendedUserProfile], [], []),
    resolveRegistryUsername: I.Func([I.Text], [I.Opt(I.Principal)], ["query"]),
  });
}

function launchpadIdlFactory({ IDL: I }) {
  const MintErr = I.Variant({
    CapReached: I.Null,
    InsufficientPayment: I.Null,
    InvalidPayment: I.Null,
    MetadataNotReady: I.Null,
    NotAllowlisted: I.Null,
    NotFound: I.Null,
    NotLive: I.Null,
    Refunded: I.Null,
    SoldOut: I.Null,
  });
  const MintOk = I.Record({
    saleId: I.Nat,
    serial: I.Nat,
    tokenId: I.Nat,
  });
  const LaunchPhase = I.Record({
    collectionId: I.Nat,
    endTime: I.Nat64,
    id: I.Nat,
    kind: I.Variant({ Allowlist: I.Null, Public: I.Null }),
    mintedInPhase: I.Nat,
    perWalletCap: I.Nat,
    priceE8s: I.Nat,
    startTime: I.Nat64,
  });
  return I.Service({
    listPhasesForCollection: I.Func(
      [I.Nat],
      [I.Vec(LaunchPhase)],
      ["query"],
    ),
    getPhase: I.Func([I.Nat], [I.Opt(LaunchPhase)], ["query"]),
    mint: I.Func(
      [I.Nat, I.Nat, I.Opt(I.Principal)],
      [I.Variant({ Ok: MintOk, Err: MintErr })],
      [],
    ),
  });
}

function icpLedgerIdlFactory({ IDL: I }) {
  const Account = I.Record({
    owner: I.Principal,
    subaccount: I.Opt(I.Vec(I.Nat8)),
  });
  const TransferArg = I.Record({
    to: Account,
    fee: I.Opt(I.Nat),
    memo: I.Opt(I.Vec(I.Nat8)),
    from_subaccount: I.Opt(I.Vec(I.Nat8)),
    created_at_time: I.Opt(I.Nat64),
    amount: I.Nat,
  });
  return I.Service({
    icrc1_balance_of: I.Func([Account], [I.Nat], ["query"]),
    icrc1_fee: I.Func([], [I.Nat], ["query"]),
    icrc1_transfer: I.Func(
      [TransferArg],
      [I.Variant({ Ok: I.Nat, Err: I.Unknown })],
      [],
    ),
  });
}

function nftLedgerIdlFactory({ IDL: I }) {
  const Account = I.Record({
    owner: I.Principal,
    subaccount: I.Opt(I.Vec(I.Nat8)),
  });
  const TransferArg = I.Record({
    to: Account,
    token_id: I.Nat,
    from_subaccount: I.Opt(I.Vec(I.Nat8)),
  });
  const TransferError = I.Variant({
    Unauthorized: I.Null,
    NonExistingTokenId: I.Null,
  });
  return I.Service({
    balance_of_collection: I.Func([Account, I.Nat], [I.Nat], ["query"]),
    icrc7_tokens_of: I.Func(
      [Account, I.Opt(I.Nat), I.Opt(I.Nat)],
      [I.Vec(I.Nat)],
      ["query"],
    ),
    icrc7_transfer: I.Func(
      [I.Vec(TransferArg)],
      [I.Vec(I.Opt(I.Variant({ Ok: I.Nat, Err: TransferError })))],
      [],
    ),
  });
}

/**
 * @param {{ identity: import("@dfinity/identity").Identity, host?: string }} opts
 */
export async function createBonsaiClient({ identity, host = "https://icp-api.io" }) {
  const agent = await HttpAgent.create({ identity, host });
  const me = identity.getPrincipal();

  const registry = Actor.createActor(registryIdlFactory, {
    agent,
    canisterId: BONSAI_REGISTRY,
  });
  const launchpad = Actor.createActor(launchpadIdlFactory, {
    agent,
    canisterId: BONSAI_LAUNCHPAD,
  });
  const icp = Actor.createActor(icpLedgerIdlFactory, {
    agent,
    canisterId: ICP_LEDGER,
  });
  const nftLedger = Actor.createActor(nftLedgerIdlFactory, {
    agent,
    canisterId: BONSAI_NFT_LEDGER,
  });

  const account = { owner: me, subaccount: [] };

  return {
    principal: me,
    registry,
    launchpad,
    icp,
    nftLedger,

    getCrmStatus: () => registry.getCallerCrmStatus(),
    getProfile: () => registry.getCallerUserProfile(),

    /**
     * Minimal registry CRM profile for Captain Capsaicin.
     * Links Crumbeatr + SWOP handles when known.
     */
    async saveCaptainProfile(overrides = {}) {
      const existing = await registry.getCallerUserProfile();
      const prev = existing?.[0];
      const nowNs = BigInt(Date.now()) * 1_000_000n;
      const social = {
        ...socialLinksEmpty(),
        ...(prev?.socialLinks ?? {}),
        crumbeatr: ["CaptainCapsaicin"],
        theSwop: ["CaptainCapsaicin"],
        website: ["https://icspicy.app"],
        ...(overrides.socialLinks ?? {}),
      };
      const profile = {
        avatarBlobHash: prev?.avatarBlobHash ?? [],
        avatarUrl: prev?.avatarUrl ?? [],
        badges: prev?.badges ?? [],
        bannerBlobHash: prev?.bannerBlobHash ?? [],
        bannerUrl: prev?.bannerUrl ?? [],
        bio:
          overrides.bio ??
          prev?.bio ??
          "Captain Capsaicin — IC SPICY ambassador. Regenerative peppers on the Internet Computer.",
        bioniqPrincipal: prev?.bioniqPrincipal ?? [],
        bioniqWatchCanisters: prev?.bioniqWatchCanisters ?? [],
        bookmarkFolders: prev?.bookmarkFolders ?? [],
        bookmarks: prev?.bookmarks ?? [],
        catalogUrlRatings: prev?.catalogUrlRatings ?? [],
        chestClaimsTotal: prev?.chestClaimsTotal ?? [],
        displayName: overrides.displayName ?? prev?.displayName ?? "Captain Capsaicin",
        icpWatchCanisters: prev?.icpWatchCanisters ?? [],
        joinedAt: prev?.joinedAt ?? nowNs,
        marketHoldings: prev?.marketHoldings ?? [],
        marketHoldingsUpdatedAt: prev?.marketHoldingsUpdatedAt ?? [],
        oisyPrincipal: prev?.oisyPrincipal ?? [],
        openChatCommunities: prev?.openChatCommunities ?? [],
        openToLine:
          overrides.openToLine ??
          prev?.openToLine ??
          "Always down to talk peppers, soil, and on-chain provenance.",
        pinnedCollectionBadges: prev?.pinnedCollectionBadges ?? [],
        pinnedNfts: prev?.pinnedNfts ?? [],
        profileMediaOwnerCanister: prev?.profileMediaOwnerCanister ?? [],
        ratedEntries: prev?.ratedEntries ?? [],
        recentMusicScrobbles: prev?.recentMusicScrobbles ?? [],
        socialLinks: social,
        submittedEntries: prev?.submittedEntries ?? [],
        username: overrides.username ?? prev?.username ?? "CaptainCapsaicin",
        walletAddresses: prev?.walletAddresses ?? walletAddressesEmpty(),
      };
      await registry.saveCallerUserProfile(profile);
      return registry.getCallerCrmStatus();
    },

    async icpBalance() {
      return icp.icrc1_balance_of(account);
    },

    async payTreasury(amountE8s) {
      let fee = ICP_FEE_FALLBACK;
      try {
        fee = await icp.icrc1_fee();
      } catch {
        /* use fallback */
      }
      const res = await icp.icrc1_transfer({
        to: {
          owner: Principal.fromText(BONSAI_TREASURY),
          subaccount: [],
        },
        fee: [fee],
        memo: [],
        from_subaccount: [],
        created_at_time: [BigInt(Date.now()) * 1_000_000n],
        amount: amountE8s,
      });
      if ("Err" in res) {
        throw new Error(`ICP → Bonsai treasury failed: ${JSON.stringify(res.Err)}`);
      }
      return res.Ok;
    },

    /**
     * Primary mint Orbit Spots (or any phase): pay treasury then mint.
     * Hard-caps quantity at `maxQty` and unit price at `maxUnitE8s`.
     */
    async mintPhase({
      phaseId = ORBIT_SPOTS_PHASE_ID,
      quantity = 1n,
      maxQty = 1n,
      maxUnitE8s = ORBIT_SPOTS_MINT_E8S,
      to = null,
    } = {}) {
      if (quantity < 1n || quantity > maxQty) {
        throw new Error(`quantity ${quantity} outside limit 1..${maxQty}`);
      }
      const phaseOpt = await launchpad.getPhase(phaseId);
      const phase = phaseOpt?.[0];
      if (!phase) throw new Error(`phase ${phaseId} not found`);
      if (phase.priceE8s > maxUnitE8s) {
        throw new Error(
          `mint price ${phase.priceE8s} e8s exceeds cap ${maxUnitE8s}`,
        );
      }
      const total = phase.priceE8s * quantity;
      const block = await this.payTreasury(total);
      const toArg = to ? [Principal.fromText(to.toString())] : [];
      // Single mint API for qty 1; batch not used at qty 1.
      const result = await launchpad.mint(phaseId, block, toArg);
      if ("Err" in result) {
        throw new Error(`mint failed: ${JSON.stringify(result.Err)} (paid block ${block})`);
      }
      return { blockIndex: block, ...result.Ok, priceE8s: phase.priceE8s };
    },

    async orbitBalance() {
      return nftLedger.balance_of_collection(account, ORBIT_SPOTS_COLLECTION_ID);
    },

    async transferNft(tokenId, toPrincipalText) {
      const to = Principal.fromText(toPrincipalText);
      const results = await nftLedger.icrc7_transfer([
        {
          to: { owner: to, subaccount: [] },
          token_id: BigInt(tokenId),
          from_subaccount: [],
        },
      ]);
      const first = results?.[0];
      const inner = first?.[0];
      if (!inner) throw new Error("icrc7_transfer returned empty");
      if ("Err" in inner) {
        throw new Error(`icrc7_transfer: ${JSON.stringify(inner.Err)}`);
      }
      return inner.Ok;
    },
  };
}
