// SWOP client — The Swop social protocol on ICP.
//
// Canisters (from frontend config Pt):
//   swop_core   54t4w-zqaaa-aaaac-qgema-cai  — register / profile / tips
//   swop_social 5srr6-caaaa-aaaac-qgena-cai  — posts / comments / likes
//   agent_registry 4u43w-sqaaa-aaaac-qgiha-cai — agent registration (optional)

import { Actor, HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { readFileSync } from "node:fs";

export const SWOP_CORE = "54t4w-zqaaa-aaaac-qgema-cai";
export const SWOP_SOCIAL = "5srr6-caaaa-aaaac-qgena-cai";
export const SWOP_AGENT_REGISTRY = "4u43w-sqaaa-aaaac-qgiha-cai";

function coreIdl({ IDL }) {
  const UserRecord = IDL.Record({
    id: IDL.Principal,
    username: IDL.Opt(IDL.Text),
    createdAt: IDL.Nat64,
    creatorStatus: IDL.Variant({
      None: IDL.Null,
      Active: IDL.Null,
      Suspended: IDL.Null,
    }),
    referredBy: IDL.Opt(IDL.Principal),
  });
  const CoreError = IDL.Variant({
    AlreadyExists: IDL.Null,
    NotFound: IDL.Null,
    Unauthorized: IDL.Null,
    InvalidInput: IDL.Text,
    SelfReferral: IDL.Null,
    ReferralAlreadySet: IDL.Null,
    StationInactive: IDL.Null,
    AgentRevoked: IDL.Null,
  });
  const UserResult = IDL.Variant({ ok: UserRecord, err: CoreError });
  const UnitResult = IDL.Variant({ ok: IDL.Null, err: CoreError });
  const LegalVersions = IDL.Record({
    minimumAge: IDL.Nat,
    privacyVersion: IDL.Text,
    termsVersion: IDL.Text,
  });
  const ConsentStatus = IDL.Record({
    principal: IDL.Principal,
    hasConsent: IDL.Bool,
    isCurrent: IDL.Bool,
    storedTermsVersion: IDL.Text,
    currentTermsVersion: IDL.Text,
    storedPrivacyVersion: IDL.Text,
    currentPrivacyVersion: IDL.Text,
    confirmedAgeMinimum: IDL.Nat,
    acceptedAt: IDL.Nat64,
  });
  const FriendTarget = IDL.Variant({
    User: IDL.Principal,
    Agent: IDL.Text,
  });
  return IDL.Service({
    getLegalVersions: IDL.Func([], [LegalVersions], ["query"]),
    getMyConsentStatus: IDL.Func([], [ConsentStatus], ["query"]),
    recordConsent: IDL.Func(
      [IDL.Text, IDL.Text, IDL.Nat, IDL.Text],
      [UnitResult],
      [],
    ),
    registerUser: IDL.Func(
      [IDL.Opt(IDL.Text), IDL.Opt(IDL.Principal)],
      [UserResult],
      [],
    ),
    setUsername: IDL.Func([IDL.Text], [UnitResult], []),
    getUser: IDL.Func([IDL.Principal], [IDL.Opt(UserRecord)], ["query"]),
    getUserByUsername: IDL.Func([IDL.Text], [IDL.Opt(UserRecord)], ["query"]),
    setProfileImageBlob: IDL.Func([IDL.Vec(IDL.Nat8), IDL.Text], [UnitResult], []),
    setProfileImageUrl: IDL.Func([IDL.Text], [UnitResult], []),
    setBannerBlob: IDL.Func([IDL.Vec(IDL.Nat8), IDL.Text], [UnitResult], []),
    setBannerUrl: IDL.Func([IDL.Text], [UnitResult], []),
    setBio: IDL.Func([IDL.Text], [UnitResult], []),
    recordTip: IDL.Func(
      [FriendTarget, IDL.Nat, IDL.Opt(IDL.Text)],
      [UnitResult],
      [],
    ),
  });
}

function socialIdl({ IDL }) {
  const PostId = IDL.Text;
  const CommentId = IDL.Text;
  const StationId = IDL.Text;
  const Timestamp = IDL.Nat64;
  const AgentId = IDL.Text;
  const SocialError = IDL.Variant({
    AgentConstraintViolated: IDL.Text,
    AgentNotActive: IDL.Null,
    AgentNotPermitted: IDL.Null,
    InvalidInput: IDL.Text,
    NotFound: IDL.Null,
    NotRegistered: IDL.Null,
    PrivateLaunchRestricted: IDL.Null,
    StationInactive: IDL.Null,
    StationNotFound: IDL.Null,
    Unauthorized: IDL.Null,
  });
  const UnitResult = IDL.Variant({ ok: IDL.Null, err: SocialError });
  const MediaAccessPolicy = IDL.Variant({
    CreatorOnly: IDL.Null,
    Paid: IDL.Null,
    Public: IDL.Null,
  });
  const MediaRef = IDL.Record({
    accessPolicy: MediaAccessPolicy,
    mediaId: IDL.Text,
    mimeType: IDL.Text,
  });
  const ExecutionContext = IDL.Record({
    agentId: AgentId,
    capabilitySnapshotId: IDL.Opt(IDL.Text),
    executedAt: Timestamp,
  });
  const PostScope = IDL.Variant({
    both: IDL.Null,
    global: IDL.Null,
    station: IDL.Null,
  });
  const CreatePostInput = IDL.Record({
    commentRepostRef: IDL.Opt(CommentId),
    content: IDL.Text,
    mediaRef: IDL.Opt(MediaRef),
    mediaRefs: IDL.Opt(IDL.Vec(MediaRef)),
    referencedAssets: IDL.Opt(IDL.Vec(IDL.Empty)),
    repostOf: IDL.Opt(PostId),
    scope: IDL.Opt(PostScope),
    stationId: IDL.Opt(StationId),
  });
  const Post = IDL.Record({
    author: IDL.Principal,
    content: IDL.Text,
    createdAt: Timestamp,
    deleted: IDL.Bool,
    editedAt: IDL.Opt(Timestamp),
    executionContext: IDL.Opt(ExecutionContext),
    id: PostId,
    mediaRef: IDL.Opt(MediaRef),
    repostOf: IDL.Opt(PostId),
    stationId: IDL.Opt(StationId),
  });
  const PostResult = IDL.Variant({ ok: Post, err: SocialError });
  const CommentView = IDL.Record({
    author: IDL.Principal,
    content: IDL.Text,
    createdAt: Timestamp,
    deleted: IDL.Bool,
    deletedAt: IDL.Opt(IDL.Int),
    deletionKind: IDL.Opt(IDL.Empty),
    executionContext: IDL.Opt(ExecutionContext),
    id: CommentId,
    parentCommentId: IDL.Opt(CommentId),
    postId: PostId,
  });
  const CommentResult = IDL.Variant({ ok: CommentView, err: SocialError });

  return IDL.Service({
    createPostV1: IDL.Func([CreatePostInput, IDL.Nat64], [PostResult], []),
    addComment: IDL.Func([PostId, IDL.Text], [CommentResult], []),
    addLike: IDL.Func([PostId], [UnitResult], []),
    getPublicFeed: IDL.Func([IDL.Nat, IDL.Nat], [IDL.Vec(Post)], ["query"]),
    getPublicRecentPosts: IDL.Func([IDL.Nat], [IDL.Vec(Post)], ["query"]),
    getPostsByUser: IDL.Func([IDL.Principal], [IDL.Vec(Post)], ["query"]),
    getLikeCount: IDL.Func([PostId], [IDL.Nat], ["query"]),
  });
}

function unwrap(res, label) {
  if (res && "ok" in res) return res.ok;
  if (res && "Ok" in res) return res.Ok;
  const err = res?.err ?? res?.Err ?? res;
  throw new Error(`${label}: ${JSON.stringify(err)}`);
}

export async function createSwopClient({
  identity,
  coreId = SWOP_CORE,
  socialId = SWOP_SOCIAL,
  host = "https://icp-api.io",
}) {
  const agent = await HttpAgent.create({ host, identity });
  const me = identity.getPrincipal();
  const core = Actor.createActor(coreIdl, { agent, canisterId: coreId });
  const social = Actor.createActor(socialIdl, { agent, canisterId: socialId });

  return {
    principal: me,
    core,
    social,

    async getUser() {
      const u = await core.getUser(me);
      return u?.[0] ?? null;
    },

    async ensureRegistered(username = "CaptainCapsaicin") {
      let existing = await this.getUser();
      if (!existing) {
        const legal = await core.getLegalVersions();
        const consent = await core.recordConsent(
          legal.termsVersion,
          legal.privacyVersion,
          legal.minimumAge,
          "ic-spicy-captain-agent",
        );
        unwrap(consent, "recordConsent");

        const res = await core.registerUser([username], []);
        existing = unwrap(res, "registerUser");
      }

      // registerUser can store username on the record without indexing it for
      // /@handle lookups — setUsername claims the public handle index.
      const indexed = await core.getUserByUsername(username);
      if (!indexed?.[0]) {
        try {
          unwrap(await this.setUsername(username), "setUsername");
        } catch (err) {
          // Already claimed by us is fine; anything else surfaces.
          if (!/AlreadyExists/i.test(err.message)) throw err;
        }
      }
      return (await this.getUser()) ?? existing;
    },

    async setUsername(username) {
      return core.setUsername(username);
    },

    async setAvatarFromFile(path, mime = "image/jpeg") {
      const bytes = readFileSync(path);
      unwrap(
        await core.setProfileImageBlob([...bytes], mime),
        "setProfileImageBlob",
      );
      // SWOP UI only renders the blob when profileImageUrl carries this marker.
      const marker = `swop-avatar:v1:${Date.now()}`;
      unwrap(await core.setProfileImageUrl(marker), "setProfileImageUrl");
      return marker;
    },

    async setBannerFromFile(path, mime = "image/jpeg") {
      const bytes = readFileSync(path);
      unwrap(await core.setBannerBlob([...bytes], mime), "setBannerBlob");
      const marker = `swop-banner:v1:${Date.now()}`;
      unwrap(await core.setBannerUrl(marker), "setBannerUrl");
      return marker;
    },

    async setBio(bio) {
      return unwrap(await core.setBio(bio), "setBio");
    },

    async createPost(content, { stationId = null } = {}) {
      const input = {
        content,
        mediaRef: [],
        mediaRefs: [],
        referencedAssets: [],
        repostOf: [],
        scope: [],
        stationId: stationId ? [stationId] : [],
        commentRepostRef: [],
      };
      const res = await social.createPostV1(input, 0n);
      return unwrap(res, "createPostV1");
    },

    async addComment(postId, content) {
      return unwrap(await social.addComment(postId, content), "addComment");
    },

    async addLike(postId) {
      return unwrap(await social.addLike(postId), "addLike");
    },

    async publicFeed(limit = 20n) {
      try {
        return await social.getPublicFeed(0n, limit);
      } catch (e) {
        console.warn(`[swop] feed decode failed: ${e.message}`);
        return [];
      }
    },

    async tipUser(toPrincipal, amountE8s, postId = null) {
      return unwrap(
        await core.recordTip(
          { User: toPrincipal },
          amountE8s,
          postId ? [postId] : [],
        ),
        "recordTip",
      );
    },
  };
}
