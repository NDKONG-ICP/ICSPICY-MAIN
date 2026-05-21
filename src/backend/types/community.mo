import Common "common";
import Set "mo:core/Set";

module {
  public type Post = {
    id : Common.PostId;
    author : Principal;
    anonymous : Bool;
    var content : Text;
    image_key : ?Text;
    image_keys : [Text];
    plant_id : ?Nat;
    nft_token_id : ?Nat;
    likes : Set.Set<Principal>;
    created_at : Common.Timestamp;
    var updated_at : Common.Timestamp;
    var is_deleted : Bool;
  };

  public type PostPublic = {
    id : Common.PostId;
    author_text : Text;
    author_principal : ?Principal;
    author_username : ?Text;
    content : Text;
    image_key : ?Text;
    image_keys : [Text];
    plant_id : ?Nat;
    nft_token_id : ?Nat;
    like_count : Nat;
    comment_count : Nat;
    tip_count : Nat;
    caller_liked : Bool;
    is_anonymous : Bool;
    created_at : Common.Timestamp;
    updated_at : Common.Timestamp;
  };

  public type Comment = {
    id : Common.CommentId;
    post_id : Common.PostId;
    author : Principal;
    anonymous : Bool;
    content : Text;
    likes : Set.Set<Principal>;
    created_at : Common.Timestamp;
    var is_deleted : Bool;
  };

  public type CommentPublic = {
    id : Common.CommentId;
    post_id : Common.PostId;
    author : Principal;
    author_username : ?Text;
    author_text : Text;
    content : Text;
    like_count : Nat;
    caller_liked : Bool;
    is_anonymous : Bool;
    created_at : Common.Timestamp;
  };

  public type Tip = {
    id : Nat;
    from_principal : Principal;
    to_principal : Principal;
    post_id : Common.PostId;
    ledger_canister_id : Text;
    amount : Nat;
    block_index : Nat;
    created_at : Common.Timestamp;
  };

  public type TipPublic = {
    id : Nat;
    from_principal : Principal;
    to_principal : Principal;
    post_id : Common.PostId;
    ledger_canister_id : Text;
    amount : Nat;
    block_index : Nat;
    created_at : Common.Timestamp;
  };

  public type CreatePostInput = {
    content : Text;
    image_key : ?Text;
    image_keys : [Text];
    anonymous : Bool;
    plant_id : ?Nat;
    nft_token_id : ?Nat;
  };

  public type CreateCommentInput = {
    post_id : Common.PostId;
    content : Text;
    anonymous : Bool;
  };

  public type UserProfile = {
    principal_id : Principal;
    var username : Text;
    var bio : Text;
    var avatar_key : ?Text;
    var location : ?Text;
    var follows : Set.Set<Principal>;
    created_at : Common.Timestamp;
  };

  public type UserProfilePublic = {
    principal_id : Principal;
    username : Text;
    bio : Text;
    avatar_key : ?Text;
    location : ?Text;
    follower_count : Nat;
    following_count : Nat;
    post_count : Nat;
    is_admin : Bool;
    caller_following : Bool;
    created_at : Common.Timestamp;
  };

  public type SaveProfileInput = {
    username : Text;
    bio : Text;
    avatar_key : ?Text;
    location : ?Text;
  };

  public type PostWithComments = {
    post : PostPublic;
    comments : [CommentPublic];
    has_liked : Bool;
  };

  public type RecordTipInput = {
    post_id : Common.PostId;
    ledger_canister_id : Text;
    amount : Nat;
    block_index : Nat;
  };
};
