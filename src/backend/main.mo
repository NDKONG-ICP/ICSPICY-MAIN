import Map "mo:core/Map";
import List "mo:core/List";
import Set "mo:core/Set";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Blob "mo:core/Blob";
import Array "mo:core/Array";
import CertifiedData "mo:core/CertifiedData";
import AccessControl "lib/access-control";
import MixinAuthorization "lib/mixin-authorization";
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
import NFTLib "lib/nft";
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





persistent actor ICSpicy {
  // Authorization
  let accessControlState = AccessControl.initState();

  // All owner principals are always admin — regardless of who calls first.
  // lgjjr-4bwun-koggr-pornj-ltxia-m4xxo-iy7mg-cct7e-okxub-mbxku-tae
  // 7qhp3-ojhp3-sjhf6-lnj6s-kqxyt-q4iaw-vtdxi-youle-zn666-4o5gh
  // 7qhp3-ojhp3-sjhf6-lnj6s-kqxyt-q4iaw-vtdxi-youle-zn666-4o5gh-qae  (canonical II PID with checksum suffix)
  //
  // IMPORTANT: Principal.fromText() must NOT be called at module level — it
  // traps at canister init time if the string is ever malformed.
  // All conversions are done lazily inside functions instead.

  // Helper: returns true when caller is any of the owner principals
  func isAdminPid(p : Principal) : Bool {
    let pid0 = Principal.fromText("lgjjr-4bwun-koggr-pornj-ltxia-m4xxo-iy7mg-cct7e-okxub-mbxku-tae");
    let pid1 = Principal.fromText("7qhp3-ojhp3-sjhf6-lnj6s-kqxyt-q4iaw-vtdxi-youle-zn666-4o5gh");
    let pid2 = Principal.fromText("7qhp3-ojhp3-sjhf6-lnj6s-kqxyt-q4iaw-vtdxi-youle-zn666-4o5gh-qae");
    p == pid0 or p == pid1 or p == pid2
  };

  // Seed admin roles — called lazily inside public functions to avoid init-time trap.
  // Principal.fromText() at actor body level (including do{} blocks) traps at canister
  // install time before the canister ID is assigned. Use a lazy helper instead.
  var adminRolesSeeded : Bool = false;
  func seedAdminRoles() {
    if (adminRolesSeeded) return;
    let pid0 = Principal.fromText("lgjjr-4bwun-koggr-pornj-ltxia-m4xxo-iy7mg-cct7e-okxub-mbxku-tae");
    let pid1 = Principal.fromText("7qhp3-ojhp3-sjhf6-lnj6s-kqxyt-q4iaw-vtdxi-youle-zn666-4o5gh");
    let pid2 = Principal.fromText("7qhp3-ojhp3-sjhf6-lnj6s-kqxyt-q4iaw-vtdxi-youle-zn666-4o5gh-qae");
    accessControlState.userRoles.add(pid0, #admin);
    accessControlState.userRoles.add(pid1, #admin);
    accessControlState.userRoles.add(pid2, #admin);
    accessControlState.adminAssigned := true;
    adminRolesSeeded := true;
  };

  include MixinAuthorization(accessControlState);

  // Returns all hardcoded admin principals for frontend verification (primary first)
  public query func getAdminPrincipal() : async Text {
    "lgjjr-4bwun-koggr-pornj-ltxia-m4xxo-iy7mg-cct7e-okxub-mbxku-tae"
  };

  // Returns all admin PIDs so the frontend can recognise every owner account
  public query func getAdminPrincipals() : async [Text] {
    [
      "lgjjr-4bwun-koggr-pornj-ltxia-m4xxo-iy7mg-cct7e-okxub-mbxku-tae",
      "7qhp3-ojhp3-sjhf6-lnj6s-kqxyt-q4iaw-vtdxi-youle-zn666-4o5gh",
      "7qhp3-ojhp3-sjhf6-lnj6s-kqxyt-q4iaw-vtdxi-youle-zn666-4o5gh-qae",
    ]
  };

  // Safety-net: called by the frontend on every admin sign-in.
  // Re-creates the admin profile if it was lost (e.g. after a redeploy that reset state).
  // Silently ignored when called by any principal that is NOT one of the admin PIDs.
  // Idempotent — does nothing if the profile already exists.
  public shared ({ caller }) func ensureAdminProfile() : async () {
    seedAdminRoles();
    seedAdminProfiles();
    if (not isAdminPid(caller)) return;
    switch (profiles.get(caller)) {
      case (?_) {};
      case null {
        let adminProfile : CommunityTypes.UserProfile = {
          principal_id = caller;
          var username = "Admin";
          var bio = "";
          var avatar_key = null;
          var follows = Set.empty<Principal>();
          created_at = 0;
        };
        profiles.add(caller, adminProfile);
      };
    };
  };

  // Returns this canister's own principal ID as Text.
  // The canister ID is assigned at deployment time and is visible in the
  // Caffeine dashboard. Use it to register with the DAB registry manually.
  public query func getCanisterId() : async Text {
    Principal.fromActor(ICSpicy).toText()
  };

  // Object-storage certified data support.
  // The StorageClient SDK calls this update method with a sha256 hash string,
  // sets it as IC certified data, then reads the resulting certificate via the
  // companion query. This provides the OwnerEgressSignature required by the
  // Caffeine blob-tree upload endpoint.
  public shared func _immutableObjectStorageCreateCertificate(hash : Text) : async Blob {
    let hashBlob = hash.encodeUtf8();
    let bytes = hashBlob.toArray();
    // CertifiedData.set requires <= 32 bytes; truncate if the hash encoding exceeds that.
    let truncated : [Nat8] = if (bytes.size() <= 32) bytes else Array.tabulate<Nat8>(32, func i = bytes[i]);
    CertifiedData.set(Blob.fromArray(truncated));
    switch (CertifiedData.getCertificate()) {
      case (?cert) cert;
      case null Blob.fromArray([]);
    };
  };

  // Companion query: returns the IC certificate for the most recently set certified data.
  // Called by the StorageClient SDK after the update to obtain the signed certificate blob.
  public query func _immutableObjectStorageGetCertificate() : async ?Blob {
    CertifiedData.getCertificate();
  };

  // Counter wrappers (shared mutable references)
  let nextPlantId = { var value : Nat = 1 };
  let nextTrayId = { var value : Nat = 1 };
  let nextFeedingId = { var value : Nat = 1 };
  let nextProductId = { var value : Nat = 1 };
  let nextOrderId = { var value : Nat = 1 };
  let nextProposalId = { var value : Nat = 1 };
  let nextPostId = { var value : Nat = 1 };
  let nextCommentId = { var value : Nat = 1 };
  let nextMembershipId = { var value : Nat = 1 };
  let nextWeatherRecordId = { var value : Nat = 1 };
  let nextArtworkLayerId = { var value : Nat = 1 };

  // Plant lifecycle state
  let plants = Map.empty<Common.PlantId, PlantTypes.Plant>();
  let trays = Map.empty<Common.TrayId, PlantTypes.Tray>();
  let trayOwners = Map.empty<Common.TrayId, Principal>(); // tracks who created each tray
  let feedings = Map.empty<Common.FeedingId, PlantTypes.Feeding>();
  let stageHistory = Map.empty<Common.PlantId, List.List<PlantTypes.StageHistory>>();

  // NIMS: weather records — indexed by id, deduplicated by (principal, date) key
  let weatherRecords = Map.empty<Common.WeatherRecordId, PlantTypes.WeatherRecord>();
  let weatherIndex = Map.empty<Text, Common.WeatherRecordId>();

  // NIMS: artwork layers for RWA NFT compositing
  let artworkLayers = Map.empty<Common.ArtworkLayerId, PlantTypes.ArtworkLayer>();

  // RWA Provenance NFT tokens (ICRC-37 with full lifecycle metadata)
  let rwaTokens = Map.empty<Text, PlantTypes.RWATokenMetadata>();

  // ICRC-37 on-chain NFT tokens (regular mint flow via NFTAPI)
  let icrc37Tokens = Map.empty<Text, NFTLib.ICRC37Metadata>();

  // EXT on-chain NFT tokens (Entrepot Token eXtension — backward compatibility)
  let extTokens = Map.empty<Text, NFTLib.EXTMetadata>();

  // Marketplace state
  let products = Map.empty<Common.ProductId, MarketTypes.Product>();
  let orders = Map.empty<Common.OrderId, MarketTypes.Order>();

  // DAO state
  let proposals = Map.empty<Common.ProposalId, DAOTypes.Proposal>();

  // Community state
  let posts = Map.empty<Common.PostId, CommunityTypes.Post>();
  let comments = Map.empty<Common.CommentId, CommunityTypes.Comment>();
  let profiles = Map.empty<Principal, CommunityTypes.UserProfile>();

  // Auto-seed admin profiles so neither admin PID is ever prompted to create an account.
  // Idempotent — skipped per-PID if the profile already exists.
  // Executed lazily inside public functions — NOT at actor body level — to avoid
  // the 'blob_of_principal: invalid principal' trap during canister install.
  var adminProfilesSeeded : Bool = false;
  func seedAdminProfiles() {
    if (adminProfilesSeeded) return;
    let pid0 = Principal.fromText("lgjjr-4bwun-koggr-pornj-ltxia-m4xxo-iy7mg-cct7e-okxub-mbxku-tae");
    let pid1 = Principal.fromText("7qhp3-ojhp3-sjhf6-lnj6s-kqxyt-q4iaw-vtdxi-youle-zn666-4o5gh");
    let pid2 = Principal.fromText("7qhp3-ojhp3-sjhf6-lnj6s-kqxyt-q4iaw-vtdxi-youle-zn666-4o5gh-qae");
    for (pid in [pid0, pid1, pid2].values()) {
      switch (profiles.get(pid)) { case (?_) {}; case null {
        let adminProfile : CommunityTypes.UserProfile = {
          principal_id = pid;
          var username = "Admin";
          var bio = "";
          var avatar_key = null;
          var follows = Set.empty<Principal>();
          created_at = 0;
        };
        profiles.add(pid, adminProfile);
      }};
    };
    adminProfilesSeeded := true;
  };

  // Membership state
  let memberships = Map.empty<Principal, MembershipTypes.MembershipNFT>();

  // Wallet state
  let wallets = Map.empty<Principal, WalletTypes.WalletState>();
  let txLog   = List.empty<WalletTypes.WalletTransaction>();

  // Recipes (CookBook) state
  let recipes = Map.empty<Common.RecipeId, RecipeTypes.Recipe>();
  let nextRecipeId = { var value : Nat = 1 };

  // Claim token state (QR label → NFT claim flow)
  let claimTokens = Map.empty<Common.ClaimTokenId, ClaimTypes.ClaimToken>();

  // Schedule state (KNF application schedule builder)
  let savedSchedules = Map.empty<Common.ScheduleId, ClaimTypes.SavedSchedule>();
  let scheduleShareIndex = Map.empty<Text, Common.ScheduleId>();

  // Lifecycle upgrade event log (plant NFT burn-and-mint history)
  let upgradeEvents = Map.empty<Common.PlantId, List.List<ClaimTypes.LifecycleUpgradeEvent>>();

  // Claim-based membership tokens (RWA NFT discount holders — separate from DAO MembershipNFT)
  let claimMemberships = Map.empty<Principal, PlantTypes.RWATokenMetadata>();

  // Batch gift packs — single QR unlocks multiple plant NFTs at once
  let batchGiftPacks = Map.empty<Text, BatchTypes.BatchGiftPack>();

  // Peer-to-peer resale listings — holders list plant NFTs for sale to other users
  let resaleListings = Map.empty<Text, BatchTypes.ResaleListing>();

  // Offers state — p2p offer/counter-offer negotiation (never expire automatically)
  let offers = Map.empty<Text, OfferTypes.Offer>();
  let nextOfferId = { var value : Nat = 1 };

  // Treasury state — stores each accepted token in native form
  let treasuryState : TreasuryTypes.TreasuryState = {
    var icpBalance    = 0;
    var ckbtcBalance  = 0;
    var ckethBalance  = 0;
    var ckusdcBalance = 0;
    var ckusdtBalance = 0;
  };
  let treasuryTxLog = List.empty<TreasuryTypes.TreasuryTransaction>();
  let nextTreasuryTxId = { var value : Nat = 1 };

  // Price oracle state — caches ICPSwap prices with fallback
  let priceOracleState : PriceOracleTypes.PriceOracleState = {
    var prices            = [];
    var last_full_refresh = 0;
  };

  // ── Artwork upload & Pool NFT state ────────────────────────────────────────
  // On-chain artwork store: files uploaded by admin are stored here directly.
  // No external blob storage involved — this canister IS the asset canister.
  let storedFiles  = Map.empty<Text, ArtworkUploadTypes.StoredFile>();
  let poolNFTs     = Map.empty<Nat, ArtworkUploadTypes.PoolNFT>();

  // ── Standalone Pool NFT state (PoolAPI mixin) ───────────────────────────────
  // Separate map typed to PoolLib.PoolMap (Map<Nat, PoolTypes.PoolNFTRecord>).
  // Tracks the 8888 pre-generated composite NFTs with rarity, layer combos, and
  // assignment status (Ready / Airdropped / Shop / QRAssigned).
  let nftPool : PoolLib.PoolMap   = Map.empty<Nat, PoolTypes.PoolNFTRecord>();
  let nextPoolProductId           = { var value : Nat = 1 };

  // Upload session — writes zip chunks into a pre-allocated flat buffer.
  // The flat buffer approach avoids the [[Nat8]] heap accumulation that caused
  // IC0539 Wasm memory limit exceeded on large artwork zips.
  let artworkUploadSession : ArtworkUploadTypes.UploadSession = {
    var buffer       = [var];
    var chunk_size   = 0;
    var total_chunks = 0;
    var received     = 0;
    started_at       = 0;
  };

  // This canister's own principal, computed lazily on first call.
  // We pass a closure so that Principal.fromActor() is never called at actor
  // body level (which would trigger 'blob_of_principal: invalid principal'
  // on first install before the canister ID is assigned).
  func selfPrincipalText() : Text {
    Principal.fromActor(ICSpicy).toText()
  };

  // Auto-seed KNF recipes on first install (idempotent — skipped if already populated)
  RecipesLib.seedRecipes(recipes, nextRecipeId);

  // Mixins
  include PlantsAPI(accessControlState, plants, trays, trayOwners, feedings, stageHistory, weatherRecords, weatherIndex, artworkLayers, rwaTokens, nextPlantId, nextTrayId, nextFeedingId, nextWeatherRecordId, nextArtworkLayerId);
  include MarketplaceAPI(accessControlState, products, orders, plants, memberships, claimTokens, nextProductId, nextOrderId);
  include DAOAPI(accessControlState, proposals, plants, memberships, nextProposalId);
  include CommunityAPI(accessControlState, posts, comments, profiles, nextPostId, nextCommentId);
  include MembershipAPI(accessControlState, memberships, nextMembershipId, icrc37Tokens, extTokens);
  include NFTAPI(accessControlState, plants, icrc37Tokens, extTokens);
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
};
