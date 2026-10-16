import { Actor, HttpAgent } from "@dfinity/agent";
import { communityBackendIdlFactory } from "../idl/community-backend.js";
import { getHost } from "./hub.js";

const DEFAULT_BACKEND =
  process.env.BACKEND_CANISTER_ID?.trim() ?? "ghxmp-xiaaa-aaaao-ba4sq-cai";

export function buildCommunityImagePath(principalText) {
  const id =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Math.random().toString(36).slice(2)}`;
  return `community-images/${principalText}/${Date.now()}-${id}.jpg`;
}

export async function createCommunityClient({ identity, canisterId = DEFAULT_BACKEND }) {
  const host = getHost(process.env.DFX_NETWORK ?? "ic");
  const agent = await HttpAgent.create({ host, identity });
  if (host.includes("127.0.0.1")) await agent.fetchRootKey();
  const actor = Actor.createActor(communityBackendIdlFactory, {
    agent,
    canisterId,
  });
  const me = identity.getPrincipal();
  const meText = me.toText();

  return {
    principal: me,
    principalText: meText,
    actor,

    async saveProfile(input) {
      return actor.saveProfile({
        username: input.username,
        bio: input.bio,
        avatar_key: input.avatar_key?.length ? [input.avatar_key] : [],
        location: input.location?.length ? [input.location] : [],
      });
    },

    async storeCommunityImage(jpegBytes, path) {
      const bytes =
        jpegBytes instanceof Uint8Array ? [...jpegBytes] : [...jpegBytes];
      const stored = await actor.storeCommunityImage(path, bytes, "image/jpeg");
      return stored.path;
    },

    async uploadPostImage(jpegBytes) {
      const path = buildCommunityImagePath(meText);
      await this.storeCommunityImage(jpegBytes, path);
      return path;
    },

    async ensureAgeAttestation() {
      const existing = await actor.getMyAgeAttestation();
      if (existing?.length) return existing[0];
      return actor.setAgeAttestation();
    },

    async createPost(content, imageKeys = []) {
      const keys = imageKeys.filter(Boolean);
      return actor.createPost({
        content,
        nft_token_id: [],
        image_key: keys[0] ? [keys[0]] : [],
        image_keys: keys,
        anonymous: false,
        plant_id: [],
      });
    },

    async createComment(postId, content) {
      return actor.createComment({
        post_id: BigInt(postId),
        content,
        anonymous: false,
      });
    },

    async listPosts() {
      return actor.listPosts();
    },

    async listCommentsByPost(postId) {
      return actor.listCommentsByPost(BigInt(postId));
    },

    async storeAvatarFile(jpegBytes) {
      const bytes =
        jpegBytes instanceof Uint8Array ? [...jpegBytes] : [...jpegBytes];
      return actor.storeAvatarFile(bytes);
    },

    async storeProfileBannerFile(jpegBytes) {
      const bytes =
        jpegBytes instanceof Uint8Array ? [...jpegBytes] : [...jpegBytes];
      return actor.storeProfileBannerFile(bytes);
    },

    async setProfileBanner(key) {
      return actor.setProfileBanner(key);
    },

    async myPosts(limit = 20) {
      const all = await this.listPosts();
      return all
        .filter((p) => {
          const a = p.author_principal?.[0];
          return a && a.toText() === meText;
        })
        .sort((a, b) => Number(b.created_at - a.created_at))
        .slice(0, limit);
    },
  };
}
