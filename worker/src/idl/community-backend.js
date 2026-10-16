/** Minimal backend IDL for Captain Capsaicin Community Garden ops. */
export function communityBackendIdlFactory({ IDL }) {
  const Timestamp = IDL.Int;
  const PostId = IDL.Nat;
  const CommentId = IDL.Nat;

  const CreatePostInput = IDL.Record({
    content: IDL.Text,
    nft_token_id: IDL.Opt(IDL.Nat),
    image_key: IDL.Opt(IDL.Text),
    image_keys: IDL.Vec(IDL.Text),
    anonymous: IDL.Bool,
    plant_id: IDL.Opt(IDL.Nat),
  });

  const PostPublic = IDL.Record({
    id: PostId,
    updated_at: Timestamp,
    content: IDL.Text,
    author_text: IDL.Text,
    comment_count: IDL.Nat,
    nft_token_id: IDL.Opt(IDL.Nat),
    image_key: IDL.Opt(IDL.Text),
    like_count: IDL.Nat,
    created_at: Timestamp,
    author_principal: IDL.Opt(IDL.Principal),
    image_keys: IDL.Vec(IDL.Text),
    tip_count: IDL.Nat,
    author_username: IDL.Opt(IDL.Text),
    is_anonymous: IDL.Bool,
    caller_liked: IDL.Bool,
    plant_id: IDL.Opt(IDL.Nat),
  });

  const CreateCommentInput = IDL.Record({
    post_id: PostId,
    content: IDL.Text,
    anonymous: IDL.Bool,
  });

  const CommentPublic = IDL.Record({
    id: CommentId,
    post_id: PostId,
    content: IDL.Text,
    author_text: IDL.Text,
    like_count: IDL.Nat,
    created_at: Timestamp,
    author: IDL.Principal,
    author_username: IDL.Opt(IDL.Text),
    is_anonymous: IDL.Bool,
    caller_liked: IDL.Bool,
  });

  const SaveProfileInput = IDL.Record({
    bio: IDL.Text,
    username: IDL.Text,
    avatar_key: IDL.Opt(IDL.Text),
    location: IDL.Opt(IDL.Text),
  });

  const StoredFile = IDL.Record({
    path: IDL.Text,
    mime_type: IDL.Text,
    size: IDL.Nat,
  });

  const AgeAttestationPublic = IDL.Record({
    attestedAt: IDL.Int,
    method: IDL.Text,
  });

  return IDL.Service({
    setAgeAttestation: IDL.Func([], [AgeAttestationPublic], []),
    getMyAgeAttestation: IDL.Func(
      [],
      [IDL.Opt(AgeAttestationPublic)],
      ["query"],
    ),
    createPost: IDL.Func([CreatePostInput], [PostPublic], []),
    createComment: IDL.Func([CreateCommentInput], [CommentPublic], []),
    listPosts: IDL.Func([], [IDL.Vec(PostPublic)], ["query"]),
    listCommentsByPost: IDL.Func([PostId], [IDL.Vec(CommentPublic)], ["query"]),
    saveProfile: IDL.Func([SaveProfileInput], [IDL.Bool], []),
    storeCommunityImage: IDL.Func(
      [IDL.Text, IDL.Vec(IDL.Nat8), IDL.Text],
      [StoredFile],
      [],
    ),
    storeAvatarFile: IDL.Func([IDL.Vec(IDL.Nat8)], [IDL.Text], []),
    storeProfileBannerFile: IDL.Func([IDL.Vec(IDL.Nat8)], [IDL.Text], []),
    setProfileBanner: IDL.Func([IDL.Text], [], []),
  });
}
