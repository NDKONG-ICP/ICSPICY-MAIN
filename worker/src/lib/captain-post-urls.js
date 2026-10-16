/** Public deep links for Captain Capsaicin posts (best-effort; SWOP/Crumbeatr UIs evolve). */

export const CAPTAIN_SWOP_HANDLE = "CaptainCapsaicin";
export const SWOP_PROFILE = `https://theswop.app/@${CAPTAIN_SWOP_HANDLE}`;
export const CRUMBEATR_HOME = "https://crumbeatr.xyz";

/**
 * @param {string|number|null|undefined} postId
 * @returns {string|null}
 */
export function swopPostUrl(postId) {
  if (postId == null || postId === "") return null;
  const id = String(postId).trim();
  if (!id) return null;
  if (id.startsWith("http")) return id;
  const slug = id.startsWith("post-") ? id : `post-${id}`;
  return `${SWOP_PROFILE}/${slug}`;
}

/**
 * @param {string|number|null|undefined} postId
 * @returns {string|null}
 */
export function crumbeatrPostUrl(postId) {
  if (postId == null || postId === "") return null;
  const id = String(postId).trim();
  if (!id) return null;
  return `${CRUMBEATR_HOME}/#/post/${id}`;
}

/**
 * @param {{ crumbeatrPostId?: string|null, swopPostId?: string|null }} ids
 */
export function captainPostUrls(ids) {
  return {
    swop: swopPostUrl(ids.swopPostId),
    crumbeatr: crumbeatrPostUrl(ids.crumbeatrPostId),
  };
}
