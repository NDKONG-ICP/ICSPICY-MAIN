import Common "../types/common";
import Types "../types/community";
import AccessControl "../lib/access-control";
import Map "mo:core/Map";
import Array "mo:core/Array";
import Set "mo:core/Set";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Int "mo:core/Int";
import Text "mo:core/Text";
import Nat "mo:core/Nat";

module {
  let MAX_POST_CHARS : Nat = 2000;
  let MAX_COMMENT_CHARS : Nat = 500;
  let MAX_IMAGES : Nat = 4;
  // 15 minutes in nanoseconds
  let EDIT_WINDOW_NS : Int = 900_000_000_000;
  // 7 days in nanoseconds
  let TRENDING_WINDOW_NS : Int = 604_800_000_000_000;

  public func requireProfile(
    profiles : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
  ) : () {
    switch (profiles.get(caller)) {
      case null {
        Runtime.trap("Profile required: create your profile first");
      };
      case (?p) {
        if (p.username == "") {
          Runtime.trap("Profile required: set a display name first");
        };
      };
    };
  };

  func isBanned(bannedUsers : Set.Set<Principal>, p : Principal) : Bool {
    bannedUsers.contains(p);
  };

  func mergeImageKeys(input : Types.CreatePostInput) : [Text] {
    var keys = input.image_keys;
    switch (input.image_key) {
      case null {};
      case (?k) {
        if (keys.size() < MAX_IMAGES) {
          keys := Array.concat(keys, [k]);
        };
      };
    };
    if (keys.size() > MAX_IMAGES) {
      Runtime.trap("Too many images (max 4)");
    };
    keys;
  };

  public func createPost(
    posts : Map.Map<Common.PostId, Types.Post>,
    profiles : Map.Map<Principal, Types.UserProfile>,
    bannedUsers : Set.Set<Principal>,
    nextId : Nat,
    author : Principal,
    input : Types.CreatePostInput,
  ) : Types.PostPublic {
    requireProfile(profiles, author);
    if (isBanned(bannedUsers, author)) {
      Runtime.trap("User is banned from community");
    };
    if (input.content.size() > MAX_POST_CHARS) {
      Runtime.trap("Post content too long (max 2000 chars)");
    };
    let now = Time.now();
    let keys = mergeImageKeys(input);
    let post : Types.Post = {
      id = nextId;
      author = author;
      anonymous = input.anonymous;
      var content = input.content;
      image_key = if (keys.size() > 0) ?keys[0] else null;
      image_keys = keys;
      plant_id = input.plant_id;
      nft_token_id = input.nft_token_id;
      likes = Set.empty<Principal>();
      created_at = now;
      var updated_at = now;
      var is_deleted = false;
    };
    posts.add(nextId, post);
    postToPublic(post, author, 0, 0, null, false);
  };

  public func editPost(
    posts : Map.Map<Common.PostId, Types.Post>,
    caller : Principal,
    post_id : Common.PostId,
    new_content : Text,
  ) : Bool {
    switch (posts.get(post_id)) {
      case (?post) {
        if (post.is_deleted) return false;
        if (post.author != caller) {
          Runtime.trap("Unauthorized: can only edit your own posts");
        };
        if (new_content.size() > MAX_POST_CHARS) {
          Runtime.trap("Post content too long (max 2000 chars)");
        };
        let now = Time.now();
        if (now - post.created_at > EDIT_WINDOW_NS) {
          return false;
        };
        post.content := new_content;
        post.updated_at := now;
        true;
      };
      case null { false };
    };
  };

  public func deletePost(
    posts : Map.Map<Common.PostId, Types.Post>,
    caller : Principal,
    post_id : Common.PostId,
    isAdmin : Bool,
  ) : Bool {
    switch (posts.get(post_id)) {
      case (?post) {
        if (not isAdmin and post.author != caller) {
          Runtime.trap("Unauthorized");
        };
        post.is_deleted := true;
        post.updated_at := Time.now();
        true;
      };
      case null { false };
    };
  };

  public func toggleLikePost(
    posts : Map.Map<Common.PostId, Types.Post>,
    profiles : Map.Map<Principal, Types.UserProfile>,
    bannedUsers : Set.Set<Principal>,
    post_id : Common.PostId,
    caller : Principal,
  ) : Bool {
    requireProfile(profiles, caller);
    if (isBanned(bannedUsers, caller)) {
      Runtime.trap("User is banned from community");
    };
    switch (posts.get(post_id)) {
      case (?post) {
        if (post.is_deleted) return false;
        let liked = post.likes.contains(caller);
        if (liked) { post.likes.remove(caller) } else { post.likes.add(caller) };
        post.updated_at := Time.now();
        not liked;
      };
      case null { Runtime.trap("Post not found") };
    };
  };

  public func hasLikedPost(
    posts : Map.Map<Common.PostId, Types.Post>,
    post_id : Common.PostId,
    caller : Principal,
  ) : Bool {
    switch (posts.get(post_id)) {
      case (?post) { post.likes.contains(caller) };
      case null { false };
    };
  };

  public func createComment(
    comments : Map.Map<Common.CommentId, Types.Comment>,
    posts : Map.Map<Common.PostId, Types.Post>,
    profiles : Map.Map<Principal, Types.UserProfile>,
    bannedUsers : Set.Set<Principal>,
    nextId : Nat,
    author : Principal,
    input : Types.CreateCommentInput,
  ) : Types.CommentPublic {
    requireProfile(profiles, author);
    if (isBanned(bannedUsers, author)) {
      Runtime.trap("User is banned from community");
    };
    if (input.content.size() > MAX_COMMENT_CHARS) {
      Runtime.trap("Comment too long (max 500 chars)");
    };
    switch (posts.get(input.post_id)) {
      case null { Runtime.trap("Post not found") };
      case (?post) {
        if (post.is_deleted) { Runtime.trap("Post not found") };
      };
    };
    let comment : Types.Comment = {
      id = nextId;
      post_id = input.post_id;
      author = author;
      anonymous = input.anonymous;
      content = input.content;
      likes = Set.empty<Principal>();
      created_at = Time.now();
      var is_deleted = false;
    };
    comments.add(nextId, comment);
    commentToPublic(comment, profiles, author, false);
  };

  public func deleteComment(
    comments : Map.Map<Common.CommentId, Types.Comment>,
    caller : Principal,
    comment_id : Common.CommentId,
    isAdmin : Bool,
  ) : Bool {
    switch (comments.get(comment_id)) {
      case (?c) {
        if (not isAdmin and c.author != caller) {
          Runtime.trap("Unauthorized");
        };
        c.is_deleted := true;
        true;
      };
      case null { false };
    };
  };

  public func toggleLikeComment(
    comments : Map.Map<Common.CommentId, Types.Comment>,
    profiles : Map.Map<Principal, Types.UserProfile>,
    bannedUsers : Set.Set<Principal>,
    comment_id : Common.CommentId,
    caller : Principal,
  ) : Bool {
    requireProfile(profiles, caller);
    if (isBanned(bannedUsers, caller)) {
      Runtime.trap("User is banned from community");
    };
    switch (comments.get(comment_id)) {
      case (?c) {
        if (c.is_deleted) return false;
        let liked = c.likes.contains(caller);
        if (liked) { c.likes.remove(caller) } else { c.likes.add(caller) };
        not liked;
      };
      case null { Runtime.trap("Comment not found") };
    };
  };

  public func toggleFollow(
    profiles : Map.Map<Principal, Types.UserProfile>,
    bannedUsers : Set.Set<Principal>,
    follower : Principal,
    target : Principal,
  ) : Bool {
    requireProfile(profiles, follower);
    if (isBanned(bannedUsers, follower)) {
      Runtime.trap("User is banned from community");
    };
    if (follower == target) {
      Runtime.trap("Cannot follow yourself");
    };
    switch (profiles.get(follower)) {
      case (?profile) {
        let following = profile.follows.contains(target);
        if (following) { profile.follows.remove(target) } else { profile.follows.add(target) };
        not following;
      };
      case null {
        Runtime.trap("Profile required");
      };
    };
  };

  public func isFollowing(
    profiles : Map.Map<Principal, Types.UserProfile>,
    follower : Principal,
    target : Principal,
  ) : Bool {
    switch (profiles.get(follower)) {
      case (?profile) { profile.follows.contains(target) };
      case null { false };
    };
  };

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
          var location = null;
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
  ) : Bool {
    if (input.username.size() == 0) {
      Runtime.trap("Display name is required");
    };
    switch (profiles.get(caller)) {
      case (?profile) {
        profile.username := input.username;
        profile.bio := input.bio;
        profile.avatar_key := input.avatar_key;
        profile.location := input.location;
      };
      case null {
        let profile : Types.UserProfile = {
          principal_id = caller;
          var username = input.username;
          var bio = input.bio;
          var avatar_key = input.avatar_key;
          var location = input.location;
          var follows = Set.empty<Principal>();
          created_at = Time.now();
        };
        profiles.add(caller, profile);
      };
    };
    true;
  };

  public func recordTip(
    tips : Map.Map<Nat, Types.Tip>,
    posts : Map.Map<Common.PostId, Types.Post>,
    profiles : Map.Map<Principal, Types.UserProfile>,
    nextTipId : Nat,
    caller : Principal,
    input : Types.RecordTipInput,
  ) : Bool {
    requireProfile(profiles, caller);
    let to = switch (posts.get(input.post_id)) {
      case null { Runtime.trap("Post not found") };
      case (?post) {
        if (post.is_deleted) { Runtime.trap("Post not found") };
        post.author;
      };
    };
    let tip : Types.Tip = {
      id = nextTipId;
      from_principal = caller;
      to_principal = to;
      post_id = input.post_id;
      ledger_canister_id = input.ledger_canister_id;
      amount = input.amount;
      block_index = input.block_index;
      created_at = Time.now();
    };
    tips.add(nextTipId, tip);
    true;
  };

  public func banUser(
    bannedUsers : Set.Set<Principal>,
    user : Principal,
  ) : () {
    bannedUsers.add(user);
  };

  public func unbanUser(
    bannedUsers : Set.Set<Principal>,
    user : Principal,
  ) : () {
    bannedUsers.remove(user);
  };

  public func isUserBanned(
    bannedUsers : Set.Set<Principal>,
    user : Principal,
  ) : Bool {
    bannedUsers.contains(user);
  };

  func countTipsForPost(tips : Map.Map<Nat, Types.Tip>, post_id : Common.PostId) : Nat {
    tips.values()
      .filter(func(t : Types.Tip) : Bool { t.post_id == post_id })
      .size();
  };

  func countCommentsForPost(
    comments : Map.Map<Common.CommentId, Types.Comment>,
    post_id : Common.PostId,
  ) : Nat {
    comments.values()
      .filter(func(c : Types.Comment) : Bool {
        c.post_id == post_id and not c.is_deleted
      })
      .size();
  };

  func countPostsByUser(
    posts : Map.Map<Common.PostId, Types.Post>,
    user : Principal,
  ) : Nat {
    posts.values()
      .filter(func(p : Types.Post) : Bool {
        p.author == user and not p.is_deleted
      })
      .size();
  };

  func countFollowers(
    profiles : Map.Map<Principal, Types.UserProfile>,
    user : Principal,
  ) : Nat {
    profiles.values()
      .filter(func(p : Types.UserProfile) : Bool { p.follows.contains(user) })
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

  func postVisible(
    post : Types.Post,
    bannedUsers : Set.Set<Principal>,
    revealAnonymous : Bool,
  ) : Bool {
    if (post.is_deleted) return false;
    if (isBanned(bannedUsers, post.author)) return false;
    true;
  };

  public func postToPublic(
    post : Types.Post,
    caller : Principal,
    comment_count : Nat,
    tip_count : Nat,
    username : ?Text,
    revealAnonymous : Bool,
  ) : Types.PostPublic {
    let showAuthor = revealAnonymous or not post.anonymous;
    {
      id = post.id;
      author_text = if (showAuthor) {
        switch (username) {
          case (?u) u;
          case null { post.author.toText() };
        }
      } else { "Anonymous Grower" };
      author_principal = if (showAuthor and not post.anonymous) ?post.author else null;
      author_username = if (showAuthor and not post.anonymous) username else null;
      content = post.content;
      image_key = post.image_key;
      image_keys = post.image_keys;
      plant_id = post.plant_id;
      nft_token_id = post.nft_token_id;
      like_count = post.likes.size();
      comment_count = comment_count;
      tip_count = tip_count;
      caller_liked = post.likes.contains(caller);
      is_anonymous = post.anonymous;
      created_at = post.created_at;
      updated_at = post.updated_at;
    };
  };

  public func commentToPublic(
    comment : Types.Comment,
    profiles : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
    revealAnonymous : Bool,
  ) : Types.CommentPublic {
    let username = getUsername(profiles, comment.author);
    let showAuthor = revealAnonymous or not comment.anonymous;
    {
      id = comment.id;
      post_id = comment.post_id;
      author = if (showAuthor) comment.author else Principal.fromText("aaaaa-aa");
      author_username = if (showAuthor) username else null;
      author_text = if (showAuthor) {
        switch (username) {
          case (?u) u;
          case null { comment.author.toText() };
        }
      } else { "Anonymous Grower" };
      content = comment.content;
      like_count = comment.likes.size();
      caller_liked = comment.likes.contains(caller);
      is_anonymous = comment.anonymous;
      created_at = comment.created_at;
    };
  };

  public func profileToPublic(
    profile : Types.UserProfile,
    follower_count : Nat,
    post_count : Nat,
    is_admin : Bool,
    caller_following : Bool,
  ) : Types.UserProfilePublic {
    {
      principal_id = profile.principal_id;
      username = profile.username;
      bio = profile.bio;
      avatar_key = profile.avatar_key;
      location = profile.location;
      follower_count = follower_count;
      following_count = profile.follows.size();
      post_count = post_count;
      is_admin = is_admin;
      caller_following = caller_following;
      created_at = profile.created_at;
    };
  };

  func collectPosts(
    posts : Map.Map<Common.PostId, Types.Post>,
    comments : Map.Map<Common.CommentId, Types.Comment>,
    tips : Map.Map<Nat, Types.Tip>,
    profiles : Map.Map<Principal, Types.UserProfile>,
    bannedUsers : Set.Set<Principal>,
    caller : Principal,
    revealAnonymous : Bool,
    filterFn : (Types.Post) -> Bool,
  ) : [Types.PostPublic] {
    posts.values()
      .filter(func(p : Types.Post) : Bool {
        postVisible(p, bannedUsers, revealAnonymous) and filterFn(p)
      })
      .map(func(p : Types.Post) : Types.PostPublic {
        let ccount = countCommentsForPost(comments, p.id);
        let tcount = countTipsForPost(tips, p.id);
        let username = getUsername(profiles, p.author);
        postToPublic(p, caller, ccount, tcount, username, revealAnonymous);
      })
      .toArray();
  };

  func paginate<T>(arr : [T], offset : Nat, limit : Nat) : [T] {
    let size = arr.size();
    if (offset >= size) return [];
    let end = Nat.min(size, offset + limit);
    Array.tabulate<T>(end - offset, func(i : Nat) : T { arr[offset + i] });
  };

  public func getGlobalFeed(
    posts : Map.Map<Common.PostId, Types.Post>,
    comments : Map.Map<Common.CommentId, Types.Comment>,
    tips : Map.Map<Nat, Types.Tip>,
    profiles : Map.Map<Principal, Types.UserProfile>,
    bannedUsers : Set.Set<Principal>,
    caller : Principal,
    offset : Nat,
    limit : Nat,
  ) : [Types.PostPublic] {
    var arr = collectPosts(
      posts, comments, tips, profiles, bannedUsers, caller, false,
      func(_p : Types.Post) : Bool { true },
    );
    ignore arr.sort(func(a : Types.PostPublic, b : Types.PostPublic) : { #less; #equal; #greater } {
      Int.compare(b.created_at, a.created_at)
    });
    paginate(arr, offset, limit);
  };

  public func getFollowingFeed(
    posts : Map.Map<Common.PostId, Types.Post>,
    comments : Map.Map<Common.CommentId, Types.Comment>,
    tips : Map.Map<Nat, Types.Tip>,
    profiles : Map.Map<Principal, Types.UserProfile>,
    bannedUsers : Set.Set<Principal>,
    caller : Principal,
    offset : Nat,
    limit : Nat,
  ) : [Types.PostPublic] {
    let following = switch (profiles.get(caller)) {
      case (?p) { p.follows };
      case null { Set.empty<Principal>() };
    };
    var arr = collectPosts(
      posts, comments, tips, profiles, bannedUsers, caller, false,
      func(p : Types.Post) : Bool { following.contains(p.author) },
    );
    ignore arr.sort(func(a : Types.PostPublic, b : Types.PostPublic) : { #less; #equal; #greater } {
      Int.compare(b.created_at, a.created_at)
    });
    paginate(arr, offset, limit);
  };

  public func getTrendingPosts(
    posts : Map.Map<Common.PostId, Types.Post>,
    comments : Map.Map<Common.CommentId, Types.Comment>,
    tips : Map.Map<Nat, Types.Tip>,
    profiles : Map.Map<Principal, Types.UserProfile>,
    bannedUsers : Set.Set<Principal>,
    caller : Principal,
    limit : Nat,
  ) : [Types.PostPublic] {
    let now = Time.now();
    var arr = collectPosts(
      posts, comments, tips, profiles, bannedUsers, caller, false,
      func(p : Types.Post) : Bool { now - p.created_at <= TRENDING_WINDOW_NS },
    );
    ignore arr.sort(func(a : Types.PostPublic, b : Types.PostPublic) : { #less; #equal; #greater } {
      switch (Nat.compare(b.like_count, a.like_count)) {
        case (#equal) { Int.compare(b.created_at, a.created_at) };
        case (ord) { ord };
      };
    });
    paginate(arr, 0, limit);
  };

  public func getUserPosts(
    posts : Map.Map<Common.PostId, Types.Post>,
    comments : Map.Map<Common.CommentId, Types.Comment>,
    tips : Map.Map<Nat, Types.Tip>,
    profiles : Map.Map<Principal, Types.UserProfile>,
    bannedUsers : Set.Set<Principal>,
    user : Principal,
    caller : Principal,
    offset : Nat,
    limit : Nat,
  ) : [Types.PostPublic] {
    var arr = collectPosts(
      posts, comments, tips, profiles, bannedUsers, caller, false,
      func(p : Types.Post) : Bool { p.author == user },
    );
    ignore arr.sort(func(a : Types.PostPublic, b : Types.PostPublic) : { #less; #equal; #greater } {
      Int.compare(b.created_at, a.created_at)
    });
    paginate(arr, offset, limit);
  };

  public func getPostWithComments(
    posts : Map.Map<Common.PostId, Types.Post>,
    comments : Map.Map<Common.CommentId, Types.Comment>,
    tips : Map.Map<Nat, Types.Tip>,
    profiles : Map.Map<Principal, Types.UserProfile>,
    bannedUsers : Set.Set<Principal>,
    post_id : Common.PostId,
    caller : Principal,
    revealAnonymous : Bool,
  ) : ?Types.PostWithComments {
    switch (posts.get(post_id)) {
      case (?post) {
        if (not postVisible(post, bannedUsers, revealAnonymous)) return null;
        let ccount = countCommentsForPost(comments, post_id);
        let tcount = countTipsForPost(tips, post_id);
        let username = getUsername(profiles, post.author);
        let postPub = postToPublic(post, caller, ccount, tcount, username, revealAnonymous);
        var commentArr = comments.values()
          .filter(func(c : Types.Comment) : Bool {
            c.post_id == post_id and not c.is_deleted
          })
          .map(func(c : Types.Comment) : Types.CommentPublic {
            commentToPublic(c, profiles, caller, revealAnonymous)
          })
          .toArray();
        ignore commentArr.sort(func(a : Types.CommentPublic, b : Types.CommentPublic) : { #less; #equal; #greater } {
          Int.compare(a.created_at, b.created_at)
        });
        ?{
          post = postPub;
          comments = commentArr;
          has_liked = post.likes.contains(caller);
        };
      };
      case null { null };
    };
  };

  public func listCommentsByPost(
    comments : Map.Map<Common.CommentId, Types.Comment>,
    profiles : Map.Map<Principal, Types.UserProfile>,
    post_id : Common.PostId,
    caller : Principal,
  ) : [Types.CommentPublic] {
    var arr = comments.values()
      .filter(func(c : Types.Comment) : Bool {
        c.post_id == post_id and not c.is_deleted
      })
      .map(func(c : Types.Comment) : Types.CommentPublic {
        commentToPublic(c, profiles, caller, false)
      })
      .toArray();
    ignore arr.sort(func(a : Types.CommentPublic, b : Types.CommentPublic) : { #less; #equal; #greater } {
      Int.compare(a.created_at, b.created_at)
    });
    arr;
  };

  public func listPosts(
    posts : Map.Map<Common.PostId, Types.Post>,
    comments : Map.Map<Common.CommentId, Types.Comment>,
    tips : Map.Map<Nat, Types.Tip>,
    profiles : Map.Map<Principal, Types.UserProfile>,
    bannedUsers : Set.Set<Principal>,
    caller : Principal,
  ) : [Types.PostPublic] {
    getGlobalFeed(posts, comments, tips, profiles, bannedUsers, caller, 0, 1000);
  };

  public func getCallerUserProfile(
    profiles : Map.Map<Principal, Types.UserProfile>,
    posts : Map.Map<Common.PostId, Types.Post>,
    accessControlState : AccessControl.AccessControlState,
    caller : Principal,
  ) : ?Types.UserProfilePublic {
    switch (profiles.get(caller)) {
      case (?profile) {
        let followerCount = countFollowers(profiles, caller);
        let postCount = countPostsByUser(posts, caller);
        let isAdmin = AccessControl.isAdmin(accessControlState, caller);
        ?profileToPublic(profile, followerCount, postCount, isAdmin, false);
      };
      case null { null };
    };
  };

  public func getPublicProfile(
    profiles : Map.Map<Principal, Types.UserProfile>,
    posts : Map.Map<Common.PostId, Types.Post>,
    accessControlState : AccessControl.AccessControlState,
    user : Principal,
    caller : Principal,
  ) : ?Types.UserProfilePublic {
    switch (profiles.get(user)) {
      case (?profile) {
        let followerCount = countFollowers(profiles, user);
        let postCount = countPostsByUser(posts, user);
        let isAdmin = AccessControl.isAdmin(accessControlState, user);
        let callerFollowing = isFollowing(profiles, caller, user);
        ?profileToPublic(profile, followerCount, postCount, isAdmin, callerFollowing);
      };
      case null { null };
    };
  };

  public func getFollowers(
    profiles : Map.Map<Principal, Types.UserProfile>,
    posts : Map.Map<Common.PostId, Types.Post>,
    accessControlState : AccessControl.AccessControlState,
    user : Principal,
    caller : Principal,
    offset : Nat,
    limit : Nat,
  ) : [Types.UserProfilePublic] {
    var arr : [Types.UserProfilePublic] = [];
    for ((_, profile) in profiles.entries()) {
      if (profile.follows.contains(user)) {
        let fc = countFollowers(profiles, profile.principal_id);
        let pc = countPostsByUser(posts, profile.principal_id);
        let isAdmin = AccessControl.isAdmin(accessControlState, profile.principal_id);
        let cf = isFollowing(profiles, caller, profile.principal_id);
        arr := Array.concat(arr, [profileToPublic(profile, fc, pc, isAdmin, cf)]);
      };
    };
    paginate(arr, offset, limit);
  };

  public func getFollowing(
    profiles : Map.Map<Principal, Types.UserProfile>,
    posts : Map.Map<Common.PostId, Types.Post>,
    accessControlState : AccessControl.AccessControlState,
    user : Principal,
    caller : Principal,
    offset : Nat,
    limit : Nat,
  ) : [Types.UserProfilePublic] {
    switch (profiles.get(user)) {
      case (?profile) {
        var arr : [Types.UserProfilePublic] = [];
        for (target in profile.follows.values()) {
          switch (profiles.get(target)) {
            case (?tp) {
              let fc = countFollowers(profiles, target);
              let pc = countPostsByUser(posts, target);
              let isAdmin = AccessControl.isAdmin(accessControlState, target);
              let cf = isFollowing(profiles, caller, target);
              arr := Array.concat(arr, [profileToPublic(tp, fc, pc, isAdmin, cf)]);
            };
            case null {};
          };
        };
        paginate(arr, offset, limit);
      };
      case null { [] };
    };
  };

  public func searchUsers(
    profiles : Map.Map<Principal, Types.UserProfile>,
    posts : Map.Map<Common.PostId, Types.Post>,
    accessControlState : AccessControl.AccessControlState,
    caller : Principal,
    searchText : Text,
    limit : Nat,
  ) : [Types.UserProfilePublic] {
    if (searchText.size() == 0) return [];
    let arr = profiles.values()
      .filter(func(p : Types.UserProfile) : Bool {
        p.username.size() > 0 and Text.contains(p.username, #text searchText)
      })
      .map(func(p : Types.UserProfile) : Types.UserProfilePublic {
        let fc = countFollowers(profiles, p.principal_id);
        let pc = countPostsByUser(posts, p.principal_id);
        let isAdmin = AccessControl.isAdmin(accessControlState, p.principal_id);
        let cf = isFollowing(profiles, caller, p.principal_id);
        profileToPublic(p, fc, pc, isAdmin, cf);
      })
      .toArray();
    paginate(arr, 0, limit);
  };

  public func listAllPostsAdmin(
    posts : Map.Map<Common.PostId, Types.Post>,
    comments : Map.Map<Common.CommentId, Types.Comment>,
    tips : Map.Map<Nat, Types.Tip>,
    profiles : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
    offset : Nat,
    limit : Nat,
  ) : [Types.PostPublic] {
    var arr = posts.values()
      .filter(func(p : Types.Post) : Bool { not p.is_deleted })
      .map(func(p : Types.Post) : Types.PostPublic {
        let ccount = countCommentsForPost(comments, p.id);
        let tcount = countTipsForPost(tips, p.id);
        let username = getUsername(profiles, p.author);
        postToPublic(p, caller, ccount, tcount, username, true);
      })
      .toArray();
    ignore arr.sort(func(a : Types.PostPublic, b : Types.PostPublic) : { #less; #equal; #greater } {
      Int.compare(b.created_at, a.created_at)
    });
    paginate(arr, offset, limit);
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

  // Legacy wrappers
  public func likePost(
    posts : Map.Map<Common.PostId, Types.Post>,
    profiles : Map.Map<Principal, Types.UserProfile>,
    bannedUsers : Set.Set<Principal>,
    post_id : Common.PostId,
    caller : Principal,
  ) : Nat {
    ignore toggleLikePost(posts, profiles, bannedUsers, post_id, caller);
    switch (posts.get(post_id)) {
      case (?post) { post.likes.size() };
      case null { 0 };
    };
  };

  public func unlikePost(
    posts : Map.Map<Common.PostId, Types.Post>,
    profiles : Map.Map<Principal, Types.UserProfile>,
    bannedUsers : Set.Set<Principal>,
    post_id : Common.PostId,
    caller : Principal,
  ) : Nat {
    switch (posts.get(post_id)) {
      case (?post) {
        if (post.likes.contains(caller)) {
          ignore toggleLikePost(posts, profiles, bannedUsers, post_id, caller);
        };
        post.likes.size();
      };
      case null { 0 };
    };
  };

  public func followUser(
    profiles : Map.Map<Principal, Types.UserProfile>,
    bannedUsers : Set.Set<Principal>,
    follower : Principal,
    target : Principal,
  ) : () {
    if (not isFollowing(profiles, follower, target)) {
      ignore toggleFollow(profiles, bannedUsers, follower, target);
    };
  };

  public func unfollowUser(
    profiles : Map.Map<Principal, Types.UserProfile>,
    bannedUsers : Set.Set<Principal>,
    follower : Principal,
    target : Principal,
  ) : () {
    if (isFollowing(profiles, follower, target)) {
      ignore toggleFollow(profiles, bannedUsers, follower, target);
    };
  };
};
