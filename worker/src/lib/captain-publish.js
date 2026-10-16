/**
 * Auto-publish Captain Capsaicin standalone posts to Community + Crumbeatr + SWOP.
 * Every post requires a unique OWNER-PAID MiniRouter image (fail closed).
 */

import { createCrumbeatrClient } from "../clients/crumbeatr.js";
import { createSwopClient, SWOP_CORE, SWOP_SOCIAL } from "../clients/swop.js";
import { createCommunityClient } from "../clients/community.js";
import { prepareCaptainPostMedia } from "./images/captain-post-image.js";
import { patchCaptainProofPosts } from "./images/host-frontend.js";
import { runComplianceRules } from "./compliance.js";
import { captainPostUrls } from "./captain-post-urls.js";
import { promoteCaptainPublishOnX } from "./captain-x.js";

function sanitizeBody(body) {
  return String(body || "")
    .replace(/https?:\/\/[a-z0-9-]+\.icp0\.io\/?/gi, "https://icspicy.app/")
    .replace(/https?:\/\/[a-z0-9-]+\.raw\.icp0\.io\/?/gi, "https://icspicy.app/")
    .trim();
}

/**
 * @param {object} ctx
 * @param {string} body
 * @param {{ skipCompliance?: boolean }} [opts]
 */
export async function publishCaptainStandalonePost(ctx, body, opts = {}) {
  const { secrets, captainIdentity } = ctx;
  if (!captainIdentity) throw new Error("captain identity missing");

  let text = sanitizeBody(body);
  if (text.length < 20) throw new Error("post body too short");

  if (!opts.skipCompliance) {
    const rules = runComplianceRules(text);
    if (!rules.passed) {
      throw new Error(`compliance blocked post: ${rules.notes || "failed"}`);
    }
  }

  const media = await prepareCaptainPostMedia(text, {
    platform: "both",
    requireImage: true,
  });
  if (media.skipped || media.mock) {
    throw new Error("Captain image required: generation skipped or mock");
  }

  const notes = [];
  if (media.pow) notes.push(media.pow);

  let crumbeatrPostId = null;
  let swopPostId = null;

  const community = await createCommunityClient({ identity: captainIdentity });
  await community.ensureAgeAttestation();
  const imageKey = await community.uploadPostImage(media.jpeg);
  const commPost = await community.createPost(text, [imageKey]);
  notes.push(`community#${commPost.id}`);

  try {
    const crumb = await createCrumbeatrClient({
      identity: captainIdentity,
      canisterId: secrets.crumbeatr_canister_id || undefined,
    });
    const postId = await crumb.addPost(media.bodyCrumbeatr, {
      blobs: media.crumbeatrBlobs,
    });
    crumbeatrPostId = String(postId);
    notes.push(`crumbeatr#${postId}`);
    if (media.blobId) {
      await patchCaptainProofPosts(media.blobId, {
        crumbeatr: crumbeatrPostId,
        community: String(commPost.id),
      });
    }
  } catch (err) {
    throw new Error(
      `crumbeatr publish failed after community#${commPost.id}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  try {
    const swop = await createSwopClient({
      identity: captainIdentity,
      coreId: secrets.swop_backend_canister_id || SWOP_CORE,
      socialId: secrets.swop_social_canister_id || SWOP_SOCIAL,
    });
    const post = await swop.createPost(media.bodySwop, {
      mediaUrl: media.imageUrl,
      mimeType: "image/jpeg",
    });
    swopPostId = String(post.id);
    notes.push(`swop#${post.id}`);
    if (media.blobId) {
      const urls = captainPostUrls({ crumbeatrPostId, swopPostId });
      await patchCaptainProofPosts(media.blobId, {
        swop: swopPostId,
        community: String(commPost.id),
        crumbeatr: crumbeatrPostId,
      }, { urls });
    }
  } catch (err) {
    throw new Error(
      `swop publish failed after community#${commPost.id}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  if (media.shareUrl) notes.push(`share=${media.shareUrl}`);

  let xTweetUrl = null;
  try {
    const x = await promoteCaptainPublishOnX(ctx, {
      body: text,
      media,
      crumbeatrPostId,
      swopPostId,
    });
    if (x.ok && x.url) {
      xTweetUrl = x.url;
      notes.push(`x_tweet=${x.url}`);
    } else if (x.skipped) {
      notes.push(`x_skipped=${x.reason}`);
    } else if (x.error) {
      notes.push(`x_failed=${x.error}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    notes.push(`x_failed=${msg}`);
  }

  return {
    notes: notes.join(", "),
    communityPostId: String(commPost.id),
    crumbeatrPostId,
    swopPostId,
    body: text,
    xTweetUrl,
    media,
  };
}
