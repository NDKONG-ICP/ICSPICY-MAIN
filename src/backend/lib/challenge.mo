// lib/challenge.mo — special challenge groups (Winter Grow Challenge).

import Array "mo:core/Array";
import Int "mo:core/Int";
import Iter "mo:core/Iter";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Set "mo:core/Set";
import Text "mo:core/Text";
import AccessControl "../lib/access-control";
import Common "../types/common";
import CommunityLib "../lib/community";
import CommunityTypes "../types/community";
import Types "../types/challenge";
import Sanitize "../lib/sanitize";

module {
  public type Store = {
    challenges : Map.Map<Types.ChallengeId, Types.Challenge>;
    members : Map.Map<Text, Types.ChallengeMember>;
    suspended : Map.Map<Text, Bool>;
    /// postId → challengeId (scoped out of global Community Garden feeds).
    scopedPosts : Map.Map<Common.PostId, Types.ChallengeId>;
    /// challengeId → newest-first post ids (capped).
    feedIndex : Map.Map<Types.ChallengeId, [Common.PostId]>;
    metrics : Map.Map<Text, Types.ChallengeMetrics>;
  };

  public func empty() : Store {
    {
      challenges = Map.empty<Types.ChallengeId, Types.Challenge>();
      members = Map.empty<Text, Types.ChallengeMember>();
      suspended = Map.empty<Text, Bool>();
      scopedPosts = Map.empty<Common.PostId, Types.ChallengeId>();
      feedIndex = Map.empty<Types.ChallengeId, [Common.PostId]>();
      metrics = Map.empty<Text, Types.ChallengeMetrics>();
    };
  };

  // Oct 15, 2026 23:59:59.999 America/New_York (EDT = UTC-4) → nanos.
  let WINTER_GROW_REG_CLOSE : Int = 1_792_123_199_999_000_000;
  // Nov 1, 2026 00:00:00 America/New_York (EDT) → nanos.
  let WINTER_GROW_GERMINATE : Int = 1_793_505_600_000_000_000;

  let MAX_FEED_INDEX : Nat = 500;
  let MAX_METRIC_NOTE : Nat = 500;
  let MAX_METRIC_PHOTOS : Nat = 4;
  let MAX_PEPPER_COUNT : Nat = 100_000;
  let MAX_LARGEST_MM : Nat = 5000;
  let MAX_WEIGHT_G : Nat = 1_000_000;
  let MAX_HEIGHT_CM : Nat = 1000;

  public let WINTER_GROW_ID : Types.ChallengeId = "winter-grow";

  func memberKey(challengeId : Types.ChallengeId, who : Principal) : Text {
    challengeId # "|" # who.toText();
  };

  public func isScopedPost(
    store : Store,
    postId : Common.PostId,
  ) : Bool {
    store.scopedPosts.get(postId) != null;
  };

  public func seedWinterGrowIfMissing(store : Store, now : Int) {
    let title = "Winter Grow Challenge";
    let tagline = "Real growers. Real rewards.";
    let seedSponsor = "Plant Some Kindness";
    let prizeSponsor = "IC SPICY";
    let rulesSummary = "Same variety · same start date (Nov 1) · one plant per grower. Seeds sponsored by Plant Some Kindness. Categories: most peppers, largest pepper, total weight, largest plant. Official photos & weights recorded on IC SPICY. Crypto prize amounts TBD — prize pool coming. Hosted by Bobby Peppers.";
    switch (store.challenges.get(WINTER_GROW_ID)) {
      case (?existing) {
        // Refresh public copy without wiping membership / dates.
        store.challenges.add(
          WINTER_GROW_ID,
          {
            id = existing.id;
            title;
            tagline;
            seedSponsor;
            prizeSponsor;
            registrationClosesAt = existing.registrationClosesAt;
            germinateAt = existing.germinateAt;
            status = existing.status;
            rulesSummary;
            created_at = existing.created_at;
          },
        );
      };
      case null {
        store.challenges.add(
          WINTER_GROW_ID,
          {
            id = WINTER_GROW_ID;
            title;
            tagline;
            seedSponsor;
            prizeSponsor;
            registrationClosesAt = WINTER_GROW_REG_CLOSE;
            germinateAt = WINTER_GROW_GERMINATE;
            status = #open;
            rulesSummary;
            created_at = now;
          },
        );
      };
    };
  };

  func registrationOpen(ch : Types.Challenge, now : Int) : Bool {
    switch (ch.status) {
      case (#open) { now <= ch.registrationClosesAt };
      case (#closed) { false };
      case (#archived) { false };
    };
  };

  func toPublic(ch : Types.Challenge, memberCount : Nat, now : Int) : Types.ChallengePublic {
    {
      id = ch.id;
      title = ch.title;
      tagline = ch.tagline;
      seedSponsor = ch.seedSponsor;
      prizeSponsor = ch.prizeSponsor;
      registrationClosesAt = ch.registrationClosesAt;
      germinateAt = ch.germinateAt;
      status = ch.status;
      rulesSummary = ch.rulesSummary;
      memberCount;
      registrationOpen = registrationOpen(ch, now);
      created_at = ch.created_at;
    };
  };

  func countMembers(store : Store, challengeId : Types.ChallengeId) : Nat {
    var n : Nat = 0;
    for ((_, m) in store.members.entries()) {
      if (m.challengeId == challengeId) { n += 1 };
    };
    n;
  };

  public func getChallenge(
    store : Store,
    challengeId : Types.ChallengeId,
    now : Int,
  ) : ?Types.ChallengePublic {
    seedWinterGrowIfMissing(store, now);
    switch (store.challenges.get(challengeId)) {
      case null { null };
      case (?ch) { ?toPublic(ch, countMembers(store, challengeId), now) };
    };
  };

  public func listChallenges(store : Store, now : Int) : [Types.ChallengePublic] {
    seedWinterGrowIfMissing(store, now);
    Iter.toArray(
      store.challenges.values().map(func(ch : Types.Challenge) : Types.ChallengePublic {
        toPublic(ch, countMembers(store, ch.id), now);
      }),
    );
  };

  public func getMembership(
    store : Store,
    challengeId : Types.ChallengeId,
    who : Principal,
  ) : ?Types.ChallengeMember {
    store.members.get(memberKey(challengeId, who));
  };

  public func isSuspended(
    store : Store,
    challengeId : Types.ChallengeId,
    who : Principal,
  ) : Bool {
    switch (store.suspended.get(memberKey(challengeId, who))) {
      case (?true) { true };
      case _ { false };
    };
  };

  public func requireActiveMember(
    store : Store,
    challengeId : Types.ChallengeId,
    who : Principal,
  ) {
    switch (getMembership(store, challengeId, who)) {
      case null { Runtime.trap("Join the challenge first") };
      case (?_) {
        if (isSuspended(store, challengeId, who)) {
          Runtime.trap("Membership suspended");
        };
      };
    };
  };

  public func join(
    store : Store,
    profiles : Map.Map<Principal, CommunityTypes.UserProfile>,
    caller : Principal,
    input : Types.JoinChallengeInput,
    now : Int,
  ) : Types.ChallengeMemberPublic {
    CommunityLib.requireProfile(profiles, caller);
    seedWinterGrowIfMissing(store, now);
    let ch = switch (store.challenges.get(input.challengeId)) {
      case null { Runtime.trap("Unknown challenge") };
      case (?c) { c };
    };
    if (not registrationOpen(ch, now)) {
      Runtime.trap("Registration closed");
    };
    if (not input.agreedRules or not input.indoorOnly or not input.onePlant) {
      Runtime.trap("Must agree to indoor-only, one-plant, and challenge rules");
    };
    let key = memberKey(input.challengeId, caller);
    switch (store.members.get(key)) {
      case (?existing) {
        return memberToPublic(store, profiles, existing);
      };
      case null {};
    };
    let member : Types.ChallengeMember = {
      challengeId = input.challengeId;
      principal = caller;
      role = #contestant;
      enteredAt = now;
      agreedRules = true;
      indoorOnly = true;
      onePlant = true;
    };
    store.members.add(key, member);
    memberToPublic(store, profiles, member);
  };

  func memberToPublic(
    store : Store,
    profiles : Map.Map<Principal, CommunityTypes.UserProfile>,
    m : Types.ChallengeMember,
  ) : Types.ChallengeMemberPublic {
    let username = switch (profiles.get(m.principal)) {
      case (?p) if (p.username != "") ?p.username else null;
      case null null;
    };
    {
      challengeId = m.challengeId;
      principal = m.principal;
      username;
      role = m.role;
      enteredAt = m.enteredAt;
      suspended = isSuspended(store, m.challengeId, m.principal);
    };
  };

  public func listMembers(
    store : Store,
    profiles : Map.Map<Principal, CommunityTypes.UserProfile>,
    challengeId : Types.ChallengeId,
    offset : Nat,
    limit : Nat,
  ) : [Types.ChallengeMemberPublic] {
    var arr : [Types.ChallengeMemberPublic] = [];
    for ((_, m) in store.members.entries()) {
      if (m.challengeId == challengeId) {
        arr := Array.concat(arr, [memberToPublic(store, profiles, m)]);
      };
    };
    ignore arr.sort(func(a : Types.ChallengeMemberPublic, b : Types.ChallengeMemberPublic) : {
      #less;
      #equal;
      #greater;
    } {
      Int.compare(a.enteredAt, b.enteredAt);
    });
    let size = arr.size();
    if (offset >= size) return [];
    let end = Nat.min(size, offset + Nat.min(limit, 100));
    Array.tabulate<Types.ChallengeMemberPublic>(end - offset, func(i : Nat) {
      arr[offset + i];
    });
  };

  public func myMembership(
    store : Store,
    profiles : Map.Map<Principal, CommunityTypes.UserProfile>,
    challengeId : Types.ChallengeId,
    caller : Principal,
  ) : ?Types.ChallengeMemberPublic {
    switch (getMembership(store, challengeId, caller)) {
      case null { null };
      case (?m) { ?memberToPublic(store, profiles, m) };
    };
  };

  func pushFeed(store : Store, challengeId : Types.ChallengeId, postId : Common.PostId) {
    let prev = switch (store.feedIndex.get(challengeId)) {
      case (?ids) { ids };
      case null { [] };
    };
    var next = Array.concat([postId], prev);
    if (next.size() > MAX_FEED_INDEX) {
      next := Array.tabulate<Common.PostId>(MAX_FEED_INDEX, func(i : Nat) { next[i] });
    };
    store.feedIndex.add(challengeId, next);
  };

  public func createChallengePost(
    store : Store,
    posts : Map.Map<Common.PostId, CommunityTypes.Post>,
    profiles : Map.Map<Principal, CommunityTypes.UserProfile>,
    bannedUsers : Set.Set<Principal>,
    nextPostId : { var value : Nat },
    challengeId : Types.ChallengeId,
    caller : Principal,
    input : CommunityTypes.CreatePostInput,
    now : Int,
  ) : CommunityTypes.PostPublic {
    seedWinterGrowIfMissing(store, now);
    switch (store.challenges.get(challengeId)) {
      case null { Runtime.trap("Unknown challenge") };
      case (?_) {};
    };
    requireActiveMember(store, challengeId, caller);
    let post = CommunityLib.createPost(
      posts, profiles, bannedUsers, nextPostId.value, caller, input,
    );
    nextPostId.value += 1;
    store.scopedPosts.add(post.id, challengeId);
    pushFeed(store, challengeId, post.id);
    post;
  };

  public func getChallengeFeed(
    store : Store,
    posts : Map.Map<Common.PostId, CommunityTypes.Post>,
    comments : Map.Map<Common.CommentId, CommunityTypes.Comment>,
    tips : Map.Map<Nat, CommunityTypes.Tip>,
    profiles : Map.Map<Principal, CommunityTypes.UserProfile>,
    _bannedUsers : Set.Set<Principal>,
    challengeId : Types.ChallengeId,
    caller : Principal,
    offset : Nat,
    limit : Nat,
  ) : [CommunityTypes.PostPublic] {
    let ids = switch (store.feedIndex.get(challengeId)) {
      case (?v) { v };
      case null { [] };
    };
    let size = ids.size();
    if (offset >= size) return [];
    let end = Nat.min(size, offset + Nat.min(limit, 50));
    var out : [CommunityTypes.PostPublic] = [];
    var i = offset;
    while (i < end) {
      let postId = ids[i];
      switch (posts.get(postId)) {
        case (?post) {
          if (not post.is_deleted) {
            let ccount = CommunityLib.countCommentsForPost(comments, postId);
            let tcount = CommunityLib.countTipsForPost(tips, postId);
            let username = switch (profiles.get(post.author)) {
              case (?p) if (p.username != "") ?p.username else null;
              case null null;
            };
            out := Array.concat(
              out,
              [
                CommunityLib.postToPublic(
                  post, caller, ccount, tcount, username, false,
                ),
              ],
            );
          };
        };
        case null {};
      };
      i += 1;
    };
    out;
  };

  public func submitMetrics(
    store : Store,
    profiles : Map.Map<Principal, CommunityTypes.UserProfile>,
    caller : Principal,
    input : Types.SubmitMetricsInput,
    now : Int,
  ) : Types.ChallengeMetricsPublic {
    seedWinterGrowIfMissing(store, now);
    requireActiveMember(store, input.challengeId, caller);
    if (input.pepperCount > MAX_PEPPER_COUNT) {
      Runtime.trap("pepperCount too large");
    };
    if (input.largestPepperMm > MAX_LARGEST_MM) {
      Runtime.trap("largestPepperMm too large");
    };
    if (input.totalWeightG > MAX_WEIGHT_G) {
      Runtime.trap("totalWeightG too large");
    };
    if (input.plantHeightCm > MAX_HEIGHT_CM) {
      Runtime.trap("plantHeightCm too large");
    };
    if (input.photoKeys.size() > MAX_METRIC_PHOTOS) {
      Runtime.trap("Too many photos (max 4)");
    };
    let note = Sanitize.sanitizeText(input.note, MAX_METRIC_NOTE);
    let key = memberKey(input.challengeId, caller);
    let prev = store.metrics.get(key);
    // Best-submitted: keep the max of each category across updates.
    let pepperCount = switch (prev) {
      case (?p) { Nat.max(p.pepperCount, input.pepperCount) };
      case null { input.pepperCount };
    };
    let largestPepperMm = switch (prev) {
      case (?p) { Nat.max(p.largestPepperMm, input.largestPepperMm) };
      case null { input.largestPepperMm };
    };
    let totalWeightG = switch (prev) {
      case (?p) { Nat.max(p.totalWeightG, input.totalWeightG) };
      case null { input.totalWeightG };
    };
    let plantHeightCm = switch (prev) {
      case (?p) { Nat.max(p.plantHeightCm, input.plantHeightCm) };
      case null { input.plantHeightCm };
    };
    let row : Types.ChallengeMetrics = {
      challengeId = input.challengeId;
      principal = caller;
      pepperCount;
      largestPepperMm;
      totalWeightG;
      plantHeightCm;
      photoKeys = input.photoKeys;
      note;
      updatedAt = now;
    };
    store.metrics.add(key, row);
    metricsToPublic(profiles, row);
  };

  func metricsToPublic(
    profiles : Map.Map<Principal, CommunityTypes.UserProfile>,
    row : Types.ChallengeMetrics,
  ) : Types.ChallengeMetricsPublic {
    let username = switch (profiles.get(row.principal)) {
      case (?p) if (p.username != "") ?p.username else null;
      case null null;
    };
    {
      challengeId = row.challengeId;
      principal = row.principal;
      username;
      pepperCount = row.pepperCount;
      largestPepperMm = row.largestPepperMm;
      totalWeightG = row.totalWeightG;
      plantHeightCm = row.plantHeightCm;
      photoKeys = row.photoKeys;
      note = row.note;
      updatedAt = row.updatedAt;
    };
  };

  public func getMyMetrics(
    store : Store,
    profiles : Map.Map<Principal, CommunityTypes.UserProfile>,
    challengeId : Types.ChallengeId,
    caller : Principal,
  ) : ?Types.ChallengeMetricsPublic {
    switch (store.metrics.get(memberKey(challengeId, caller))) {
      case null { null };
      case (?row) { ?metricsToPublic(profiles, row) };
    };
  };

  func categoryValue(row : Types.ChallengeMetrics, cat : Types.CompeteCategory) : Nat {
    switch (cat) {
      case (#mostPeppers) { row.pepperCount };
      case (#largestPepper) { row.largestPepperMm };
      case (#totalWeight) { row.totalWeightG };
      case (#largestPlant) { row.plantHeightCm };
    };
  };

  public func getLeaderboard(
    store : Store,
    profiles : Map.Map<Principal, CommunityTypes.UserProfile>,
    challengeId : Types.ChallengeId,
    category : Types.CompeteCategory,
    limit : Nat,
  ) : [Types.ChallengeLeaderboardEntry] {
    var arr : [Types.ChallengeLeaderboardEntry] = [];
    for ((_, row) in store.metrics.entries()) {
      if (row.challengeId == challengeId and not isSuspended(store, challengeId, row.principal)) {
        let value = categoryValue(row, category);
        if (value > 0) {
          let username = switch (profiles.get(row.principal)) {
            case (?p) if (p.username != "") ?p.username else null;
            case null null;
          };
          arr := Array.concat(
            arr,
            [{
              principal = row.principal;
              username;
              value;
              photoKeys = row.photoKeys;
              updatedAt = row.updatedAt;
            }],
          );
        };
      };
    };
    ignore arr.sort(func(a : Types.ChallengeLeaderboardEntry, b : Types.ChallengeLeaderboardEntry) : {
      #less;
      #equal;
      #greater;
    } {
      switch (Nat.compare(b.value, a.value)) {
        case (#equal) { Int.compare(a.updatedAt, b.updatedAt) };
        case (c) { c };
      };
    });
    let cap = Nat.min(limit, 100);
    if (arr.size() <= cap) { arr } else {
      Array.tabulate<Types.ChallengeLeaderboardEntry>(cap, func(i : Nat) { arr[i] });
    };
  };

  public func adminSetMemberRole(
    store : Store,
    challengeId : Types.ChallengeId,
    target : Principal,
    role : Types.ChallengeRole,
  ) {
    let key = memberKey(challengeId, target);
    switch (store.members.get(key)) {
      case null { Runtime.trap("Not a member") };
      case (?m) {
        store.members.add(key, {
          challengeId = m.challengeId;
          principal = m.principal;
          role;
          enteredAt = m.enteredAt;
          agreedRules = m.agreedRules;
          indoorOnly = m.indoorOnly;
          onePlant = m.onePlant;
        });
      };
    };
  };

  public func adminSetSuspended(
    store : Store,
    challengeId : Types.ChallengeId,
    target : Principal,
    suspended : Bool,
  ) {
    let key = memberKey(challengeId, target);
    if (store.members.get(key) == null) {
      Runtime.trap("Not a member");
    };
    if (suspended) {
      store.suspended.add(key, true);
    } else {
      ignore store.suspended.delete(key);
    };
  };

  public func isModeratorOrAdmin(
    store : Store,
    accessControlState : AccessControl.AccessControlState,
    challengeId : Types.ChallengeId,
    caller : Principal,
  ) : Bool {
    if (AccessControl.isAdmin(accessControlState, caller)) { return true };
    switch (getMembership(store, challengeId, caller)) {
      case (?m) {
        switch (m.role) {
          case (#moderator) { true };
          case (#sponsor) { true };
          case (#contestant) { false };
        };
      };
      case null { false };
    };
  };
};
