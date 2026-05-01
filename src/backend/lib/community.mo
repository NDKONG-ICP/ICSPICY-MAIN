import Common "../types/common";
import Types "../types/community";
import Map "mo:core/Map";
import Set "mo:core/Set";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Int "mo:core/Int";
import Text "mo:core/Text";

module {
  public func createPost(
    posts : Map.Map<Common.PostId, Types.Post>,
    nextId : Nat,
    author : Principal,
    input : Types.CreatePostInput,
  ) : Types.PostPublic {
    let now = Time.now();
    let post : Types.Post = {
      id = nextId;
      author = author;
      anonymous = input.anonymous;
      var content = input.content;
      image_key = input.image_key;
      likes = Set.empty<Principal>();
      created_at = now;
      var updated_at = now;
    };
    posts.add(nextId, post);
    postToPublic(post, author, 0, null);
  };

  // 48 hours in nanoseconds (48 * 3600 * 1_000_000_000)
  let EDIT_WINDOW_NS : Int = 172_800_000_000_000;

  public func editPost(
    posts : Map.Map<Common.PostId, Types.Post>,
    caller : Principal,
    post_id : Common.PostId,
    new_content : Text,
  ) : Types.PostPublic {
    switch (posts.get(post_id)) {
      case (?post) {
        if (post.author != caller) {
          Runtime.trap("Unauthorized: can only edit your own posts");
        };
        let now = Time.now();
        if (now - post.created_at > EDIT_WINDOW_NS) {
          Runtime.trap("Post is immutable: 48-hour edit window has passed");
        };
        post.content := new_content;
        // image_key is immutable — it cannot be changed after posting
        post.updated_at := now;
        postToPublic(post, caller, 0, null);
      };
      case null { Runtime.trap("Post not found") };
    };
  };

  public func deletePost(
    posts : Map.Map<Common.PostId, Types.Post>,
    caller : Principal,
    post_id : Common.PostId,
  ) : () {
    switch (posts.get(post_id)) {
      case (?post) {
        if (post.author != caller) {
          Runtime.trap("Unauthorized: can only delete your own posts");
        };
        let now = Time.now();
        if (now - post.created_at > EDIT_WINDOW_NS) {
          Runtime.trap("Post is immutable: 48-hour delete window has passed");
        };
        posts.remove(post_id);
      };
      case null { Runtime.trap("Post not found") };
    };
  };

  public func likePost(
    posts : Map.Map<Common.PostId, Types.Post>,
    post_id : Common.PostId,
    caller : Principal,
  ) : Nat {
    switch (posts.get(post_id)) {
      case (?post) {
        post.likes.add(caller);
        post.updated_at := Time.now();
        post.likes.size();
      };
      case null { Runtime.trap("Post not found") };
    };
  };

  public func unlikePost(
    posts : Map.Map<Common.PostId, Types.Post>,
    post_id : Common.PostId,
    caller : Principal,
  ) : Nat {
    switch (posts.get(post_id)) {
      case (?post) {
        post.likes.remove(caller);
        post.updated_at := Time.now();
        post.likes.size();
      };
      case null { Runtime.trap("Post not found") };
    };
  };

  public func createComment(
    comments : Map.Map<Common.CommentId, Types.Comment>,
    profiles : Map.Map<Principal, Types.UserProfile>,
    nextId : Nat,
    author : Principal,
    input : Types.CreateCommentInput,
  ) : Types.CommentPublic {
    let comment : Types.Comment = {
      id = nextId;
      post_id = input.post_id;
      author = author;
      content = input.content;
      created_at = Time.now();
    };
    comments.add(nextId, comment);
    commentToPublic(comment, profiles);
  };

  public func followUser(
    profiles : Map.Map<Principal, Types.UserProfile>,
    follower : Principal,
    target : Principal,
  ) : () {
    switch (profiles.get(follower)) {
      case (?profile) {
        profile.follows.add(target);
      };
      case null {
        let now = Time.now();
        let profile : Types.UserProfile = {
          principal_id = follower;
          var username = "";
          var bio = "";
          var avatar_key = null;
          var follows = Set.empty<Principal>();
          created_at = now;
        };
        profile.follows.add(target);
        profiles.add(follower, profile);
      };
    };
  };

  public func unfollowUser(
    profiles : Map.Map<Principal, Types.UserProfile>,
    follower : Principal,
    target : Principal,
  ) : () {
    switch (profiles.get(follower)) {
      case (?profile) {
        profile.follows.remove(target);
      };
      case null {};
    };
  };

  // Idempotent: creates a minimal profile for any authenticated caller if one
  // does not already exist. Uses the first 8 characters of the principal text
  // as the default username and leaves bio empty. Safe to call multiple times.
  public func ensureCallerProfile(
    profiles : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
  ) : () {
    switch (profiles.get(caller)) {
      case (?_) {};
      case null {
        let callerText = caller.toText();
        let defaultUsername = if (callerText.size() > 8) {
          Text.fromIter(callerText.chars().take(8))
        } else { callerText };
        let profile : Types.UserProfile = {
          principal_id = caller;
          var username = defaultUsername;
          var bio = "";
          var avatar_key = null;
          var follows = Set.empty<Principal>();
          created_at = Time.now();
        };
        profiles.add(caller, profile);
      };
    };
  };

  public func saveProfile(
    profiles : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
    input : Types.SaveProfileInput,
  ) : () {
    switch (profiles.get(caller)) {
      case (?profile) {
        profile.username := input.username;
        profile.bio := input.bio;
        profile.avatar_key := input.avatar_key;
      };
      case null {
        let profile : Types.UserProfile = {
          principal_id = caller;
          var username = input.username;
          var bio = input.bio;
          var avatar_key = input.avatar_key;
          var follows = Set.empty<Principal>();
          created_at = Time.now();
        };
        profiles.add(caller, profile);
      };
    };
  };

  public func getPost(
    posts : Map.Map<Common.PostId, Types.Post>,
    comments : Map.Map<Common.CommentId, Types.Comment>,
    profiles : Map.Map<Principal, Types.UserProfile>,
    post_id : Common.PostId,
    caller : Principal,
  ) : ?Types.PostPublic {
    switch (posts.get(post_id)) {
      case (?post) {
        let ccount = countCommentsForPost(comments, post_id);
        let username = getUsername(profiles, post.author);
        ?postToPublic(post, caller, ccount, username);
      };
      case null { null };
    };
  };

  public func listPosts(
    posts : Map.Map<Common.PostId, Types.Post>,
    comments : Map.Map<Common.CommentId, Types.Comment>,
    profiles : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
  ) : [Types.PostPublic] {
    let arr = posts.values().map(func(p : Types.Post) : Types.PostPublic {
      let ccount = countCommentsForPost(comments, p.id);
      let username = getUsername(profiles, p.author);
      postToPublic(p, caller, ccount, username);
    }).toArray();
    // Sort newest-first by created_at (descending)
    arr.sort(func(a : Types.PostPublic, b : Types.PostPublic) : { #less; #equal; #greater } {
      Int.compare(b.created_at, a.created_at)
    });
  };

  public func listCommentsByPost(
    comments : Map.Map<Common.CommentId, Types.Comment>,
    profiles : Map.Map<Principal, Types.UserProfile>,
    post_id : Common.PostId,
  ) : [Types.CommentPublic] {
    let arr = comments.values()
      .filter(func(c : Types.Comment) : Bool { c.post_id == post_id })
      .map(func(c : Types.Comment) : Types.CommentPublic {
        commentToPublic(c, profiles)
      })
      .toArray();
    // Sort by created_at ascending
    arr.sort(func(a : Types.CommentPublic, b : Types.CommentPublic) : { #less; #equal; #greater } {
      Int.compare(a.created_at, b.created_at)
    });
  };

  public func getCallerUserProfile(
    profiles : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
  ) : ?Types.UserProfilePublic {
    switch (profiles.get(caller)) {
      case (?profile) {
        let followerCount = countFollowers(profiles, caller);
        ?profileToPublic(profile, followerCount);
      };
      case null { null };
    };
  };

  public func getPublicProfile(
    profiles : Map.Map<Principal, Types.UserProfile>,
    user : Principal,
  ) : ?Types.UserProfilePublic {
    switch (profiles.get(user)) {
      case (?profile) {
        let followerCount = countFollowers(profiles, user);
        ?profileToPublic(profile, followerCount);
      };
      case null { null };
    };
  };

  public func getFollowersCount(
    profiles : Map.Map<Principal, Types.UserProfile>,
    user : Principal,
  ) : Nat {
    countFollowers(profiles, user);
  };

  public func getFollowingCount(
    profiles : Map.Map<Principal, Types.UserProfile>,
    user : Principal,
  ) : Nat {
    switch (profiles.get(user)) {
      case (?profile) { profile.follows.size() };
      case null { 0 };
    };
  };

  public func getUserPosts(
    posts : Map.Map<Common.PostId, Types.Post>,
    comments : Map.Map<Common.CommentId, Types.Comment>,
    profiles : Map.Map<Principal, Types.UserProfile>,
    user : Principal,
    caller : Principal,
  ) : [Types.PostPublic] {
    let arr = posts.values()
      .filter(func(p : Types.Post) : Bool { p.author == user })
      .map(func(p : Types.Post) : Types.PostPublic {
        let ccount = countCommentsForPost(comments, p.id);
        let username = getUsername(profiles, p.author);
        postToPublic(p, caller, ccount, username);
      })
      .toArray();
    arr.sort(func(a : Types.PostPublic, b : Types.PostPublic) : { #less; #equal; #greater } {
      Int.compare(b.created_at, a.created_at)
    });
  };

  // ── Private helpers ─────────────────────────────────────────────────────────

  func countCommentsForPost(
    comments : Map.Map<Common.CommentId, Types.Comment>,
    post_id : Common.PostId,
  ) : Nat {
    comments.values()
      .filter(func(c : Types.Comment) : Bool { c.post_id == post_id })
      .size();
  };

  func countFollowers(
    profiles : Map.Map<Principal, Types.UserProfile>,
    user : Principal,
  ) : Nat {
    profiles.values()
      .filter(func(p : Types.UserProfile) : Bool {
        p.follows.contains(user)
      })
      .size();
  };

  func getUsername(
    profiles : Map.Map<Principal, Types.UserProfile>,
    user : Principal,
  ) : ?Text {
    switch (profiles.get(user)) {
      case (?profile) {
        if (profile.username == "") null else ?profile.username
      };
      case null { null };
    };
  };

  public func postToPublic(
    post : Types.Post,
    caller : Principal,
    comment_count : Nat,
    username : ?Text,
  ) : Types.PostPublic {
    {
      id = post.id;
      author_text = if (post.anonymous) "Anonymous" else post.author.toText();
      author_principal = if (post.anonymous) null else ?post.author;
      author_username = if (post.anonymous) null else username;
      content = post.content;
      image_key = post.image_key;
      like_count = post.likes.size();
      comment_count = comment_count;
      caller_liked = post.likes.contains(caller);
      is_anonymous = post.anonymous;
      created_at = post.created_at;
      updated_at = post.updated_at;
    };
  };

  public func commentToPublic(
    comment : Types.Comment,
    profiles : Map.Map<Principal, Types.UserProfile>,
  ) : Types.CommentPublic {
    {
      id = comment.id;
      post_id = comment.post_id;
      author = comment.author;
      author_username = getUsername(profiles, comment.author);
      content = comment.content;
      created_at = comment.created_at;
    };
  };

  public func profileToPublic(
    profile : Types.UserProfile,
    follower_count : Nat,
  ) : Types.UserProfilePublic {
    {
      principal_id = profile.principal_id;
      username = profile.username;
      bio = profile.bio;
      avatar_key = profile.avatar_key;
      follower_count = follower_count;
      following_count = profile.follows.size();
      created_at = profile.created_at;
    };
  };
};
