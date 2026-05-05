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
  // Currently unused because no settlement method in the current backend has
  // an async suspension point — Motoko's single-threaded execution model
  // guarantees atomic execution of methods without awaits.
  //
  // PHASE 4: When ICRC-2 transferFrom awaits are added to placeOrder and
  // acceptOffer (and any other Phase 4 settlement paths), wire this state
  // through to the relevant mixin and wrap the async body with:
  //   CallerGuard.acquire(_callerGuards, caller) → try { ... } finally { release }
  //
  // See lib/caller-guard.mo for the API and AGENTS.md "Phase 4 wiring
  // requirements" for the full integration pattern.
  transient let _callerGuards : CallerGuard.GuardMap = CallerGuard.empty();

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
