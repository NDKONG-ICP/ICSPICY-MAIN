import Common "common";
import Set "mo:core/Set";

module {
  public type Post = {
    id : Common.PostId;
    author : Principal;
    anonymous : Bool;
    var content : Text;
    image_key : ?Text; // compressed image storage key
    likes : Set.Set<Principal>;
    created_at : Common.Timestamp;
    var updated_at : Common.Timestamp;
  };

  public type PostPublic = {
    id : Common.PostId;
    author_text : Text;       // principal text or "Anonymous"
    author_principal : ?Principal; // null if anonymous
    author_username : ?Text;  // display name if profile exists
    content : Text;
    image_key : ?Text;
    like_count : Nat;
    comment_count : Nat;
    caller_liked : Bool;
    is_anonymous : Bool;
    created_at : Common.Timestamp;
    updated_at : Common.Timestamp;
  };

  public type Comment = {
    id : Common.CommentId;
    post_id : Common.PostId;
    author : Principal;
    content : Text;
    created_at : Common.Timestamp;
  };

  public type CommentPublic = {
    id : Common.CommentId;
    post_id : Common.PostId;
    author : Principal;
    author_username : ?Text;
    content : Text;
    created_at : Common.Timestamp;
  };

  public type CreatePostInput = {
    content : Text;
    image_key : ?Text;
    anonymous : Bool;
  };

  public type CreateCommentInput = {
    post_id : Common.PostId;
    content : Text;
  };

  public type UserProfile = {
    principal_id : Principal;
    var username : Text;
    var bio : Text;
    var avatar_key : ?Text;
    var follows : Set.Set<Principal>;
    created_at : Common.Timestamp;
  };

  public type UserProfilePublic = {
    principal_id : Principal;
    username : Text;
    bio : Text;
    avatar_key : ?Text;
    follower_count : Nat;
    following_count : Nat;
    created_at : Common.Timestamp;
  };

  public type SaveProfileInput = {
    username : Text;
    bio : Text;
    avatar_key : ?Text;
  };
};
