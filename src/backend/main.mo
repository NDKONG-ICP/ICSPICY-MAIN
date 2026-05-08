import Map "mo:core/Map";
import List "mo:core/List";
import Set "mo:core/Set";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import AccessControl "lib/access-control";
import CallerGuard "lib/caller-guard";
import Common "types/common";
import PlantTypes "types/plants";
import MarketTypes "types/marketplace";
import DAOTypes "types/dao";
import CommunityTypes "types/community";
import MembershipTypes "types/membership";
import WalletTypes "types/wallet";
import RecipeTypes "types/recipes";
import ClaimTypes "types/claim";
import ArtworkUploadTypes "types/artwork-upload";
import RecipesLib "lib/recipes";
import ICRC7 "types/icrc7";
import ICRC7API "mixins/icrc7-api";
import PlantsAPI "mixins/plants-api";
import MarketplaceAPI "mixins/marketplace-api";
import DAOAPI "mixins/dao-api";
import CommunityAPI "mixins/community-api";
import MembershipAPI "mixins/membership-api";
import NFTAPI "mixins/nft-api";
import WalletAPI "mixins/wallet-api";
import RecipesAPI "mixins/recipes-api";
import ClaimAPI "mixins/claim-api";
import ScheduleAPI "mixins/schedule-api";
import LifecycleUpgradeAPI "mixins/lifecycle-upgrade-api";
import BatchGiftAndResaleAPI "mixins/batch-gift-and-resale-api";
import BatchTypes "types/batch-gift-and-resale";
import OfferTypes "types/offers";
import TreasuryTypes "types/treasury";
import PriceOracleTypes "types/price-oracle";
import OffersAPI "mixins/offers-api";
import TreasuryAPI "mixins/treasury-api";
import PriceOracleAPI "mixins/price-oracle-api";
import DABAPI "mixins/dab-api";
import ArtworkUploadAPI "mixins/artwork-upload-api";
import PoolAPI "mixins/pool-api";
import PoolLib "lib/pool";
import PoolTypes "types/pool";

shared(msg) persistent actor class ICSpicy() = Self {
  transient let initialDeployer = msg.caller;

  // Admin set — initialized with deployer at first deploy; persists across upgrades.
  let accessControlState : AccessControl.AccessControlState = AccessControl.initState(initialDeployer);

  // Reentrancy lock state for settlement methods.
  //
  // Phase 3.1 renamed `_callerGuards` → `callerGuards` (step 1 of the Phase 4
  // wiring sequence in AGENTS.md). The lock is consumed by the ICRC-7 mixin
  // from Phase 3.3 onwards (icrc7_transfer / icrc37_transfer_from), and by
  // Phase 4 payment-settlement methods (placeOrder, acceptOffer,
  // confirmStripePayment, etc.).
  //
  // Usage pattern (per AGENTS.md "Code patterns to follow"):
  //   CallerGuard.acquire(callerGuards, caller) → try { ... } finally { release }
  //
  // See lib/caller-guard.mo for the API.
  transient let callerGuards : CallerGuard.GuardMap = CallerGuard.empty();

  // ── Admin management ───────────────────────────────────────────────────────

  public shared ({ caller }) func addAdmin(p : Principal) : async () {
    AccessControl.addAdmin(accessControlState, caller, p);
  };

  public shared ({ caller }) func removeAdmin(p : Principal) : async () {
    AccessControl.removeAdmin(accessControlState, caller, p);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller)
  };

  // Public query — admin set is auditable by anyone.
  public query func getAdmins() : async [Principal] {
    AccessControl.listAdmins(accessControlState)
  };

  // ── Deprecated Caffeine auth shims — frontend compat until Phase 1.5 ───────

  // no-op; deployer is captured via msg.caller at actor construction.
  public query func _initializeAccessControl() : async () {};

  // Computed from admin set — no longer stored per-user.
  public query({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller)
  };

  // Incompatible with flat admin model; traps to surface dead call sites during testing.
  public shared({ caller = _ }) func assignCallerUserRole(_user : Principal, _role : AccessControl.UserRole) : async () {
    Runtime.trap("assignCallerUserRole is deprecated — use addAdmin/removeAdmin instead");
  };

  // ── Canister identity ──────────────────────────────────────────────────────

  public query func getCanisterId() : async Text {
    Principal.fromActor(Self).toText()
  };

  // ── Counter wrappers (shared mutable references) ───────────────────────────

  let nextPlantId          = { var value : Nat = 1 };
  let nextTrayId           = { var value : Nat = 1 };
  let nextFeedingId        = { var value : Nat = 1 };
  let nextProductId        = { var value : Nat = 1 };
  let nextOrderId          = { var value : Nat = 1 };
  let nextProposalId       = { var value : Nat = 1 };
  let nextPostId           = { var value : Nat = 1 };
  let nextCommentId        = { var value : Nat = 1 };
  let nextMembershipId     = { var value : Nat = 1 };
  let nextWeatherRecordId  = { var value : Nat = 1 };
  let nextArtworkLayerId   = { var value : Nat = 1 };

  // ── Plant lifecycle state ──────────────────────────────────────────────────

  let plants        = Map.empty<Common.PlantId, PlantTypes.Plant>();
  let trays         = Map.empty<Common.TrayId, PlantTypes.Tray>();
  let trayOwners    = Map.empty<Common.TrayId, Principal>();
  let feedings      = Map.empty<Common.FeedingId, PlantTypes.Feeding>();
  let stageHistory  = Map.empty<Common.PlantId, List.List<PlantTypes.StageHistory>>();

  // NIMS: weather records — indexed by id, deduplicated by (principal, date) key
  let weatherRecords = Map.empty<Common.WeatherRecordId, PlantTypes.WeatherRecord>();
  let weatherIndex   = Map.empty<Text, Common.WeatherRecordId>();

  // NIMS: artwork layers for RWA NFT compositing
  let artworkLayers  = Map.empty<Common.ArtworkLayerId, PlantTypes.ArtworkLayer>();

  // RWA Provenance NFT tokens (ICRC-37 with full lifecycle metadata)
  let rwaTokens      = Map.empty<Text, PlantTypes.RWATokenMetadata>();

  // ── ICRC-7 NFT collection state (8888 tokens) ──────────────────────────────
  //
  // Source of truth for token ownership. icrc7Owners maps token_id → owning
  // Account; icrc7Balances is a denormalized owner-principal → set-of-token-ids
  // index for O(k) icrc7_balance_of / icrc7_tokens_of lookups.
  //
  // ATOMIC INVARIANT (per PROJECT_CONTEXT.md "ICRC-7 implementation rules"):
  // both maps are mutated only through lib/icrc7.mo's assignOwnership helper
  // (added in Phase 3.2). Direct writes from other call sites are forbidden.
  //
  // Both are persistent (`let` defaults to stable in a persistent actor) so
  // ownership survives upgrades.
  let icrc7Owners           : Map.Map<Nat, ICRC7.Account>      = Map.empty<Nat, ICRC7.Account>();
  let icrc7Balances         : Map.Map<Principal, Set.Set<Nat>> = Map.empty<Principal, Set.Set<Nat>>();
  // Static metadata: token_id → raw JSON bytes from the templated mainnet
  // metadata files. Bulk-loaded by admin via loadStaticMetadata (Phase 3.2);
  // parsed lazily by icrc7_token_metadata at query time. Storage as raw
  // bytes is the byte-deterministic foundation for the certified envelope
  // in Phase 3.6 (no re-serialization round-trip needed).
  let icrc7TokenMetadataRaw : Map.Map<Nat, Blob>               = Map.empty<Nat, Blob>();

  // Phase 3.3: ICRC-7 transfer transaction state.
  //
  // `nextBlockIndex` is the monotonic counter for transaction block IDs
  // returned by icrc7_transfer. PERSISTENT: block IDs must never repeat
  // across upgrades or the ICRC-3 transaction log invariant breaks (Phase
  // 3.6 / 4 will populate the actual log; the counter alone reserves the
  // ID space today).
  //
  // recentTxLookup / recentTxByOrder / recentTxCursor implement a bounded
  // FIFO dedup buffer (capacity = IcrcLib.RECENT_TX_CAP). All three are
  // TRANSIENT: the dedup window is bounded by tx_window (24h) and an
  // upgrade is typically much faster than that, so dropping in-flight
  // dedup state at upgrade is acceptable for Phase 3. Phase 4 replaces
  // this with windowed eviction over the proper ICRC-3 transaction log.
  let nextBlockIndex = { var value : Nat = 0 };
  transient let recentTxLookup  : Map.Map<Blob, Nat> = Map.empty<Blob, Nat>();
  transient let recentTxByOrder : Map.Map<Nat, Blob> = Map.empty<Nat, Blob>();
  transient let recentTxCursor  : { var oldest : Nat; var next : Nat } = {
    var oldest = 0;
    var next   = 0;
  };

  // Collection-level configuration constants. `transient` because they are
  // compile-time literals — no migration story needed across upgrades.
  transient let collectionName : Text = "IC SPICY";
  transient let totalSupplyCap : Nat  = 8888;

  // ── Marketplace state ──────────────────────────────────────────────────────

  let products = Map.empty<Common.ProductId, MarketTypes.Product>();
  let orders   = Map.empty<Common.OrderId, MarketTypes.Order>();

  // ── DAO state ──────────────────────────────────────────────────────────────

  let proposals = Map.empty<Common.ProposalId, DAOTypes.Proposal>();

  // ── Community state ────────────────────────────────────────────────────────

  let posts    = Map.empty<Common.PostId, CommunityTypes.Post>();
  let comments = Map.empty<Common.CommentId, CommunityTypes.Comment>();
  let profiles = Map.empty<Principal, CommunityTypes.UserProfile>();

  // ── Membership state ───────────────────────────────────────────────────────

  let memberships = Map.empty<Principal, MembershipTypes.MembershipNFT>();

  // ── Wallet state ───────────────────────────────────────────────────────────

  let wallets = Map.empty<Principal, WalletTypes.WalletState>();
  let txLog   = List.empty<WalletTypes.WalletTransaction>();

  // ── Recipes (CookBook) state ───────────────────────────────────────────────

  let recipes      = Map.empty<Common.RecipeId, RecipeTypes.Recipe>();
  let nextRecipeId = { var value : Nat = 1 };

  // ── Claim token state (QR label → NFT claim flow) ─────────────────────────

  let claimTokens = Map.empty<Common.ClaimTokenId, ClaimTypes.ClaimToken>();

  // ── Schedule state (KNF application schedule builder) ─────────────────────

  let savedSchedules      = Map.empty<Common.ScheduleId, ClaimTypes.SavedSchedule>();
  let scheduleShareIndex  = Map.empty<Text, Common.ScheduleId>();

  // ── Lifecycle upgrade event log (plant NFT burn-and-mint history) ──────────

  let upgradeEvents = Map.empty<Common.PlantId, List.List<ClaimTypes.LifecycleUpgradeEvent>>();

  // ── Claim-based membership tokens ─────────────────────────────────────────

  let claimMemberships = Map.empty<Principal, PlantTypes.RWATokenMetadata>();

  // ── Batch gift packs ───────────────────────────────────────────────────────

  let batchGiftPacks  = Map.empty<Text, BatchTypes.BatchGiftPack>();
  let resaleListings  = Map.empty<Text, BatchTypes.ResaleListing>();

  // ── Offers state (p2p offer / counter-offer negotiation) ───────────────────

  let offers       = Map.empty<Text, OfferTypes.Offer>();
  let nextOfferId  = { var value : Nat = 1 };

  // ── Treasury state ─────────────────────────────────────────────────────────

  let treasuryState : TreasuryTypes.TreasuryState = {
    var icpBalance    = 0;
    var ckbtcBalance  = 0;
    var ckethBalance  = 0;
    var ckusdcBalance = 0;
    var ckusdtBalance = 0;
  };
  let treasuryTxLog      = List.empty<TreasuryTypes.TreasuryTransaction>();
  let nextTreasuryTxId   = { var value : Nat = 1 };

  // ── Price oracle state ─────────────────────────────────────────────────────

  let priceOracleState : PriceOracleTypes.PriceOracleState = {
    var prices            = [];
    var last_full_refresh = 0;
  };

  // ── Artwork upload & Pool NFT state ────────────────────────────────────────

  let storedFiles  = Map.empty<Text, ArtworkUploadTypes.StoredFile>();
  let poolNFTs     = Map.empty<Nat, ArtworkUploadTypes.PoolNFT>();

  let nftPool           : PoolLib.PoolMap = Map.empty<Nat, PoolTypes.PoolNFTRecord>();
  let nextPoolProductId = { var value : Nat = 1 };

  // Upload session — flat buffer avoids [[Nat8]] heap accumulation on large zips.
  let artworkUploadSession : ArtworkUploadTypes.UploadSession = {
    var buffer       = [var];
    var chunk_size   = 0;
    var total_chunks = 0;
    var received     = 0;
    started_at       = 0;
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  // Safe to call inside methods; never called at actor body level (avoids
  // 'blob_of_principal: invalid principal' trap before canister ID is assigned).
  func selfPrincipalText() : Text {
    Principal.fromActor(Self).toText()
  };

  // Ensures the calling admin has a community profile; creates one if missing.
  // Idempotent — safe to call multiple times.
  public shared ({ caller }) func ensureAdminProfile() : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) return;
    switch (profiles.get(caller)) {
      case (?_) {};
      case null {
        profiles.add(caller, {
          principal_id = caller;
          var username = "Admin";
          var bio = "";
          var avatar_key : ?Text = null;
          var follows = Set.empty<Principal>();
          created_at = 0;
        });
      };
    };
  };

  // ── Initialization ─────────────────────────────────────────────────────────

  // Seed default KNF recipes on first install (idempotent — skipped if already populated).
  RecipesLib.seedRecipes(recipes, nextRecipeId);

  // ── Mixins ─────────────────────────────────────────────────────────────────

  include PlantsAPI(accessControlState, plants, trays, trayOwners, feedings, stageHistory, weatherRecords, weatherIndex, artworkLayers, rwaTokens, nextPlantId, nextTrayId, nextFeedingId, nextWeatherRecordId, nextArtworkLayerId);
  include MarketplaceAPI(accessControlState, products, orders, plants, memberships, claimTokens, nextProductId, nextOrderId);
  include DAOAPI(accessControlState, proposals, plants, memberships, nextProposalId);
  include CommunityAPI(accessControlState, posts, comments, profiles, nextPostId, nextCommentId);
  include MembershipAPI(accessControlState, memberships, nextMembershipId);
  include NFTAPI(plants);
  include ICRC7API(
    accessControlState,
    callerGuards,
    icrc7Owners,
    icrc7Balances,
    icrc7TokenMetadataRaw,
    func() : Principal { Principal.fromActor(Self) },
    collectionName,
    totalSupplyCap,
    nextBlockIndex,
    recentTxLookup,
    recentTxByOrder,
    recentTxCursor,
  );
  include WalletAPI(wallets, txLog);
  include RecipesAPI(accessControlState, recipes, nextRecipeId);
  include ClaimAPI(accessControlState, claimTokens, plants, rwaTokens, claimMemberships);
  include ScheduleAPI(accessControlState, savedSchedules, scheduleShareIndex);
  include LifecycleUpgradeAPI(accessControlState, plants, stageHistory, rwaTokens, upgradeEvents, artworkLayers);
  include BatchGiftAndResaleAPI(accessControlState, batchGiftPacks, resaleListings, claimTokens, plants, rwaTokens, claimMemberships);
  include OffersAPI(accessControlState, offers, treasuryState, treasuryTxLog, priceOracleState, nextOfferId, nextTreasuryTxId);
  include TreasuryAPI(accessControlState, treasuryState, treasuryTxLog, nextTreasuryTxId);
  include PriceOracleAPI(accessControlState, priceOracleState);
  include DABAPI(accessControlState);
  include ArtworkUploadAPI(accessControlState, artworkUploadSession, storedFiles, poolNFTs, selfPrincipalText);
  include PoolAPI(accessControlState, nftPool, nextPoolProductId);

  // ── Ingress filter ─────────────────────────────────────────────────────────

  // Block anonymous callers at ingress before consensus — no cycles burned on rejection.
  // All update calls from anonymous principals are rejected. Query calls (including
  // _initializeAccessControl, which is now a query) bypass this filter entirely.
  system func inspect({
    caller : Principal;
    arg    : Blob;
  }) : Bool {
    ignore arg;
    not caller.isAnonymous()
  };
};
