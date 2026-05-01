import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import Common "../types/common";
import CommunityTypes "../types/community";
import CommunityLib "../lib/community";

mixin (
  accessControlState : AccessControl.AccessControlState,
  posts : Map.Map<Common.PostId, CommunityTypes.Post>,
  comments : Map.Map<Common.CommentId, CommunityTypes.Comment>,
  profiles : Map.Map<Principal, CommunityTypes.UserProfile>,
  nextPostId : { var value : Nat },
  nextCommentId : { var value : Nat },
) {
  // Authenticated: create a community post
  public shared ({ caller }) func createPost(input : CommunityTypes.CreatePostInput) : async CommunityTypes.PostPublic {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Must be logged in to post");
    };
    let post = CommunityLib.createPost(posts, nextPostId.value, caller, input);
    nextPostId.value += 1;
    post;
  };

  // Authenticated: edit own post within 48 hours of creation
  public shared ({ caller }) func editPost(post_id : Common.PostId, new_content : Text) : async CommunityTypes.PostPublic {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Must be logged in to edit posts");
    };
    CommunityLib.editPost(posts, caller, post_id, new_content);
  };

  // Authenticated: delete own post within 48 hours of creation
  public shared ({ caller }) func deletePost(post_id : Common.PostId) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Must be logged in to delete posts");
    };
    CommunityLib.deletePost(posts, caller, post_id);
  };

  // Authenticated: like a post — returns updated like count
  public shared ({ caller }) func likePost(post_id : Common.PostId) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Must be logged in to like posts");
    };
    CommunityLib.likePost(posts, post_id, caller);
  };

  // Authenticated: unlike a post — returns updated like count
  public shared ({ caller }) func unlikePost(post_id : Common.PostId) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Must be logged in to unlike posts");
    };
    CommunityLib.unlikePost(posts, post_id, caller);
  };

  // Authenticated: add a comment to a post
  public shared ({ caller }) func createComment(input : CommunityTypes.CreateCommentInput) : async CommunityTypes.CommentPublic {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Must be logged in to comment");
    };
    let comment = CommunityLib.createComment(comments, profiles, nextCommentId.value, caller, input);
    nextCommentId.value += 1;
    comment;
  };

  // Authenticated: follow another user
  public shared ({ caller }) func followUser(target : Principal) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Must be logged in to follow users");
    };
    CommunityLib.followUser(profiles, caller, target);
  };

  // Authenticated: unfollow a user
  public shared ({ caller }) func unfollowUser(target : Principal) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Must be logged in to unfollow users");
    };
    CommunityLib.unfollowUser(profiles, caller, target);
  };

  // Authenticated: save caller's profile
  public shared ({ caller }) func saveCallerUserProfile(input : CommunityTypes.SaveProfileInput) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Must be logged in to save profile");
    };
    CommunityLib.saveProfile(profiles, caller, input);
  };

  // Authenticated: ensure caller has a profile, creating one if absent.
  // Idempotent — safe to call on every sign-in for any user.
  public shared ({ caller }) func ensureCallerProfile() : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Must be logged in");
    };
    CommunityLib.ensureCallerProfile(profiles, caller);
  };

  // Authenticated: get caller's own profile
  public query ({ caller }) func getCallerUserProfile() : async ?CommunityTypes.UserProfilePublic {
    CommunityLib.getCallerUserProfile(profiles, caller);
  };

  // Public: get any user's public profile
  public query func getPublicProfile(user : Principal) : async ?CommunityTypes.UserProfilePublic {
    CommunityLib.getPublicProfile(profiles, user);
  };

  // Public: list all posts newest-first; caller needed for like/follow status
  public query ({ caller }) func listPosts() : async [CommunityTypes.PostPublic] {
    CommunityLib.listPosts(posts, comments, profiles, caller);
  };

  // Public: list comments for a post sorted oldest-first
  public query func listCommentsByPost(post_id : Common.PostId) : async [CommunityTypes.CommentPublic] {
    CommunityLib.listCommentsByPost(comments, profiles, post_id);
  };

  // Public: get follower count for a user
  public query func getFollowersCount(user : Principal) : async Nat {
    CommunityLib.getFollowersCount(profiles, user);
  };

  // Public: get following count for a user
  public query func getFollowingCount(user : Principal) : async Nat {
    CommunityLib.getFollowingCount(profiles, user);
  };

  // Public: get all posts by a specific user (for profile page)
  public query ({ caller }) func getUserPosts(user : Principal) : async [CommunityTypes.PostPublic] {
    CommunityLib.getUserPosts(posts, comments, profiles, user, caller);
  };
};
