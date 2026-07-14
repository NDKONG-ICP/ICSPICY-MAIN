import Map "mo:core/Map";
import List "mo:core/List";
import Set "mo:core/Set";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Array "mo:core/Array";
import AccessControl "lib/access-control";
import CallerGuard "lib/caller-guard";
import Common "types/common";
import PlantTypes "types/plants";
import MarketTypes "types/marketplace";
import DAOTypes "types/dao";
import DAOLegacy "types/dao-legacy";
import CommunityTypes "types/community";
import NotificationTypes "types/notification";
import MembershipTypes "types/membership";
import RecipeTypes "types/recipes";
import ClaimTypes "types/claim";
import ArtworkUploadTypes "types/artwork-upload";
import WalletTypes "types/wallet";
import RecipesLib "lib/recipes";
import Cert "lib/cert";
import ICRC7 "types/icrc7";
import ICRC37 "types/icrc37";
import ICRC7API "mixins/icrc7-api";
import PlantsAPI "mixins/plants-api";
import MarketplaceAPI "mixins/marketplace-api";
import DAOAPI "mixins/dao-api";
import CommunityAPI "mixins/community-api";
import ProfilePageAPI "mixins/profile-page-api";
import NotificationsAPI "mixins/notifications-api";
import MembershipAPI "mixins/membership-api";
import NFTAPI "mixins/nft-api";
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
import CommunityVideoAPI "mixins/community-video-api";
import VideoUploadTypes "types/video-upload";
import PoolAPI "mixins/pool-api";
import PoolLib "lib/pool";
import PoolTypes "types/pool";
import AuditLog   "lib/audit-log";
import ProductShipping "lib/product-shipping";
import PaymentAPI "mixins/payment-api";
import AdminShopAPI "mixins/admin-shop-api";
import VarietyAPI "mixins/variety-api";
import VarietyGuideAPI "mixins/variety-guide-api";
import VarietyProvenanceAPI "mixins/variety-provenance-api";
import VarietyTypes "types/variety";
import VarietyGuideTypes "types/variety-guide";
import ProvenanceTypes "types/variety-provenance";
import SeedBankTypes "types/seed-bank";
import NimsAPI "mixins/nims-api";
import CoopAPI "mixins/coop-api";
import PlantingScheduleTypes "types/planting-schedule";
import SeedBankAPI "mixins/seed-bank-api";
import PlantingScheduleAPI "mixins/planting-schedule-api";
import NftResaleAPI "mixins/nft-resale-api";
import ResaleTypes "types/nft-resale";
import GardenTypes "types/garden";
import CoopTypes "types/coop";
import GardenAPI "mixins/garden-api";
import GamesAPI "mixins/games-api";
import GamesLib "lib/games";
import SlicerTelemetry "lib/slicer-telemetry";
import CrafterAPI "mixins/crafter-api";
import PepperPatchAPI "mixins/pepper-patch-api";
import IngredientInventoryAPI "mixins/ingredient-inventory-api";
import AchievementsAPI "mixins/achievements-api";
import MasterclassAPI "mixins/masterclass-api";
import GamesTypes "types/games";
import GameSessionsTypes "types/game-sessions";
import AchievementTypes "types/achievements";
import MasterclassTypes "types/masterclass";
import CrafterRecipesTypes "types/crafter-recipes";
import GardenStateTypes "types/garden-state";
import IngredientInventoryTypes "types/ingredient-inventory";
import RateLimits "lib/rate-limits";
import CanisterHealth "lib/canister-health";
import Timer "mo:core/Timer";
import Prim "mo:⛔";
import UsageAnalytics "UsageAnalytics";
import Iter "mo:base/Iter";

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
  // confirmICPayPayment, etc.).
  //
  // Usage pattern (per AGENTS.md "Code patterns to follow"):
  //   CallerGuard.acquire(callerGuards, caller) → try { ... } finally { release }
  //
  // See lib/caller-guard.mo for the API.
  transient let callerGuards : CallerGuard.GuardMap = CallerGuard.empty();

  /// Per-principal rate limiters for cycle-drain protection (CDA).
  transient let rateLimits : RateLimits.Bundle = RateLimits.init();

  // In-flight chunked video uploads (community posts). Transient — sessions
  // are ephemeral buffers and do not survive upgrades.
  transient let videoUploadSessions = Map.empty<Nat, VideoUploadTypes.VideoUploadSession>();
  transient let nextVideoUploadId = { var value : Nat = 0 };

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

  /// Uploads asset canister — user images served via HTTP from this canister.
  stable var uploadsCanisterIdStable : ?Text = null;

  func uploadsCanisterPrincipal() : ?Principal {
    switch (uploadsCanisterIdStable) {
      case null null;
      case (?id) ?Principal.fromText(id);
    };
  };

  public shared ({ caller }) func setUploadsCanisterId(canisterId : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    uploadsCanisterIdStable := ?canisterId;
  };

  public query func getUploadsCanisterId() : async ?Text {
    uploadsCanisterIdStable;
  };

  // ── ICRC-10 / ICRC-28 (wallet signer + IdentityKit trusted origins) ────────

  /// ICRC-10: supported standards declaration (includes ICRC-28 for trusted origins).
  public query func icrc10_supported_standards() : async [{ url : Text; name : Text }] {
    [
      {
        url = "https://github.com/dfinity/ICRC/blob/main/ICRCs/ICRC-10/ICRC-10.md";
        name = "ICRC-10";
      },
      {
        url = "https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_28_trusted_origins.md";
        name = "ICRC-28";
      },
      {
        url = "https://github.com/dfinity/ICRC/blob/main/ICRCs/ICRC-7/ICRC-7.md";
        name = "ICRC-7";
      },
      {
        url = "https://github.com/dfinity/ICRC/blob/main/ICRCs/ICRC-37/ICRC-37.md";
        name = "ICRC-37";
      },
    ];
  };

  /// ICRC-28: HTTPS origins allowed for wallet signer delegation flows (IdentityKit / OISY).
  public query func icrc28_trusted_origins() : async { trusted_origins : [Text] } {
    {
      trusted_origins = [
        "https://7rukv-hqaaa-aaaao-ba6ma-cai.icp0.io",
        "https://7rukv-hqaaa-aaaao-ba6ma-cai.raw.icp0.io",
        "https://icspicy.app",
        "https://ic-spicy.com",
        "https://www.ic-spicy.com",
      ];
    };
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

  // ── Phase 6 NIMS: variety catalog + lifecycle side maps ────────────────────
  //
  // Extended plant data lives in side maps to preserve stable-memory
  // compatibility with the existing Plant record shape.

  let varieties                 = Map.empty<Nat, VarietyTypes.Variety>();
  let nextVarietyId             = { var value : Nat = 1 };
  // AI-generated growing guides, keyed "varietyId:zoneKey"
  let varietyGuides             = Map.empty<Text, VarietyGuideTypes.VarietyGuide>();
  let varietyProvenance         = Map.empty<Nat, ProvenanceTypes.VarietyProvenance>();
  let varietyIntros             = Map.empty<Nat, Text>();
  let plantVarietyIds           = Map.empty<Common.PlantId, Nat>();
  let plantOwners               = Map.empty<Common.PlantId, Principal>();
  let plantPrices               = Map.empty<Common.PlantId, Nat>();
  let plantSoldAt               = Map.empty<Common.PlantId, Common.Timestamp>();
  let plantTransplantedOneGal   = Map.empty<Common.PlantId, Common.Timestamp>();
  let plantTransplantedFiveGal  = Map.empty<Common.PlantId, Common.Timestamp>();
  let plantNotesLog             = Map.empty<Common.PlantId, List.List<PlantTypes.PlantNote>>();
  let plantWateringLog          = Map.empty<Common.PlantId, List.List<PlantTypes.WateringEntry>>();
  let plantPestLog              = Map.empty<Common.PlantId, List.List<PlantTypes.PestEntry>>();
  let plantPhotoLog             = Map.empty<Common.PlantId, List.List<PlantTypes.PlantPhotoEntry>>();
  let plantWeatherSnapshots     = Map.empty<Common.PlantId, List.List<PlantTypes.WeatherSnapshot>>();

  // Seed Bank — per-user seed lots, breeding crosses, vendors
  let seedLots          = Map.empty<Nat, SeedBankTypes.SeedLot>();
  let breedingCrosses   = Map.empty<Nat, SeedBankTypes.BreedingCross>();
  let seedVendors       = Map.empty<Nat, SeedBankTypes.SeedVendor>();
  let nextSeedLotId     = { var value : Nat = 1 };
  let nextBreedingCrossId = { var value : Nat = 1 };
  let nextSeedVendorId  = { var value : Nat = 1 };

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

  // Phase 3.6: certified-data Merkle tree for ICRC-7 token metadata.
  //
  // Per-token leaves under the "icrc7" prefix (see lib/cert.mo for the
  // path scheme). Tree state is PERSISTENT — the structure survives
  // upgrades — but the IC subnet's certified-data SLOT resets on upgrade
  // and must be re-set in postupgrade (see system func below).
  //
  // SOLE-entry-point invariant: the tree is mutated only via lib/cert.mo's
  // putTokenMetadata, called from loadStaticMetadata. Ownership / approval
  // state is intentionally NOT in the tree (Phase 3.2 Q4 decision: certify
  // static metadata only; dynamic provenance — owner, approvals — stays
  // uncertified for now). Therefore icrc7_transfer / transfer_from /
  // initializeNFTPool do NOT update this tree.
  let certStore : Cert.Store = Cert.newStore();

  // Phase 3.4: ICRC-37 approval state.
  //
  // Nested map: tokenId → (spender principal → ApprovalInfo). Inner map is
  // keyed by spender PRINCIPAL only, not full Account — see lib/icrc37.mo
  // module comment for the rationale (Phase 3 simplification, locked in
  // PROJECT_CONTEXT.md "ICRC-37 implementation rules" Q1).
  //
  // PERSISTENT: approvals must survive upgrades. They expire only on
  // explicit revocation, on token transfer (which clears them), or on
  // their expires_at timestamp. Lib/icrc37.mo's mutation helpers are the
  // SOLE entry points for writes — no direct map access from the mixin.
  let icrc37Approvals : Map.Map<Nat, Map.Map<Principal, ICRC37.ApprovalInfo>> =
    Map.empty<Nat, Map.Map<Principal, ICRC37.ApprovalInfo>>();

  // Collection-level configuration constants. `transient` because they are
  // compile-time literals — no migration story needed across upgrades.
  transient let collectionName : Text = "IC SPICY";
  transient let totalSupplyCap : Nat  = 8888;

  // ── Marketplace state ──────────────────────────────────────────────────────

  let products = Map.empty<Common.ProductId, MarketTypes.Product>();
  let orders   = Map.empty<Common.OrderId, MarketTypes.Order>();

  // ── DAO state ──────────────────────────────────────────────────────────────

  // Ghost — stable compat: empty legacy map matches mainnet stable type.
  stable var proposals = Map.empty<Common.ProposalId, DAOLegacy.Proposal>();

  stable var daoProposals = Map.empty<Common.ProposalId, DAOTypes.Proposal>();
  stable var daoVotes = Map.empty<Text, DAOTypes.VoteRecord>();

  // ── Community state ────────────────────────────────────────────────────────

  let posts    = Map.empty<Common.PostId, CommunityTypes.Post>();
  let comments = Map.empty<Common.CommentId, CommunityTypes.Comment>();
  let profiles = Map.empty<Principal, CommunityTypes.UserProfile>();
  let communityTips = Map.empty<Nat, CommunityTypes.Tip>();
  let communityBannedUsers = Set.empty<Principal>();
  let nextTipId = { var value : Nat = 1 };

  // Public profile pages (additive side maps — no UserProfile record change)
  let profileBanners = Map.empty<Principal, Text>();
  let profileWallpapers = Map.empty<Principal, Text>();
  let profileTop8 = Map.empty<Principal, [Principal]>();

  // On-chain notification inbox (append-only, capped per user in lib)
  let notifications = Map.empty<Principal, List.List<NotificationTypes.Notification>>();
  let notificationLastRead = Map.empty<Principal, Nat>();
  let nextNotificationId = { var value : Nat = 1 };

  // ── Membership state ───────────────────────────────────────────────────────

  let memberships = Map.empty<Principal, MembershipTypes.MembershipNFT>();

  // ── Recipes (CookBook) state ───────────────────────────────────────────────

  let recipes      = Map.empty<Common.RecipeId, RecipeTypes.Recipe>();
  let recipeFavorites = Map.empty<Principal, Set.Set<Common.RecipeId>>();
  let nextRecipeId = { var value : Nat = 1 };
  // Side map for recipe YouTube tutorial URLs — stored Recipe record stays
  // untouched (stable-memory upgrade safety, see AGENTS.md migration rules).
  let recipeVideoUrls = Map.empty<Common.RecipeId, Text>();
  // SEO Phase 2: per-recipe intro paragraph + Common Questions (same pattern).
  let recipeIntros = Map.empty<Common.RecipeId, Text>();
  let recipeFaqs = Map.empty<Common.RecipeId, [(Text, Text)]>();

  // ICSPICY Games — per-player scores + cached leaderboards (additive side maps).
  let gameScores = Map.empty<Text, GamesTypes.GamePlayerStats>();
  let gameLeaderboardCache = Map.empty<Text, [GamesTypes.LeaderboardEntry]>();
  // Principals hidden from public leaderboards (explicit overrides + admins by default).
  let leaderboardExcluded = Map.empty<Principal, Bool>();
  // Ranked game sessions (Phase 1 anti-cheat substrate). Ephemeral — same pattern.
  let gameSessions = Map.empty<Text, GameSessionsTypes.GameSession>();
  let nextGameSessionCounter = { var value : Nat = 1 };
  let savedCrafterRecipes = Map.empty<Principal, [CrafterRecipesTypes.SavedCrafterRecipe]>();
  let gardenStates = Map.empty<Principal, GardenStateTypes.GardenStateBlob>();
  // Soft-bridge pantry (Grow → Slice → Craft). Additive side map — same
  // ephemeral-let + wasm_memory_persistence:keep pattern as gardenStates.
  let ingredientInventory = Map.empty<Principal, IngredientInventoryTypes.IngredientInventoryBlob>();

  // Soulbound achievement badges (token IDs ≥ 200_000). Additive side maps —
  // same ephemeral-let + wasm_memory_persistence:keep pattern. Append-only;
  // do not reorder relative to earlier declarations.
  let badgeRegistry = Map.empty<Nat, AchievementTypes.BadgeRecord>();
  let badgeByOwnerType = Map.empty<Text, Nat>();
  let nextAchievementTokenId = { var value : Nat = 200_000 };

  // Masterclass quiz progress (Principal → JSON blob). Additive side map —
  // same ephemeral-let + wasm_memory_persistence:keep pattern. Append-only.
  let masterclassProgress = Map.empty<Principal, MasterclassTypes.ProgressBlob>();

  // Slicer submit rejection telemetry (append-only — must not insert above).
  let slicerRejectCounts = SlicerTelemetry.empty();

  // Ghost — corrupt EOP slot from mid-block insert (Jul 2026 outage). Do not use.
  // Fresh counter appended below; GamesAPI wired to sessionCounter.
  // let nextGameSessionCounter left in place above at original slot.

  // Append-only replacement after Jul 2026 wasm_memory_persistence slot corruption.
  let sessionCounter = { var value : Nat = 1 };
  let sessionStore = Map.empty<Text, GameSessionsTypes.GameSession>();

  // ── Claim token state (QR label → NFT claim flow) ─────────────────────────

  let claimTokens    = Map.empty<Common.ClaimTokenId, ClaimTypes.ClaimToken>();
  // Phase 4: spcy_<10hex> → NftClaimEntry (tokenId + redeemed flag)
  let nftClaimTokens   = Map.empty<Text, ClaimTypes.NftClaimEntry>();
  let nftClaimPlantIds = Map.empty<Text, Common.PlantId>();
  let plantClaimTokens = Map.empty<Common.PlantId, Text>();
  let nftTokenPlantIds = Map.empty<Nat, Common.PlantId>();

  // Phase 6: ICRC-7 peer-to-peer NFT resale (tokenId-keyed)
  let nftListings = Map.empty<Nat, ResaleTypes.NftListing>();

  // Mandatory NFT per shop product listing (live plant preview only; sale assigns per line)
  let productNftTokenIds = Map.empty<Common.ProductId, Nat>();
  let productInventoryRemaining = Map.empty<Common.ProductId, Nat>();
  let productShippingConfigs = Map.empty<Common.ProductId, ProductShipping.ProductShippingConfig>();
  let orderLineNftTokenIds = Map.empty<Common.OrderId, [Nat]>();
  let orderPickupClaimTokens = Map.empty<Common.OrderId, [Text]>();
  let orderShippingCents = Map.empty<Common.OrderId, Nat>();
  let orderShippingAddresses = Map.empty<Common.OrderId, MarketTypes.ShippingAddress>();
  let adminOrdersSeenUpTo = Map.empty<Principal, Nat>();

  // ── Schedule state (KNF application schedule builder) ─────────────────────

  let savedSchedules      = Map.empty<Common.ScheduleId, ClaimTypes.SavedSchedule>();
  let scheduleShareIndex  = Map.empty<Text, Common.ScheduleId>();

  // ── Phase 9: USDA zone calendars + owner-scoped planting schedule events ─
  let plantingEvents      = Map.empty<Nat, PlantingScheduleTypes.PlantingEvent>();
  let nextPlantingEventId = { var value : Nat = 1 };

  // ── Phase 13: Garden Designer ─────────────────────────────────────────────

  let gardenDesigns = Map.empty<Nat, GardenTypes.GardenDesign>();
  let nextGardenDesignId = { var value : Nat = 1 };

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

  // ── Linked wallets — maps an II principal to their self-reported OISY/other principals ──
  //
  // Used by DAO voting and shop discount to accept NFTs custodied in a linked
  // wallet (e.g. OISY). The II-authenticated caller asserts ownership of the
  // external wallet. Max 5 entries per principal; duplicates silently accepted.
  let linkedWallets = Map.empty<Principal, [Principal]>();

  // ── Reverse map: wallet principal → owning II principal (one-to-one) ────────
  //
  // Enforces that one OISY wallet cannot be linked to multiple II identities,
  // which would allow a single NFT to vote in multiple DAO proposals.
  let walletToIdentity = Map.empty<Principal, Principal>();

  // ── DAO sybil protection: records which NFT token IDs have voted per proposal ─
  //
  // Key: "proposalId:tok:tokenId". Prevents NFT-shuffle attacks where an NFT
  // is transferred between wallets to cast multiple votes on the same proposal.
  let daoTokenVotes = Map.empty<Text, Bool>();

  // ── Grower Co-op membership (additive side maps) ───────────────────────────
  let coopSeats = Map.empty<Nat, CoopTypes.CoopSeat>();
  let coopDesignatedSeats = Map.empty<Nat, Bool>();
  let coopPendingSeats = Map.empty<Nat, Principal>();
  let coopSeatPriceCents = { var value : Nat = 25_000 };
  let nextGrowerTokenId = { var value : Nat = 100_000 };
  let growerProvenanceMeta = Map.empty<Nat, CoopTypes.GrowerProvenanceMeta>();
  let growerMintLimits = Map.empty<Principal, (Nat, Int)>();

  // ── RAVEN balance cache ────────────────────────────────────────────────────
  //
  // Maps a principal to their last-known RAVEN balance (queried from the RAVEN
  // ledger). Used to compute the RAVEN holder shop discount (5% for ≥ 100K
  // RAVEN) without making an async call during order creation.
  // Users refresh via `refreshRavenBalance()` before checkout.
  let ravenBalanceCache = Map.empty<Principal, Nat>();

  // ── Ghost wallet state — kept for stable-memory upgrade compatibility ──────
  //
  // These variables existed in the pre-Phase-4 canister. Motoko's upgrade
  // checker will REFUSE to install a new wasm that drops stable variables, so
  // we keep them here with the same types as before. They are never written to
  // by new code. A future explicit migration will zero them out and remove the
  // declarations.

  let wallets = Map.empty<Principal, WalletTypes.WalletState>();
  let txLog   = List.empty<WalletTypes.WalletTransaction>();

  // ── Payment state (Phase 4) ────────────────────────────────────────────────
  //
  // icpaySecretKey — set via admin method after deploy; never in source code.
  // Empty string = ICPay verification disabled.
  //
  // icpaySessionsConsumed — idempotency map; prevents a paymentId from being
  // used twice. Persistent; must not be cleared on upgrade.
  //
  // auditLog — append-only record of admin-initiated actions. Wrapped in a
  // `{ var value }` record so the PaymentAPI mixin can prepend entries via
  // its captured reference (same pattern as icpaySecretKey). Persistent.

  let icpaySecretKey         : { var value : Text }              = { var value = "" };
  let icpaySessionsConsumed  : Map.Map<Text, Nat>                = Map.empty<Text, Nat>();
  let paypalClientId         : { var value : Text }              = { var value = "" };
  let paypalClientSecret     : { var value : Text }              = { var value = "" };
  let paypalSandbox          : { var value : Bool }              = { var value = false };
  let paypalOrdersConsumed   : Map.Map<Text, Nat>                = Map.empty<Text, Nat>();
  let auditLog               : { var value : AuditLog.AuditLog } = { var value = AuditLog.empty() };

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
          var location : ?Text = null;
          var follows = Set.empty<Principal>();
          created_at = 0;
        });
      };
    };
  };

  // ── Initialization ─────────────────────────────────────────────────────────

  // Seed default KNF recipes on first install (idempotent — skipped if already populated).
  RecipesLib.seedRecipes(recipes, nextRecipeId, initialDeployer);

  // ── Mixins ─────────────────────────────────────────────────────────────────

  include PlantsAPI(accessControlState, plants, trays, trayOwners, feedings, stageHistory, weatherRecords, weatherIndex, artworkLayers, rwaTokens, plantNotesLog, nextPlantId, nextTrayId, nextFeedingId, nextWeatherRecordId, nextArtworkLayerId);
  include VarietyAPI(accessControlState, varieties, plantVarietyIds, nextVarietyId);
  include VarietyProvenanceAPI(accessControlState, varieties, varietyProvenance, varietyIntros);
  include VarietyGuideAPI(accessControlState, varietyGuides);
  include NimsAPI(
    accessControlState,
    callerGuards,
    rateLimits,
    plants,
    trays,
    trayOwners,
    feedings,
    stageHistory,
    varieties,
    plantVarietyIds,
    plantOwners,
    plantPrices,
    plantSoldAt,
    plantTransplantedOneGal,
    plantTransplantedFiveGal,
    plantNotesLog,
    plantWateringLog,
    plantPestLog,
    plantPhotoLog,
    plantWeatherSnapshots,
    nftClaimTokens,
    nftClaimPlantIds,
    plantClaimTokens,
    nftTokenPlantIds,
    icrc7Owners,
    icrc7Balances,
    icrc37Approvals,
    claimTokens,
    rwaTokens,
    func() : Principal { Principal.fromActor(Self) },
    auditLog,
    nextPlantId,
    nextTrayId,
    nextFeedingId,
  );
  include SeedBankAPI(
    accessControlState,
    plants,
    plantOwners,
    plantVarietyIds,
    varieties,
    seedLots,
    breedingCrosses,
    seedVendors,
    nextSeedLotId,
    nextBreedingCrossId,
    nextSeedVendorId,
  );
  include MarketplaceAPI(
    accessControlState,
    rateLimits,
    products,
    orders,
    plants,
    memberships,
    claimTokens,
    productNftTokenIds,
    productInventoryRemaining,
    productShippingConfigs,
    orderLineNftTokenIds,
    orderPickupClaimTokens,
    orderShippingCents,
    orderShippingAddresses,
    icrc7Owners,
    icrc7Balances,
    linkedWallets,
    ravenBalanceCache,
    func() : Principal { Principal.fromActor(Self) },
    nextProductId,
    nextOrderId,
    notifications,
    nextNotificationId,
  );
  include DAOAPI(accessControlState, rateLimits, daoProposals, daoVotes, icrc7Balances, linkedWallets, daoTokenVotes, nextProposalId, coopSeats);
  include CommunityAPI(
    accessControlState,
    rateLimits,
    posts,
    comments,
    profiles,
    communityTips,
    communityBannedUsers,
    nextPostId,
    nextCommentId,
    nextTipId,
    auditLog,
    notifications,
    nextNotificationId,
  );
  include NotificationsAPI(
    accessControlState,
    rateLimits,
    notifications,
    notificationLastRead,
    nextNotificationId,
    profiles,
    posts,
    icrc7Balances,
    ravenBalanceCache,
    linkedWallets,
  );
  include ProfilePageAPI(
    accessControlState,
    rateLimits,
    profiles,
    posts,
    profileBanners,
    profileWallpapers,
    profileTop8,
    icrc7Balances,
    ravenBalanceCache,
    linkedWallets,
    plants,
    uploadsCanisterPrincipal,
  );
  include MembershipAPI(accessControlState, memberships, nextMembershipId);
  include NFTAPI(plants);
  include ICRC7API(
    accessControlState,
    callerGuards,
    icrc7Owners,
    icrc7Balances,
    icrc7TokenMetadataRaw,
    growerProvenanceMeta,
    badgeRegistry,
    func() : Principal { Principal.fromActor(Self) },
    collectionName,
    totalSupplyCap,
    nextBlockIndex,
    recentTxLookup,
    recentTxByOrder,
    recentTxCursor,
    icrc37Approvals,
    certStore,
    linkedWallets,
  );
  include RecipesAPI(accessControlState, recipes, recipeFavorites, recipeVideoUrls, recipeIntros, recipeFaqs, nextRecipeId, auditLog);
  include ClaimAPI(
    accessControlState,
    nftClaimTokens,
    nftClaimPlantIds,
    plantClaimTokens,
    nftTokenPlantIds,
    plants,
    feedings,
    plantVarietyIds,
    plantOwners,
    plantPrices,
    plantSoldAt,
    plantTransplantedOneGal,
    plantTransplantedFiveGal,
    plantNotesLog,
    plantWateringLog,
    plantPestLog,
    plantPhotoLog,
    plantWeatherSnapshots,
    icrc7Owners,
    icrc7Balances,
    func() : Principal { Principal.fromActor(Self) },
    auditLog,
  );
  include NftResaleAPI(
    accessControlState,
    callerGuards,
    nftListings,
    icrc7Owners,
    icrc7Balances,
    icrc37Approvals,
    plants,
    plantVarietyIds,
    plantOwners,
    plantPrices,
    plantSoldAt,
    plantTransplantedOneGal,
    plantTransplantedFiveGal,
    plantNotesLog,
    plantWateringLog,
    plantPestLog,
    plantPhotoLog,
    plantWeatherSnapshots,
    nftTokenPlantIds,
  );
  include ScheduleAPI(accessControlState, savedSchedules, scheduleShareIndex);
  include PlantingScheduleAPI(accessControlState, plantingEvents, nextPlantingEventId);
  include GardenAPI(accessControlState, gardenDesigns, nextGardenDesignId, varieties);
  include LifecycleUpgradeAPI(accessControlState, plants, stageHistory, rwaTokens, upgradeEvents, artworkLayers);
  include BatchGiftAndResaleAPI(accessControlState, batchGiftPacks, resaleListings, claimTokens, plants, rwaTokens, claimMemberships);
  include OffersAPI(accessControlState, offers, treasuryState, treasuryTxLog, priceOracleState, nextOfferId, nextTreasuryTxId);
  include TreasuryAPI(accessControlState, treasuryState, treasuryTxLog, nextTreasuryTxId);
  include PriceOracleAPI(accessControlState, priceOracleState);
  include DABAPI(accessControlState);
  include ArtworkUploadAPI(accessControlState, rateLimits, artworkUploadSession, storedFiles, poolNFTs, selfPrincipalText, uploadsCanisterPrincipal);
  include CommunityVideoAPI(accessControlState, rateLimits, videoUploadSessions, nextVideoUploadId, uploadsCanisterPrincipal);
  include PoolAPI(accessControlState, nftPool, nextPoolProductId);
  include CoopAPI(
    accessControlState,
    callerGuards,
    rateLimits,
    coopSeats,
    coopDesignatedSeats,
    coopPendingSeats,
    coopSeatPriceCents,
    nextGrowerTokenId,
    growerProvenanceMeta,
    growerMintLimits,
    varieties,
    icrc7Owners,
    icrc7Balances,
    icrc37Approvals,
    linkedWallets,
    plants,
    plantOwners,
    plantVarietyIds,
    nftTokenPlantIds,
    nftClaimTokens,
    nftClaimPlantIds,
    plantClaimTokens,
    priceOracleState,
    func() : Principal { Principal.fromActor(Self) },
    auditLog,
  );
  include PaymentAPI(
    accessControlState,
    callerGuards,
    rateLimits,
    orders,
    products,
    productNftTokenIds,
    productInventoryRemaining,
    productShippingConfigs,
    orderLineNftTokenIds,
    orderPickupClaimTokens,
    nftClaimTokens,
    nftClaimPlantIds,
    plantClaimTokens,
    nftTokenPlantIds,
    icrc7Owners,
    icrc7Balances,
    icrc37Approvals,
    func() : Principal { Principal.fromActor(Self) },
    icpaySecretKey,
    icpaySessionsConsumed,
    paypalClientId,
    paypalClientSecret,
    paypalSandbox,
    paypalOrdersConsumed,
    auditLog,
    plants,
    feedings,
    plantVarietyIds,
    plantOwners,
    plantPrices,
    plantSoldAt,
    plantTransplantedOneGal,
    plantTransplantedFiveGal,
    plantNotesLog,
    plantWateringLog,
    plantPestLog,
    plantPhotoLog,
    plantWeatherSnapshots,
    priceOracleState,
    coopSeats,
    coopDesignatedSeats,
    coopPendingSeats,
    coopSeatPriceCents,
  );
  include AdminShopAPI(
    accessControlState,
    products,
    orders,
    orderLineNftTokenIds,
    orderPickupClaimTokens,
    orderShippingCents,
    orderShippingAddresses,
    icpaySessionsConsumed,
    adminOrdersSeenUpTo,
    nftClaimTokens,
    nftClaimPlantIds,
    plantClaimTokens,
    icrc7Owners,
    nftTokenPlantIds,
    productNftTokenIds,
    func() : Principal { Principal.fromActor(Self) },
    auditLog,
  );
  include CrafterAPI(
    accessControlState,
    rateLimits,
    savedCrafterRecipes,
  );
  include PepperPatchAPI(
    accessControlState,
    rateLimits,
    gardenStates,
  );
  include IngredientInventoryAPI(
    accessControlState,
    rateLimits,
    ingredientInventory,
  );
  include AchievementsAPI(
    accessControlState,
    icrc7Owners,
    icrc7Balances,
    badgeRegistry,
    badgeByOwnerType,
    nextAchievementTokenId,
    linkedWallets,
    walletToIdentity,
  );
  include MasterclassAPI(
    accessControlState,
    rateLimits,
    masterclassProgress,
    icrc7Owners,
    icrc7Balances,
    badgeRegistry,
    badgeByOwnerType,
    nextAchievementTokenId,
    linkedWallets,
    walletToIdentity,
  );

  // ── Usage analytics (daily rollups) ─────────────────────────────────────────

  stable var usageRollupEntries : [(Text, Nat)] = [];
  stable var usageUniqueEntries : [(Text, [(Text, Bool)])] = [];

  /// Frontend asset canister for share-time OG HTML publish (append-only slot).
  stable var frontendCanisterIdStable : ?Text = ?"7rukv-hqaaa-aaaao-ba6ma-cai";

  func frontendCanisterPrincipal() : Principal {
    switch (frontendCanisterIdStable) {
      case null Principal.fromText("7rukv-hqaaa-aaaao-ba6ma-cai");
      case (?id) Principal.fromText(id);
    };
  };

  public shared ({ caller }) func setFrontendCanisterId(canisterId : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    frontendCanisterIdStable := ?canisterId;
  };

  public query func getFrontendCanisterId() : async ?Text {
    frontendCanisterIdStable;
  };

  include GamesAPI(
    accessControlState,
    rateLimits,
    profiles,
    gameScores,
    gameLeaderboardCache,
    leaderboardExcluded,
    sessionStore,
    slicerRejectCounts,
    sessionCounter,
    nextAchievementTokenId,
    icrc7Owners,
    icrc7Balances,
    badgeRegistry,
    badgeByOwnerType,
    linkedWallets,
    walletToIdentity,
    frontendCanisterPrincipal,
    uploadsCanisterPrincipal,
  );

  var _usageState : UsageAnalytics.UsageState = UsageAnalytics.newState();

  // Daily weather provenance — Open-Meteo capture for all active plants.
  // Timers are not persisted across upgrades; restart in postupgrade.
  transient var dailyWeatherTimerId : ?Timer.TimerId = null;

  func startDailyWeatherTimer<system>() {
    switch (dailyWeatherTimerId) {
      case (?id) Timer.cancelTimer(id);
      case null {};
    };
    dailyWeatherTimerId := ?Timer.recurringTimer<system>(
      #seconds(86400),
      func () : async () {
        ignore await runDailyWeatherCapture();
        UsageAnalytics.prune(_usageState, 90);
      },
    );
  };

  startDailyWeatherTimer<system>();

  // ── Usage analytics ─────────────────────────────────────────────────────────

  public shared ({ caller }) func recordUsageEvent(feature : Text, action : Text) : async () {
    if (caller.isAnonymous()) return;
    UsageAnalytics.record(_usageState, caller, feature, action);
  };

  public query ({ caller }) func getUsageRollups(days : Nat) : async [UsageAnalytics.DailyFeatureStat] {
    assert AccessControl.isAdmin(accessControlState, caller);
    UsageAnalytics.getRollups(_usageState, days);
  };

  public shared ({ caller }) func pruneUsageData() : async () {
    AccessControl.requireAdmin(accessControlState, caller);
    UsageAnalytics.prune(_usageState, 90);
  };

  // ── Linked wallets (for OISY NFT custody + DAO voting eligibility) ─────────
  //
  // II-authenticated users can self-report their OISY (or other) principal.
  // These linked principals are checked by DAO voting and shop discount
  // to honour NFTs custodied outside the caller's II identity.

  public shared ({ caller }) func linkWallet(walletPrincipal : Principal) : async Bool {
    AccessControl.requireAuthenticated(caller);
    // Reject anonymous, self-links, and canister principal.
    if (Principal.isAnonymous(walletPrincipal)) return false;
    if (Principal.equal(caller, walletPrincipal)) Runtime.trap("Cannot link your own identity as a wallet");
    if (Principal.equal(walletPrincipal, Principal.fromActor(Self))) Runtime.trap("Invalid wallet principal");
    // Enforce one-to-one: an OISY wallet may only be linked to one II identity.
    switch (walletToIdentity.get(walletPrincipal)) {
      case (?existingOwner) {
        if (not Principal.equal(existingOwner, caller)) {
          Runtime.trap("This wallet is already linked to another identity");
        };
        // Already linked to this caller — idempotent success.
        return true;
      };
      case null {};
    };
    let existing = switch (linkedWallets.get(caller)) {
      case (?list) list;
      case null [];
    };
    if (existing.size() >= 5) return false;
    for (p in existing.vals()) {
      if (Principal.equal(p, walletPrincipal)) return true;
    };
    linkedWallets.add(caller, existing.concat([walletPrincipal]));
    walletToIdentity.add(walletPrincipal, caller);
    true;
  };

  public query ({ caller }) func getLinkedWallets() : async [Principal] {
    switch (linkedWallets.get(caller)) {
      case (?list) list;
      case null [];
    };
  };

  public shared ({ caller }) func unlinkWallet(walletPrincipal : Principal) : async Bool {
    AccessControl.requireAuthenticated(caller);
    switch (linkedWallets.get(caller)) {
      case null false;
      case (?list) {
        linkedWallets.add(
          caller,
          Array.filter<Principal>(list, func(p) { not Principal.equal(p, walletPrincipal) }),
        );
        // Remove the reverse-map entry so the wallet can be re-linked later.
        walletToIdentity.remove(walletPrincipal);
        true;
      };
    };
  };

  // ── RAVEN balance cache refresh ────────────────────────────────────────────
  //
  // Queries the RAVEN ledger for the caller's balance and stores it in the
  // cache. Frontend calls this before checkout so the RAVEN 5% discount is
  // applied at order creation time without an inline async ledger call.

  public shared ({ caller }) func refreshRavenBalance() : async () {
    AccessControl.requireAuthenticated(caller);
    let ledger : actor { icrc1_balance_of : ({ owner : Principal; subaccount : ?Blob }) -> async Nat } = actor("4k7jk-vyaaa-aaaam-qcyaa-cai");
    let balance = await ledger.icrc1_balance_of({ owner = caller; subaccount = null });
    ravenBalanceCache.add(caller, balance);
  };

  public query ({ caller }) func getRavenDiscountPercent() : async Nat {
    let RAVEN_THRESHOLD : Nat = 100_000 * 100_000_000;
    switch (ravenBalanceCache.get(caller)) {
      case (?bal) if (bal >= RAVEN_THRESHOLD) 5 else 0;
      case null 0;
    };
  };

  // ── Audit log query ────────────────────────────────────────────────────────

  public query({ caller }) func getAuditLog(offset : Nat, limit : Nat) : async [AuditLog.AuditEntry] {
    assert AccessControl.isAdmin(accessControlState, caller);
    AuditLog.toArray(auditLog.value, offset, limit)
  };

  // ── Canister health (cycles monitoring) ────────────────────────────────────

  /// Public query — anyone can check backend canister health.
  public query func getCanisterHealth() : async CanisterHealth.Health {
    CanisterHealth.localHealth();
  };

  /// Admin: backend cycle balance (AGENTS.md hygiene).
  public shared query ({ caller }) func getCycleBalance() : async Nat {
    assert AccessControl.isAdmin(accessControlState, caller);
    Prim.cyclesBalance();
  };

  /// Admin: cycles + memory for backend, frontend, nft_assets, and uploads canisters.
  public shared ({ caller }) func getFleetCanisterHealth() : async [CanisterHealth.FleetEntry] {
    AccessControl.requireAdmin(accessControlState, caller);
    let backendId = Principal.fromActor(Self).toText();
    let local = CanisterHealth.localHealth();
    let backendEntry : CanisterHealth.FleetEntry = {
      name = "backend";
      canisterId = backendId;
      cyclesBalance = local.cyclesBalance;
      memorySize = local.memoryUsed;
      isHealthy = local.isHealthy;
    };
    let frontendId = "7rukv-hqaaa-aaaao-ba6ma-cai";
    let nftAssetsId = "gawk3-2qaaa-aaaao-ba4sa-cai";
    let uploadsId = switch uploadsCanisterIdStable {
      case null "r53pg-maaaa-aaaao-ba7na-cai";
      case (?id) id;
    };
    let frontend = await CanisterHealth.fetchRemoteHealth("frontend", frontendId);
    let nftAssets = await CanisterHealth.fetchRemoteHealth("nft_assets", nftAssetsId);
    let uploads = await CanisterHealth.fetchRemoteHealth("uploads", uploadsId);
    [backendEntry, frontend, nftAssets, uploads];
  };

  // ── Ingress filter ─────────────────────────────────────────────────────────

  // Block anonymous callers at ingress before consensus — no cycles burned on rejection.
  // All update calls from anonymous principals are rejected. Query calls (including
  // _initializeAccessControl, which is now a query) bypass this filter entirely.
  // Reject oversized messages (>2 MB) to prevent memory exhaustion attacks.
  let MAX_INGRESS_BYTES : Nat = 2_097_152;

  system func inspect({
    caller : Principal;
    arg : Blob;
  }) : Bool {
    if (arg.size() > MAX_INGRESS_BYTES) { return false };
    not caller.isAnonymous();
  };

  // Phase 3.6: re-establish the certified-data slot after upgrade.
  //
  // The Merkle tree (certStore) is `let` in a persistent actor, so its
  // structure survives the upgrade. The IC subnet's certified-data slot,
  // however, is RESET to all-zeros on upgrade — without re-setting it,
  // every certified query would return a certificate that doesn't match
  // the tree root, and verification would fail.
  //
  // No-op on tokens: this just re-publishes the existing tree's root
  // hash. It does NOT mutate the tree, so it cannot lose data.
  system func preupgrade() {
    usageRollupEntries := Iter.toArray(_usageState.rollups.entries());
    usageUniqueEntries := Array.map<
      (Text, Map.Map<Text, Bool>),
      (Text, [(Text, Bool)]),
    >(
      Iter.toArray(_usageState.uniqueSets.entries()),
      func((k, v)) = (k, Iter.toArray(v.entries())),
    );
  };

  system func postupgrade() {
    for ((k, v) in usageRollupEntries.vals()) {
      _usageState.rollups.add(k, v);
    };
    for ((k, pairs) in usageUniqueEntries.vals()) {
      let s = Map.empty<Text, Bool>();
      for ((uk, uv) in pairs.vals()) {
        s.add(uk, uv);
      };
      _usageState.uniqueSets.add(k, s);
    };
    usageRollupEntries := [];
    usageUniqueEntries := [];

    Cert.setCertifiedData(certStore);
    startDailyWeatherTimer<system>();
    // Re-filter leaderboards so admin/test principals are hidden after upgrade.
    GamesLib.rebuildAllLeaderboardCaches(
      gameScores,
      gameLeaderboardCache,
      leaderboardExcluded,
      accessControlState,
    );
  };
};
