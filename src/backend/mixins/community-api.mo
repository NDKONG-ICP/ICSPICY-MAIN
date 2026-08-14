import Map "mo:core/Map";
import Set "mo:core/Set";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Iter "mo:core/Iter";
import AccessControl "../lib/access-control";
import AuditLog "../lib/audit-log";
import Common "../types/common";
import CommunityTypes "../types/community";
import CommunityLib "../lib/community";
import Principal "mo:core/Principal";
import Time "mo:core/Time";

import RateLimits "../lib/rate-limits";
import RateLimit "../lib/rate-limit";
import NotificationsLib "../lib/notifications";

mixin (
  accessControlState : AccessControl.AccessControlState,
  agentPrincipalState : AccessControl.AgentPrincipalState,
  rateLimits : RateLimits.Bundle,
  posts : Map.Map<Common.PostId, CommunityTypes.Post>,
  comments : Map.Map<Common.CommentId, CommunityTypes.Comment>,
  profiles : Map.Map<Principal, CommunityTypes.UserProfile>,
  tips : Map.Map<Nat, CommunityTypes.Tip>,
  bannedUsers : Set.Set<Principal>,
  nextPostId : { var value : Nat },
  nextCommentId : { var value : Nat },
  nextTipId : { var value : Nat },
  auditLog : { var value : AuditLog.AuditLog },
  notifications : NotificationsLib.Inbox,
  nextNotificationId : { var value : Nat },
) {
  // ── Notification emission helpers ──────────────────────────────────────────

  func displayNameOf(user : Principal) : Text {
    switch (profiles.get(user)) {
      case (?p) if (p.username != "") p.username else shortPid(user);
      case null shortPid(user);
    };
  };

  func shortPid(user : Principal) : Text {
    let t = user.toText();
    if (t.size() > 8) { Text.fromIter(t.chars().take(8)) # "…" } else t;
  };

  /// Notify a post's author (never the acting user themself).
  func notifyPostAuthor(
    post_id : Common.PostId,
    kind : { #like; #comment; #tip },
    sender : Principal,
    verb : Text,
  ) {
    switch (posts.get(post_id)) {
      case (?post) {
        if (post.is_deleted) return;
        ignore NotificationsLib.emit(
          notifications, nextNotificationId,
          post.author,
          switch (kind) { case (#like) #like; case (#comment) #comment; case (#tip) #tip },
          ?sender,
          ?Nat.toText(post_id),
          displayNameOf(sender) # " " # verb,
        );
      };
      case null {};
    };
  };

  func notifyAdmins(kind : { #orderPlaced; #newUser }, sender : Principal, refId : ?Text, message : Text) {
    NotificationsLib.emitToAdmins(
      notifications, nextNotificationId,
      AccessControl.listAdmins(accessControlState),
      switch (kind) { case (#orderPlaced) #orderPlaced; case (#newUser) #newUser },
      ?sender, refId, message,
    );
  };
  // ── Posts ───────────────────────────────────────────────────────────────────

  public shared ({ caller }) func createPost(
    input : CommunityTypes.CreatePostInput,
  ) : async CommunityTypes.PostPublic {
    AccessControl.requireAuthenticated(caller);
    RateLimit.trapIfLimited(rateLimits.communityPost, caller, "Rate limited. Try again in a minute.");
    let post = CommunityLib.createPost(
      posts, profiles, bannedUsers, nextPostId.value, caller, input,
    );
    nextPostId.value += 1;
    post;
  };

  public shared ({ caller }) func editPost(
    post_id : Common.PostId,
    new_content : Text,
  ) : async Bool {
    AccessControl.requireAuthenticated(caller);
    CommunityLib.editPost(posts, caller, post_id, new_content);
  };

  public shared ({ caller }) func deletePost(post_id : Common.PostId) : async Bool {
    AccessControl.requireAuthenticated(caller);
    CommunityLib.deletePost(
      posts, caller, post_id,
      AccessControl.isAdmin(accessControlState, caller),
    );
  };

  public shared ({ caller }) func likePost(post_id : Common.PostId) : async Bool {
    AccessControl.requireAuthenticated(caller);
    let nowLiked = CommunityLib.toggleLikePost(posts, profiles, bannedUsers, post_id, caller);
    if (nowLiked) {
      notifyPostAuthor(post_id, #like, caller, "liked your post");
    };
    nowLiked;
  };

  public shared ({ caller }) func unlikePost(post_id : Common.PostId) : async Nat {
    AccessControl.requireAuthenticated(caller);
    CommunityLib.unlikePost(posts, profiles, bannedUsers, post_id, caller);
  };

  public query ({ caller }) func hasLikedPost(post_id : Common.PostId) : async Bool {
    CommunityLib.hasLikedPost(posts, post_id, caller);
  };

  // ── Comments ────────────────────────────────────────────────────────────────

  public shared ({ caller }) func createComment(
    input : CommunityTypes.CreateCommentInput,
  ) : async CommunityTypes.CommentPublic {
    AccessControl.requireAuthenticated(caller);
    RateLimit.trapIfLimited(rateLimits.communityComment, caller, "Rate limited. Try again in a minute.");
    let comment = CommunityLib.createComment(
      comments, posts, profiles, bannedUsers, nextCommentId.value, caller, input,
    );
    nextCommentId.value += 1;
    notifyPostAuthor(input.post_id, #comment, caller, "commented on your post");
    comment;
  };

  public shared ({ caller }) func addComment(
    post_id : Common.PostId,
    content : Text,
    is_anonymous : Bool,
  ) : async CommunityTypes.CommentPublic {
    AccessControl.requireAuthenticated(caller);
    RateLimit.trapIfLimited(rateLimits.communityComment, caller, "Rate limited. Try again in a minute.");
    let comment = CommunityLib.createComment(
      comments, posts, profiles, bannedUsers, nextCommentId.value, caller,
      { post_id; content; anonymous = is_anonymous },
    );
    nextCommentId.value += 1;
    notifyPostAuthor(post_id, #comment, caller, "commented on your post");
    comment;
  };

  public shared ({ caller }) func deleteComment(comment_id : Common.CommentId) : async Bool {
    AccessControl.requireAuthenticated(caller);
    CommunityLib.deleteComment(
      comments, caller, comment_id,
      AccessControl.isAdmin(accessControlState, caller),
    );
  };

  public shared ({ caller }) func likeComment(comment_id : Common.CommentId) : async Bool {
    AccessControl.requireAuthenticated(caller);
    CommunityLib.toggleLikeComment(comments, profiles, bannedUsers, comment_id, caller);
  };

  // ── Follows ─────────────────────────────────────────────────────────────────

  public shared ({ caller }) func followUser(target : Principal) : async Bool {
    AccessControl.requireAuthenticated(caller);
    let nowFollowing = CommunityLib.toggleFollow(profiles, bannedUsers, caller, target);
    if (nowFollowing) {
      ignore NotificationsLib.emit(
        notifications, nextNotificationId,
        target, #follow, ?caller, null,
        displayNameOf(caller) # " followed you",
      );
    };
    nowFollowing;
  };

  public shared ({ caller }) func unfollowUser(target : Principal) : async () {
    AccessControl.requireAuthenticated(caller);
    CommunityLib.unfollowUser(profiles, bannedUsers, caller, target);
  };

  public query ({ caller }) func isFollowing(target : Principal) : async Bool {
    CommunityLib.isFollowing(profiles, caller, target);
  };

  public query ({ caller }) func getFollowers(
    user : Principal,
    offset : Nat,
    limit : Nat,
  ) : async [CommunityTypes.UserProfilePublic] {
    CommunityLib.getFollowers(
      profiles, posts, accessControlState, user, caller, offset, limit,
    );
  };

  public query ({ caller }) func getFollowing(
    user : Principal,
    offset : Nat,
    limit : Nat,
  ) : async [CommunityTypes.UserProfilePublic] {
    CommunityLib.getFollowing(
      profiles, posts, accessControlState, user, caller, offset, limit,
    );
  };

  // ── Tips ────────────────────────────────────────────────────────────────────

  public shared ({ caller }) func recordTip(
    input : CommunityTypes.RecordTipInput,
  ) : async Bool {
    AccessControl.requireAuthenticated(caller);
    let ok = CommunityLib.recordTip(
      tips, posts, profiles, nextTipId.value, caller, input,
    );
    if (ok) {
      nextTipId.value += 1;
      auditLog.value := AuditLog.append(auditLog.value, {
        ts = Time.now();
        admin = caller;
        action = "community_tip";
        detail = "post=" # Nat.toText(input.post_id)
          # " amount=" # Nat.toText(input.amount)
          # " block=" # Nat.toText(input.block_index);
      });
      notifyPostAuthor(input.post_id, #tip, caller, "tipped your post");
    };
    ok;
  };

  // ── Profiles ────────────────────────────────────────────────────────────────

  func profileExisted(user : Principal) : Bool {
    switch (profiles.get(user)) {
      case null false;
      case (?_) true;
    };
  };

  func notifyIfNewProfile(caller : Principal, wasNew : Bool) {
    if (wasNew) {
      notifyAdmins(
        #newUser, caller, ?caller.toText(),
        "New grower joined: " # displayNameOf(caller),
      );
    };
  };

  public shared ({ caller }) func saveCallerUserProfile(
    input : CommunityTypes.SaveProfileInput,
  ) : async Bool {
    AccessControl.requireAuthenticated(caller);
    let wasNew = not profileExisted(caller);
    let ok = CommunityLib.saveProfile(profiles, caller, input);
    notifyIfNewProfile(caller, wasNew);
    ok;
  };

  public shared ({ caller }) func saveProfile(
    input : CommunityTypes.SaveProfileInput,
  ) : async Bool {
    AccessControl.requireAuthenticated(caller);
    let wasNew = not profileExisted(caller);
    let ok = CommunityLib.saveProfile(profiles, caller, input);
    notifyIfNewProfile(caller, wasNew);
    ok;
  };

  public shared ({ caller }) func ensureCallerProfile() : async () {
    AccessControl.requireAuthenticated(caller);
    let wasNew = not profileExisted(caller);
    CommunityLib.ensureCallerProfile(profiles, caller);
    notifyIfNewProfile(caller, wasNew);
  };

  public query ({ caller }) func getCallerUserProfile() : async ?CommunityTypes.UserProfilePublic {
    CommunityLib.getCallerUserProfile(profiles, posts, accessControlState, caller);
  };

  public query ({ caller }) func getCallerProfile() : async ?CommunityTypes.UserProfilePublic {
    CommunityLib.getCallerUserProfile(profiles, posts, accessControlState, caller);
  };

  public query ({ caller }) func getPublicProfile(
    user : Principal,
  ) : async ?CommunityTypes.UserProfilePublic {
    CommunityLib.getPublicProfile(profiles, posts, accessControlState, user, caller);
  };

  public query ({ caller }) func getProfile(
    user : Principal,
  ) : async ?CommunityTypes.UserProfilePublic {
    CommunityLib.getPublicProfile(profiles, posts, accessControlState, user, caller);
  };

  public query ({ caller }) func searchUsers(
    search : Text,
    limit : Nat,
  ) : async [CommunityTypes.UserProfilePublic] {
    CommunityLib.searchUsers(
      profiles, posts, accessControlState, caller, search, limit,
    );
  };

  // ── Feeds ───────────────────────────────────────────────────────────────────

  public query ({ caller }) func listPosts() : async [CommunityTypes.PostPublic] {
    CommunityLib.listPosts(posts, comments, tips, profiles, bannedUsers, caller);
  };

  public query ({ caller }) func getGlobalFeed(
    offset : Nat,
    limit : Nat,
  ) : async [CommunityTypes.PostPublic] {
    CommunityLib.getGlobalFeed(
      posts, comments, tips, profiles, bannedUsers, caller, offset, limit,
    );
  };

  public query ({ caller }) func getFollowingFeed(
    offset : Nat,
    limit : Nat,
  ) : async [CommunityTypes.PostPublic] {
    CommunityLib.getFollowingFeed(
      posts, comments, tips, profiles, bannedUsers, caller, offset, limit,
    );
  };

  public query ({ caller }) func getTrendingPosts(limit : Nat) : async [CommunityTypes.PostPublic] {
    CommunityLib.getTrendingPosts(
      posts, comments, tips, profiles, bannedUsers, caller, limit,
    );
  };

  public query ({ caller }) func getUserPosts(
    user : Principal,
    offset : Nat,
    limit : Nat,
  ) : async [CommunityTypes.PostPublic] {
    CommunityLib.getUserPosts(
      posts, comments, tips, profiles, bannedUsers, user, caller, offset, limit,
    );
  };

  public query ({ caller }) func getPostWithComments(
    post_id : Common.PostId,
  ) : async ?CommunityTypes.PostWithComments {
    CommunityLib.getPostWithComments(
      posts, comments, tips, profiles, bannedUsers, post_id, caller, false,
    );
  };

  public query ({ caller }) func listCommentsByPost(
    post_id : Common.PostId,
  ) : async [CommunityTypes.CommentPublic] {
    CommunityLib.listCommentsByPost(comments, profiles, post_id, caller);
  };

  public query func getFollowersCount(user : Principal) : async Nat {
    CommunityLib.getFollowersCount(profiles, user);
  };

  public query func getFollowingCount(user : Principal) : async Nat {
    CommunityLib.getFollowingCount(profiles, user);
  };

  // ── Admin moderation ────────────────────────────────────────────────────────

  public shared ({ caller }) func adminDeletePost(post_id : Common.PostId) : async Bool {
    AccessControl.requireAdmin(accessControlState, caller);
    let ok = CommunityLib.deletePost(posts, caller, post_id, true);
    if (ok) {
      auditLog.value := AuditLog.append(auditLog.value, {
        ts = Time.now();
        admin = caller;
        action = "community_post_deleted";
        detail = "post=" # Nat.toText(post_id);
      });
    };
    ok;
  };

  public shared ({ caller }) func adminDeleteComment(
    comment_id : Common.CommentId,
  ) : async Bool {
    AccessControl.requireAdmin(accessControlState, caller);
    let ok = CommunityLib.deleteComment(comments, caller, comment_id, true);
    if (ok) {
      auditLog.value := AuditLog.append(auditLog.value, {
        ts = Time.now();
        admin = caller;
        action = "community_comment_deleted";
        detail = "comment=" # Nat.toText(comment_id);
      });
    };
    ok;
  };

  public shared ({ caller }) func banUser(user : Principal) : async () {
    AccessControl.requireAdmin(accessControlState, caller);
    CommunityLib.banUser(bannedUsers, user);
    auditLog.value := AuditLog.append(auditLog.value, {
      ts = Time.now();
      admin = caller;
      action = "community_user_banned";
      detail = user.toText();
    });
  };

  public shared ({ caller }) func unbanUser(user : Principal) : async () {
    AccessControl.requireAdmin(accessControlState, caller);
    CommunityLib.unbanUser(bannedUsers, user);
    auditLog.value := AuditLog.append(auditLog.value, {
      ts = Time.now();
      admin = caller;
      action = "community_user_unbanned";
      detail = user.toText();
    });
  };

  public shared query ({ caller }) func listAllPostsAdmin(
    offset : Nat,
    limit : Nat,
  ) : async [CommunityTypes.PostPublic] {
    AccessControl.requireAdminOrAgent(accessControlState, agentPrincipalState, caller);
    CommunityLib.listAllPostsAdmin(
      posts, comments, tips, profiles, caller, offset, limit,
    );
  };

  public shared query ({ caller }) func isUserBanned(user : Principal) : async Bool {
    AccessControl.requireAdmin(accessControlState, caller);
    CommunityLib.isUserBanned(bannedUsers, user);
  };
};
