/// Public profile pages (/u/:principal) — banner, Top 8 friends, and a
/// composed one-shot profile query. Additive side maps only; no changes to
/// the stable UserProfile record.
import Map "mo:core/Map";
import Set "mo:core/Set";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";

import AccessControl "../lib/access-control";
import AssetUpload "../lib/asset-upload";
import CommunityLib "../lib/community";
import CommunityTypes "../types/community";
import Common "../types/common";
import ICRC7Lib "../lib/icrc7";
import PlantTypes "../types/plants";
import PlantsLib "../lib/plants";
import ProfilePageTypes "../types/profile-page";
import RateLimit "../lib/rate-limit";
import RateLimits "../lib/rate-limits";

mixin (
  accessControlState : AccessControl.AccessControlState,
  rateLimits : RateLimits.Bundle,
  profiles : Map.Map<Principal, CommunityTypes.UserProfile>,
  posts : Map.Map<Common.PostId, CommunityTypes.Post>,
  profileBanners : Map.Map<Principal, Text>,
  profileWallpapers : Map.Map<Principal, Text>,
  profileTop8 : Map.Map<Principal, [Principal]>,
  icrc7Balances : Map.Map<Principal, Set.Set<Nat>>,
  ravenBalanceCache : Map.Map<Principal, Nat>,
  linkedWallets : Map.Map<Principal, [Principal]>,
  plants : Map.Map<Common.PlantId, PlantTypes.Plant>,
  uploadsCanisterPrincipal : () -> ?Principal,
) {

  let MAX_BANNER_BYTES : Nat = 2_000_000; // 2 MB (1500×500 target, JPEG)
  let MAX_WALLPAPER_BYTES : Nat = 2_000_000;
  let PRESET_PREFIX : Text = "preset:";
  let IMG_PREFIX : Text = "img:";
  // Mirrors marketplace-order.mo ravenDiscountPercent threshold (100K RAVEN, 8 decimals).
  let RAVEN_MEMBER_THRESHOLD : Nat = 100_000 * 100_000_000;

  // ── Banner ──────────────────────────────────────────────────────────────────

  /// Upload a profile banner (≤2 MB JPEG) to the uploads canister and set it
  /// as the caller's banner in one call. Returns the storage key.
  public shared ({ caller }) func storeProfileBannerFile(data : [Nat8]) : async Text {
    AccessControl.requireAuthenticated(caller);
    RateLimit.trapIfLimited(rateLimits.upload, caller, "Rate limited. Try again in a minute.");
    if (data.size() > MAX_BANNER_BYTES) {
      Runtime.trap("File too large (max 2 MB)");
    };
    let key = "banners/" # Principal.toText(caller) # "-" # Nat.toText(Int.abs(Time.now())) # ".jpg";
    await AssetUpload.storeToUploadsCanister(
      uploadsCanisterPrincipal(),
      key,
      data,
      "image/jpeg",
    );
    profileBanners.add(caller, key);
    key;
  };

  /// Set (or clear with "") the caller's banner key. The key must be one of
  /// the caller's own uploaded banners — prevents pointing at another user's.
  public shared ({ caller }) func setProfileBanner(key : Text) : async () {
    AccessControl.requireAuthenticated(caller);
    if (key == "") {
      ignore profileBanners.delete(caller);
      return;
    };
    let requiredPrefix = "banners/" # Principal.toText(caller) # "-";
    if (not Text.startsWith(key, #text requiredPrefix)) {
      Runtime.trap("Invalid banner key: must be an own uploaded banner");
    };
    profileBanners.add(caller, key);
  };

  // ── Wallpaper (preset CSS key or custom image) ──────────────────────────────

  func isAllowedPreset(name : Text) : Bool {
    name == "ember"
      or name == "soil"
      or name == "greenhouse"
      or name == "scoville"
      or name == "midnight"
      or name == "harvest"
      or name == "ghost"
      or name == "reaper";
  };

  func validateWallpaperValue(caller : Principal, value : Text) : Bool {
    if (value.size() > 200) return false;
    if (Text.startsWith(value, #text PRESET_PREFIX)) {
      let name = switch (Text.stripStart(value, #text PRESET_PREFIX)) {
        case (?n) n;
        case null return false;
      };
      return isAllowedPreset(name);
    };
    if (Text.startsWith(value, #text IMG_PREFIX)) {
      let path = switch (Text.stripStart(value, #text IMG_PREFIX)) {
        case (?p) p;
        case null return false;
      };
      let requiredPrefix = "profile-wallpapers/" # Principal.toText(caller) # "-";
      return Text.startsWith(path, #text requiredPrefix);
    };
    false;
  };

  /// Upload a custom profile wallpaper (≤2 MB JPEG). Sets img:… value automatically.
  public shared ({ caller }) func storeProfileWallpaperFile(data : [Nat8]) : async Text {
    AccessControl.requireAuthenticated(caller);
    RateLimit.trapIfLimited(rateLimits.upload, caller, "Rate limited. Try again in a minute.");
    if (data.size() > MAX_WALLPAPER_BYTES) {
      Runtime.trap("File too large (max 2 MB)");
    };
    let path = "profile-wallpapers/" # Principal.toText(caller) # "-" # Nat.toText(Int.abs(Time.now())) # ".jpg";
    await AssetUpload.storeToUploadsCanister(
      uploadsCanisterPrincipal(),
      path,
      data,
      "image/jpeg",
    );
    let value = IMG_PREFIX # path;
    profileWallpapers.add(caller, value);
    value;
  };

  /// Set preset:slug or img:profile-wallpapers/… wallpaper. Clear with "".
  public shared ({ caller }) func setProfileWallpaper(value : Text) : async () {
    AccessControl.requireAuthenticated(caller);
    if (value == "") {
      ignore profileWallpapers.delete(caller);
      return;
    };
    if (not validateWallpaperValue(caller, value)) {
      Runtime.trap("Invalid wallpaper value");
    };
    profileWallpapers.add(caller, value);
  };

  // ── Top 8 ───────────────────────────────────────────────────────────────────

  /// Set the caller's curated Top 8 friends (MySpace style). Max 8, each must
  /// be a principal the caller currently follows. Duplicates and self are rejected.
  public shared ({ caller }) func setTop8(friends : [Principal]) : async () {
    AccessControl.requireAuthenticated(caller);
    if (friends.size() > 8) {
      Runtime.trap("Top 8 can hold at most 8 friends");
    };
    let profile = switch (profiles.get(caller)) {
      case (?p) p;
      case null Runtime.trap("Create a profile first");
    };
    let seen = Set.empty<Principal>();
    for (friend in friends.vals()) {
      if (friend == caller) {
        Runtime.trap("Cannot add yourself to your Top 8");
      };
      if (friend.isAnonymous()) {
        Runtime.trap("Invalid principal in Top 8");
      };
      if (seen.contains(friend)) {
        Runtime.trap("Duplicate principal in Top 8");
      };
      if (not profile.follows.contains(friend)) {
        Runtime.trap("Top 8 members must be people you follow");
      };
      seen.add(friend);
    };
    if (friends.size() == 0) {
      ignore profileTop8.delete(caller);
    } else {
      profileTop8.add(caller, friends);
    };
  };

  // ── Composed public profile ─────────────────────────────────────────────────

  func hasRavenBadge(user : Principal) : Bool {
    let check = func(p : Principal) : Bool {
      switch (ravenBalanceCache.get(p)) {
        case (?bal) bal >= RAVEN_MEMBER_THRESHOLD;
        case null false;
      };
    };
    if (check(user)) return true;
    switch (linkedWallets.get(user)) {
      case (?wallets) {
        for (wallet in wallets.vals()) {
          if (check(wallet)) return true;
        };
        false;
      };
      case null false;
    };
  };

  func nftStats(user : Principal) : (Nat, Bool) {
    switch (icrc7Balances.get(user)) {
      case (?tokens) {
        var pepperhead = false;
        for (tokenId in tokens.values()) {
          if (ICRC7Lib.isPepperHead(tokenId)) { pepperhead := true };
        };
        (tokens.size(), pepperhead);
      };
      case null (0, false);
    };
  };

  func countPlantsGrowing(user : Principal) : Nat {
    plants.values()
      .filter(func(p : PlantTypes.Plant) : Bool {
        p.created_by == user and not p.sold and not p.is_cooked
      })
      .size();
  };

  /// One-shot query powering /u/:principal — profile, banner, Top 8 (with
  /// usernames + avatars), NFT count, badges, and growing-plant count.
  public query ({ caller }) func getPublicProfileFull(
    user : Principal,
  ) : async ?ProfilePageTypes.PublicProfileFull {
    switch (CommunityLib.getPublicProfile(profiles, posts, accessControlState, user, caller)) {
      case null null;
      case (?profilePublic) {
        let top8Raw = switch (profileTop8.get(user)) {
          case (?list) list;
          case null [];
        };
        let top8 = top8Raw.filterMap<Principal, ProfilePageTypes.Top8Entry>(
          func(friend : Principal) : ?ProfilePageTypes.Top8Entry {
            switch (profiles.get(friend)) {
              case (?fp) ?{
                principal_id = friend;
                username = fp.username;
                avatar_key = fp.avatar_key;
              };
              case null null;
            };
          },
        );
        let (nftCount, isPepperhead) = nftStats(user);
        ?{
          profile = profilePublic;
          banner_key = profileBanners.get(user);
          wallpaper_key = profileWallpapers.get(user);
          top8 = top8;
          nft_count = nftCount;
          is_pepperhead = isPepperhead;
          is_raven = hasRavenBadge(user);
          plants_growing = countPlantsGrowing(user);
        };
      };
    };
  };

  /// Exact (case-insensitive) username → principal resolution for
  /// /u/:username URLs. Returns null when no profile matches.
  public query func resolveUsername(username : Text) : async ?Principal {
    let needle = username.trim(#char ' ').toLower();
    if (needle == "") return null;
    for (profile in profiles.values()) {
      if (profile.username != "" and profile.username.toLower() == needle) {
        return ?profile.principal_id;
      };
    };
    null;
  };

  /// Public plants list for the profile page Plants tab — a user's active
  /// (not sold, not culled) plants, newest planting first.
  public query func getUserPlantsPublic(
    user : Principal,
    offset : Nat,
    limit : Nat,
  ) : async [PlantTypes.PlantPublic] {
    let all = plants.values()
      .filter(func(p : PlantTypes.Plant) : Bool {
        p.created_by == user and not p.sold and not p.is_cooked
      })
      .map(PlantsLib.toPublic)
      .toArray();
    let sorted = all.sort(func(a : PlantTypes.PlantPublic, b : PlantTypes.PlantPublic) : { #less; #equal; #greater } {
      Int.compare(b.planting_date, a.planting_date)
    });
    let size = sorted.size();
    if (offset >= size) return [];
    let end = Nat.min(size, offset + limit);
    Array.tabulate<PlantTypes.PlantPublic>(end - offset, func(i : Nat) : PlantTypes.PlantPublic {
      sorted[offset + i]
    });
  };
};
