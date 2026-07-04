import Map "mo:core/Map";
import Iter "mo:core/Iter";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Blob "mo:core/Blob";
import Array "mo:core/Array";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import AccessControl "../lib/access-control";
import AssetUpload "../lib/asset-upload";
import RateLimit "../lib/rate-limit";
import RateLimits "../lib/rate-limits";
import VideoTypes "../types/video-upload";

/// Chunked on-chain short-video uploads for community posts.
/// Videos are assembled from ≤1.9MB ingress chunks and forwarded to the
/// uploads asset canister (batch API) under `community-videos/<principal>/…`.
mixin (
  accessControlState : AccessControl.AccessControlState,
  rateLimits : RateLimits.Bundle,
  videoUploadSessions : Map.Map<Nat, VideoTypes.VideoUploadSession>,
  nextVideoUploadId : { var value : Nat },
  uploadsCanisterPrincipal : () -> ?Principal,
) {
  // 50MB hard cap (~60s of compressed phone video).
  let MAX_VIDEO_BYTES : Nat = 50_000_000;
  // Ingress limit is 2MB; leave candid headroom.
  let MAX_CHUNK_BYTES : Nat = 1_900_000;
  // Poster travels in the finish call, so it must stay well under ingress.
  let MAX_POSTER_BYTES : Nat = 1_000_000;
  // Sessions abandoned longer than this are reclaimable.
  let SESSION_TTL_NANOS : Int = 1_800_000_000_000; // 30 minutes

  func extensionFor(contentType : Text) : ?Text {
    if (contentType == "video/mp4") return ?"mp4";
    if (contentType == "video/webm") return ?"webm";
    if (contentType == "video/quicktime") return ?"mov";
    null;
  };

  func expired(session : VideoTypes.VideoUploadSession, now : Int) : Bool {
    now - session.startedAt > SESSION_TTL_NANOS;
  };

  /// Drop this caller's stale/abandoned sessions so a new upload can begin.
  func reapSessions(caller : Principal, now : Int) {
    let stale = videoUploadSessions.entries()
      .filter(func((_, s) : (Nat, VideoTypes.VideoUploadSession)) : Bool {
        s.owner == caller or expired(s, now);
      })
      .map<(Nat, VideoTypes.VideoUploadSession), Nat>(func((id, _)) = id)
      .toArray();
    for (id in stale.vals()) {
      ignore videoUploadSessions.delete(id);
    };
  };

  /// Begin a chunked video upload. Returns the upload session id.
  /// Rate limited: 2 video uploads per 10 minutes per principal.
  public shared ({ caller }) func beginVideoUpload(
    contentType : Text,
    totalSize : Nat,
  ) : async Nat {
    AccessControl.requireAuthenticated(caller);
    RateLimit.trapIfLimited(
      rateLimits.videoUpload,
      caller,
      "Video upload limit reached (2 per 10 minutes). Please try again later.",
    );
    if (extensionFor(contentType) == null) {
      Runtime.trap("Unsupported video format: use mp4, webm, or mov");
    };
    if (totalSize == 0 or totalSize > MAX_VIDEO_BYTES) {
      Runtime.trap("Videos must be under 50MB (~60 seconds)");
    };
    let now = Time.now();
    reapSessions(caller, now);
    let id = nextVideoUploadId.value;
    nextVideoUploadId.value += 1;
    videoUploadSessions.add(id, {
      owner = caller;
      contentType;
      totalSize;
      startedAt = now;
      chunks = Map.empty<Nat, Blob>();
      var receivedBytes = 0;
    });
    id;
  };

  func requireSession(
    uploadId : Nat,
    caller : Principal,
  ) : VideoTypes.VideoUploadSession {
    switch (videoUploadSessions.get(uploadId)) {
      case null Runtime.trap("Upload session not found or expired");
      case (?session) {
        if (session.owner != caller) {
          Runtime.trap("Unauthorized: not your upload session");
        };
        if (expired(session, Time.now())) {
          ignore videoUploadSessions.delete(uploadId);
          Runtime.trap("Upload session expired — start again");
        };
        session;
      };
    };
  };

  /// Upload one chunk (0-based index, ≤1.9MB each).
  public shared ({ caller }) func uploadVideoChunk(
    uploadId : Nat,
    chunkIndex : Nat,
    data : Blob,
  ) : async () {
    AccessControl.requireAuthenticated(caller);
    let session = requireSession(uploadId, caller);
    let size = data.size();
    if (size == 0 or size > MAX_CHUNK_BYTES) {
      Runtime.trap("Invalid chunk size (max 1.9MB)");
    };
    switch (session.chunks.get(chunkIndex)) {
      case (?prev) { session.receivedBytes -= prev.size() };
      case null {};
    };
    if (session.receivedBytes + size > session.totalSize) {
      Runtime.trap("Upload exceeds declared size");
    };
    session.chunks.add(chunkIndex, data);
    session.receivedBytes += size;
  };

  /// Finalize: assemble chunks, forward to the uploads asset canister, and
  /// return the stored keys. `poster` is an optional first-frame JPEG
  /// (≤1MB) captured client-side, stored alongside the video.
  public shared ({ caller }) func finishVideoUpload(
    uploadId : Nat,
    poster : ?Blob,
  ) : async VideoTypes.FinishVideoUploadResult {
    AccessControl.requireAuthenticated(caller);
    let session = requireSession(uploadId, caller);
    if (session.receivedBytes != session.totalSize) {
      Runtime.trap(
        "Upload incomplete: received " # Nat.toText(session.receivedBytes)
        # " of " # Nat.toText(session.totalSize) # " bytes",
      );
    };
    let chunkCount = session.chunks.size();
    let ordered = Array.tabulate<Blob>(chunkCount, func i {
      switch (session.chunks.get(i)) {
        case (?chunk) chunk;
        case null Runtime.trap("Missing chunk " # Nat.toText(i));
      };
    });

    let ext = switch (extensionFor(session.contentType)) {
      case (?e) e;
      case null Runtime.trap("Unsupported video format");
    };
    let stamp = Nat.toText(Int.abs(Time.now()));
    let base = "community-videos/" # Principal.toText(caller) # "/" # stamp;
    let videoKey = base # "." # ext;

    // Mark intent before awaiting: remove the session so a concurrent
    // finish/chunk call can't race this one. Restored on failure.
    ignore videoUploadSessions.delete(uploadId);
    try {
      await AssetUpload.storeBlobChunksToUploadsCanister(
        uploadsCanisterPrincipal(),
        videoKey,
        ordered,
        session.contentType,
      );
    } catch (e) {
      // COMPENSATION: re-register the session so the caller can retry finish.
      videoUploadSessions.add(uploadId, session);
      throw e;
    };

    var posterKey : ?Text = null;
    switch (poster) {
      case null {};
      case (?p) {
        if (p.size() > 0 and p.size() <= MAX_POSTER_BYTES) {
          let key = base # "-poster.jpg";
          try {
            await AssetUpload.storeToUploadsCanister(
              uploadsCanisterPrincipal(),
              key,
              Blob.toArray(p),
              "image/jpeg",
            );
            posterKey := ?key;
          } catch (_) {
            // Poster is best-effort — the video itself is already stored.
          };
        };
      };
    };

    { videoKey; posterKey };
  };

  /// Abort an in-flight upload and free its buffered chunks.
  public shared ({ caller }) func cancelVideoUpload(uploadId : Nat) : async () {
    AccessControl.requireAuthenticated(caller);
    switch (videoUploadSessions.get(uploadId)) {
      case null {};
      case (?session) {
        if (session.owner == caller) {
          ignore videoUploadSessions.delete(uploadId);
        };
      };
    };
  };
};
