import Map "mo:core/Map";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Principal "mo:core/Principal";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import AccessControl "../lib/access-control";
import Types "../types/artwork-upload";
import ArtworkLib "../lib/artwork-upload";
import AssetUpload "../lib/asset-upload";
import RateLimits "../lib/rate-limits";
import RateLimit "../lib/rate-limit";

mixin (
  accessControlState : AccessControl.AccessControlState,
  rateLimits : RateLimits.Bundle,
  artworkUploadSession : Types.UploadSession,
  storedFiles   : Map.Map<Text, Types.StoredFile>,
  poolNFTs      : Map.Map<Nat, Types.PoolNFT>,
  selfPrincipalText : () -> Text,
  uploadsCanisterPrincipal : () -> ?Principal,
) {

  // ── Upload session ─────────────────────────────────────────────────────────

  /// Admin: begin a new zip upload session.
  /// Call this once before sending chunks.
  public shared ({ caller }) func beginArtworkUpload(totalChunks : Nat) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    ArtworkLib.beginSession(artworkUploadSession, totalChunks);
  };

  /// Admin: upload one chunk of the zip file.
  /// chunkIndex is 0-based; send chunks in order.
  /// Chunks are written directly into a pre-allocated flat buffer to avoid
  /// heap overflow on large collections (fixes IC0539 Wasm memory exceeded).
  public shared ({ caller }) func uploadArtworkChunk(
    chunkIndex  : Nat,
    totalChunks : Nat,
    data        : [Nat8],
  ) : async { #ok; #err : Text } {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    ArtworkLib.receiveChunk(artworkUploadSession, chunkIndex, totalChunks, data);
  };

  /// Admin: query the current upload session status (no data bytes returned).
  public query func getArtworkUploadStatus() : async Types.UploadSessionStatus {
    {
      total_chunks = artworkUploadSession.total_chunks;
      received     = artworkUploadSession.received;
      started_at   = artworkUploadSession.started_at;
    };
  };

  // ── Direct file storage (preferred path: frontend extracts zip and sends files) ──

  /// Admin: store a single artwork file directly.
  /// path must include the layer folder, e.g. "layer-1/bg.png".
  /// The frontend reads the zip, extracts each file, and calls this per file.
  public shared ({ caller }) func storeArtworkFile(
    path     : Text,
    data     : [Nat8],
    mimeType : Text,
  ) : async Types.StoredFile {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    let now = Time.now();
    if (isShopListingPath(path)) {
      await AssetUpload.storeToUploadsCanister(
        uploadsCanisterPrincipal(),
        path,
        data,
        mimeType,
      );
      return ArtworkLib.buildStoredFileMetadata(path, data.size(), mimeType, now);
    };
    ArtworkLib.storeFile(storedFiles, path, data, mimeType, now);
  };

  /// Admin: clear all stored artwork files (reset for a fresh upload).
  public shared ({ caller }) func clearArtworkFiles() : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    storedFiles.clear();
  };

  // ── Upload result / layer summary ──────────────────────────────────────────

  /// Admin: finalize and get upload result summary.
  /// Returns the asset canister ID (this canister), layers detected, and file counts.
  public shared ({ caller }) func finalizeArtworkUpload() : async Types.UploadResult {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    ArtworkLib.buildUploadResult(selfPrincipalText(), storedFiles);
  };

  /// Public query: get the artwork upload result without admin check (for display).
  public query func getArtworkUploadResult() : async Types.UploadResult {
    ArtworkLib.buildUploadResult(selfPrincipalText(), storedFiles);
  };

  /// Public query: list all stored artwork files (path + size, no data).
  public query func listArtworkFiles() : async [(Text, Nat)] {
    storedFiles.entries().map<(Text, Types.StoredFile), (Text, Nat)>(func((path, file)) {
      (path, file.size)
    }).toArray();
  };

  /// Admin: retrieve raw bytes for a specific artwork file.
  public shared ({ caller }) func getArtworkFile(path : Text) : async ?[Nat8] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    switch (storedFiles.get(path)) {
      case (?file) ?file.data;
      case null null;
    };
  };

  func isShopListingPath(path : Text) : Bool {
    let prefix = "shop-listings/";
    if (path.size() < prefix.size()) return false;
    var pathIter = path.chars();
    for (pc in prefix.chars()) {
      switch (pathIter.next()) {
        case null return false;
        case (?c) { if (c != pc) return false };
      };
    };
    true;
  };

  func isNimsPhotoPath(path : Text) : Bool {
    let prefix = "nims-photos/";
    if (path.size() < prefix.size()) return false;
    var pathIter = path.chars();
    for (pc in prefix.chars()) {
      switch (pathIter.next()) {
        case null return false;
        case (?c) { if (c != pc) return false };
      };
    };
    true;
  };

  func isVerifiedGrowerImagePath(path : Text) : Bool {
    let prefix = "verified-growers/";
    if (path.size() < prefix.size()) return false;
    var pathIter = path.chars();
    for (pc in prefix.chars()) {
      switch (pathIter.next()) {
        case null return false;
        case (?c) { if (c != pc) return false };
      };
    };
    true
  };

  func isCommunityImagePath(path : Text) : Bool {
    let prefix = "community-images/";
    if (path.size() < prefix.size()) return false;
    var pathIter = path.chars();
    for (pc in prefix.chars()) {
      switch (pathIter.next()) {
        case null return false;
        case (?c) { if (c != pc) return false };
      };
    };
    true;
  };

  func isAvatarPath(path : Text) : Bool {
    let prefix = "avatars/";
    if (path.size() < prefix.size()) return false;
    var pathIter = path.chars();
    for (pc in prefix.chars()) {
      switch (pathIter.next()) {
        case null return false;
        case (?c) { if (c != pc) return false };
      };
    };
    true;
  };

  func isPublicImagePath(path : Text) : Bool {
    isCommunityImagePath(path) or isAvatarPath(path);
  };

  /// Authenticated users: profile avatar (avatars/*).
  public shared ({ caller }) func storeAvatarFile(data : [Nat8]) : async Text {
    AccessControl.requireAuthenticated(caller);
    RateLimit.trapIfLimited(rateLimits.upload, caller, "Rate limited. Try again in a minute.");
    if (data.size() > 1_000_000) {
      Runtime.trap("File too large (max 1 MB)");
    };
    let key = "avatars/" # Principal.toText(caller) # "-" # Nat.toText(Int.abs(Time.now())) # ".jpg";
    await AssetUpload.storeToUploadsCanister(
      uploadsCanisterPrincipal(),
      key,
      data,
      "image/jpeg",
    );
    key;
  };

  /// Public: avatar bytes stored via storeAvatarFile (avatars/* only).
  public query func getAvatarFile(key : Text) : async ?[Nat8] {
    if (not isAvatarPath(key)) return null;
    switch (storedFiles.get(key)) {
      case (?file) ?file.data;
      case null null;
    };
  };

  /// Authenticated users: community post images (community-images/*).
  public shared ({ caller }) func storeCommunityImage(
    path     : Text,
    data     : [Nat8],
    mimeType : Text,
  ) : async Types.StoredFile {
    AccessControl.requireAuthenticated(caller);
    RateLimit.trapIfLimited(rateLimits.upload, caller, "Rate limited. Try again in a minute.");
    if (not isCommunityImagePath(path)) {
      Runtime.trap("Invalid path: must start with community-images/");
    };
    if (data.size() > 1_000_000) {
      Runtime.trap("File too large (max 1 MB)");
    };
    let now = Time.now();
    await AssetUpload.storeToUploadsCanister(
      uploadsCanisterPrincipal(),
      path,
      data,
      mimeType,
    );
    ArtworkLib.buildStoredFileMetadata(path, data.size(), mimeType, now);
  };

  /// Admin: verified grower preview images (verified-growers/*).
  public shared ({ caller }) func adminStoreVerifiedGrowerImage(
    path     : Text,
    data     : [Nat8],
    mimeType : Text,
  ) : async Types.StoredFile {
    AccessControl.requireAdmin(accessControlState, caller);
    if (not isVerifiedGrowerImagePath(path)) {
      Runtime.trap("Invalid path: must start with verified-growers/");
    };
    if (data.size() > 2_000_000) {
      Runtime.trap("File too large (max 2 MB)");
    };
    if (mimeType != "image/jpeg" and mimeType != "image/png" and mimeType != "image/webp") {
      Runtime.trap("Invalid mime type");
    };
    let now = Time.now();
    await AssetUpload.storeToUploadsCanister(
      uploadsCanisterPrincipal(),
      path,
      data,
      mimeType,
    );
    ArtworkLib.buildStoredFileMetadata(path, data.size(), mimeType, now);
  };

  /// Public: community images stored via storeCommunityImage (community-images/* only).
  public query func getCommunityImageFile(path : Text) : async ?Types.ShopListingFile {
    if (not isCommunityImagePath(path)) return null;
    switch (storedFiles.get(path)) {
      case (?file) ?{ data = file.data; mime_type = file.mime_type };
      case null null;
    };
  };

  /// Authenticated users: NIMS plant photos (progress, pest evidence, death records).
  /// Path must start with `nims-photos/`.
  public shared ({ caller }) func storeNimsPhotoFile(
    path     : Text,
    data     : [Nat8],
    mimeType : Text,
  ) : async Types.StoredFile {
    AccessControl.requireAuthenticated(caller);
    RateLimit.trapIfLimited(rateLimits.upload, caller, "Rate limited. Try again in a minute.");
    if (not isNimsPhotoPath(path)) {
      Runtime.trap("Invalid path: must start with nims-photos/");
    };
    if (data.size() > 5_000_000) {
      Runtime.trap("File too large (max 5 MB)");
    };
    let now = Time.now();
    await AssetUpload.storeToUploadsCanister(
      uploadsCanisterPrincipal(),
      path,
      data,
      mimeType,
    );
    ArtworkLib.buildStoredFileMetadata(path, data.size(), mimeType, now);
  };

  /// Public: shop listing photos stored via storeArtworkFile (shop-listings/* only).
  public query func getShopListingFile(path : Text) : async ?Types.ShopListingFile {
    if (not isShopListingPath(path)) return null;
    switch (storedFiles.get(path)) {
      case (?file) ?{ data = file.data; mime_type = file.mime_type };
      case null null;
    };
  };

  /// Public: NIMS photos stored via storeNimsPhotoFile (nims-photos/* only).
  public query func getNimsPhotoFile(path : Text) : async ?Types.ShopListingFile {
    if (not isNimsPhotoPath(path)) return null;
    switch (storedFiles.get(path)) {
      case (?file) ?{ data = file.data; mime_type = file.mime_type };
      case null null;
    };
  };

  // ── Pool NFT generation ────────────────────────────────────────────────────

  /// Admin: pre-generate all 8,888 pool NFTs.
  /// Requires artwork files to be stored first.
  public shared ({ caller }) func generateAllPoolNFTs() : async Nat {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    ArtworkLib.generatePoolNFTs(poolNFTs, storedFiles, Time.now());
  };

  /// Admin: get pool dashboard (Ready / Airdropped / Listed on Shop / Assigned to QR).
  public shared ({ caller }) func getPoolDashboard() : async Types.PoolDashboard {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    ArtworkLib.getPoolDashboard(poolNFTs);
  };

  /// Admin: list pool NFTs, optionally filtered by status, with a limit.
  /// Pass 0 for limit to get all.
  public shared ({ caller }) func listPoolNFTs(
    statusFilter : ?Types.PoolNFTStatus,
    limit        : Nat,
  ) : async [Types.PoolNFTPublic] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    ArtworkLib.listByStatus(poolNFTs, statusFilter, limit);
  };

  /// Admin: assign a single pool NFT (airdrop / list on shop / assign to QR).
  public shared ({ caller }) func assignPoolNFT(
    nftId  : Nat,
    action : Types.AssignAction,
  ) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    ArtworkLib.assignNFT(poolNFTs, nftId, action, Time.now());
  };

  /// Admin: batch assign multiple pool NFTs to the same action.
  /// Returns the count of successfully assigned NFTs.
  public shared ({ caller }) func batchAssignPoolNFTs(
    nftIds : [Nat],
    action : Types.AssignAction,
  ) : async Nat {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    ArtworkLib.batchAssignNFTs(poolNFTs, nftIds, action, Time.now());
  };

  /// Public: get a single pool NFT by ID.
  public query func getPoolNFT(nftId : Nat) : async ?Types.PoolNFTPublic {
    switch (poolNFTs.get(nftId)) {
      case (?nft) ?ArtworkLib.toPublic(nft);
      case null null;
    };
  };

  /// Admin: reset a single pool NFT back to #Ready, clearing all assignment fields.
  /// This is the canonical reset — operates on the poolNFTs map owned by this mixin.
  public shared ({ caller }) func resetPoolNFT(
    nftId : Nat,
  ) : async { #ok : Text; #err : Text } {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return #err("Unauthorized: Admin only");
    };
    switch (poolNFTs.get(nftId)) {
      case null { #err("NFT not found: " # nftId.toText()) };
      case (?nft) {
        nft.status := #Ready;
        #ok("NFT #" # nftId.toText() # " reset to Ready");
      };
    };
  };
};
