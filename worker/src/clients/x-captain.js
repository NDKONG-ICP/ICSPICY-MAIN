/**
 * X (Twitter) API — Captain Capsaicin account (OAuth 2.0 user context).
 * Secrets from agent_hub: x_captain_client_id, x_captain_client_secret,
 * x_captain_access_token, x_captain_refresh_token
 */

const TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
const TWEET_URL = "https://api.twitter.com/2/tweets";
const MEDIA_UPLOAD = "https://upload.twitter.com/1.1/media/upload.json";

function basicAuth(clientId, clientSecret) {
  return Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

export function xCaptainConfigured(secrets) {
  return Boolean(
    secrets?.x_captain_client_id &&
      secrets?.x_captain_client_secret &&
      (secrets?.x_captain_access_token || secrets?.x_captain_refresh_token),
  );
}

async function refreshAccessToken(secrets) {
  const clientId = secrets.x_captain_client_id;
  const clientSecret = secrets.x_captain_client_secret;
  const refresh = secrets.x_captain_refresh_token;
  if (!clientId || !clientSecret || !refresh) {
    throw new Error("X OAuth refresh tokens not configured");
  }
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth(clientId, clientSecret)}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refresh,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `X token refresh failed: ${data.error_description || data.error || res.status}`,
    );
  }
  return data.access_token;
}

async function accessToken(secrets) {
  if (secrets.x_captain_access_token) {
    return secrets.x_captain_access_token;
  }
  return refreshAccessToken(secrets);
}

/**
 * Simple upload (images ≤5MB).
 * @param {string} token
 * @param {Uint8Array} bytes
 * @param {string} mime
 */
async function uploadMedia(token, bytes, mime = "image/jpeg") {
  const b64 = Buffer.from(bytes).toString("base64");
  const res = await fetch(
    `${MEDIA_UPLOAD}?media_category=tweet_image`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        media_data: b64,
        media_type: mime,
      }),
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `X media upload failed: ${JSON.stringify(data).slice(0, 200)}`,
    );
  }
  const id = data.media_id_string ?? String(data.media_id);
  if (!id) throw new Error("X media upload missing media_id");
  return id;
}

/**
 * @param {Record<string, string>} secrets
 * @param {{ text: string, imageUrl?: string|null }} input
 * @returns {Promise<{ tweetId: string, url: string }>}
 */
export async function postCaptainTweet(secrets, input) {
  const token = await accessToken(secrets);
  let mediaIds = [];
  if (input.imageUrl) {
    const imgRes = await fetch(input.imageUrl);
    if (!imgRes.ok) throw new Error(`Could not fetch image ${input.imageUrl}`);
    const buf = new Uint8Array(await imgRes.arrayBuffer());
    const mediaId = await uploadMedia(token, buf);
    mediaIds = [mediaId];
  }

  const body = {
    text: input.text.slice(0, 280),
  };
  if (mediaIds.length) {
    body.media = { media_ids: mediaIds };
  }

  const res = await fetch(TWEET_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `X tweet failed: ${JSON.stringify(data).slice(0, 300)}`,
    );
  }
  const tweetId = data?.data?.id;
  if (!tweetId) throw new Error("X tweet missing id");
  return {
    tweetId,
    url: `https://x.com/i/web/status/${tweetId}`,
  };
}
