/**
 * Captain Capsaicin image prompt builder.
 *
 * Emits a compact JSON prompt string for MiniRouter /v1/images/edits.
 * Character identity stays locked to worker/assets/captain-capsaicin-ref.png;
 * camera / scene / mood rotate so posts do not look like the same still.
 */

/** Locked identity — must match the reference PNG (do not paraphrase lightly). */
export const CAPTAIN_IDENTITY = Object.freeze({
  name: "Captain Capsaicin",
  species: "anthropomorphic glossy red chili-pepper head",
  head: "short curved green stem, bright orange-yellow flame halo",
  face: "oversized diamond-encrusted black sunglasses, wide confident mischievous grin, bright white teeth",
  hands: "textured reddish-orange pepper-skin hands",
  wardrobe:
    "sharp navy-blue tailored suit jacket, three thick iced-out diamond Cuban-link chains, large circular diamond citrus-slice medallion, diamond bracelet",
  render:
    "hyper-realistic 3D cinematic, Unreal Engine 5 quality, rich specular highlights, vibrant color",
});

export const CAPTAIN_NEGATIVE = [
  "blurry",
  "low-res",
  "deformed face",
  "extra limbs",
  "duplicate character",
  "readable UI text",
  "watermark",
  "logo spam",
  "stock photo",
  "flat 2d cartoon",
  "changing sunglasses style",
  "removing flame halo",
  "human head instead of chili pepper",
];

/** Creative camera kit — pick one per post for variety while keeping identity. */
export const CAMERA_ANGLES = Object.freeze([
  {
    id: "low_hero",
    shot: "low-angle medium close-up",
    lens: "35mm equivalent, slight wide distortion",
    note: "heroic presence, chains catch specular light from below",
  },
  {
    id: "three_quarter",
    shot: "three-quarter portrait, camera at eye level",
    lens: "50mm equivalent",
    note: "classic character card, soft background separation",
  },
  {
    id: "over_shoulder",
    shot: "over-shoulder looking into the scene",
    lens: "40mm equivalent",
    note: "storytelling depth, environment readable behind him",
  },
  {
    id: "profile_rim",
    shot: "strict profile silhouette with flame rim-light",
    lens: "85mm equivalent",
    note: "dramatic chili outline, diamonds sparkle on edges",
  },
  {
    id: "dutch_cocky",
    shot: "subtle dutch-tilt close-up",
    lens: "50mm equivalent",
    note: "mischievous swagger without extreme tilt",
  },
  {
    id: "wide_environ",
    shot: "full-body wide environmental",
    lens: "28mm equivalent",
    note: "place him in the world; keep face recognizable",
  },
  {
    id: "high_crane",
    shot: "high three-quarter looking slightly up at camera",
    lens: "35mm equivalent",
    note: "confident acknowledgment, greenhouse or arena below",
  },
  {
    id: "macro_details",
    shot: "tight bust / chest-up with chain medallion sharp",
    lens: "85mm equivalent, shallow DOF",
    note: "jewelry and flame halo as hero detail",
  },
]);

const MOOD_SETS = Object.freeze({
  garden: {
    location: "lush pepper greenhouse with terracotta pots",
    light: "golden-hour horticulture side light",
    props: ["seed trays", "mist in air", "leaf canopy bokeh"],
  },
  gaming: {
    location: "neon cyber arena with soft HUD bokeh (no readable text)",
    light: "magenta-cyan rim lights",
    props: ["glowing floor runes", "distant Blade Grove energy"],
  },
  celebrating: {
    location: "victory spotlight stage",
    light: "warm key + sparkle streaks",
    props: ["confetti light, not clutter", "subtle lens flare"],
  },
  educational: {
    location: "clean botanical lab desk",
    light: "soft north-window daylight",
    props: ["labeled seed trays (blurred labels)", "glass beakers"],
  },
  flex: {
    location: "luxury golden-hour car interior with ornate gold filigree",
    light: "warm specular bounce from dashboard",
    props: ["iced chains reflecting cabin chrome"],
  },
});

function hash32(str) {
  let h = 2166136261;
  const s = String(str || "");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickAngle(seed) {
  const i = hash32(seed) % CAMERA_ANGLES.length;
  return CAMERA_ANGLES[i];
}

function moodFor(moodKey) {
  return MOOD_SETS[moodKey] || MOOD_SETS.flex;
}

/**
 * Turn a long post into a short cinematic action beat (not a quote dump).
 * @param {string} body
 * @param {number} [maxLen]
 */
export function sceneFromPostBody(body, maxLen = 160) {
  const t = String(body || "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/[#*_`>[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) {
    return "sharing a spicy on-chain update with the crew";
  }

  // Prefer first vivid sentence; fall back to truncated body.
  const sentence = t.split(/(?<=[.!?])\s+/)[0] || t;
  const cleaned = sentence.replace(/^["']+|["']+$/g, "").trim();
  const beat =
    cleaned.length > maxLen ? `${cleaned.slice(0, maxLen - 1)}…` : cleaned;

  // Soft verb framing so the model stages an action, not a wall of text.
  if (/^(i |we |the |what |if |how )/i.test(beat)) {
    return `reacting to: ${beat}`;
  }
  return beat;
}

/**
 * Build a JSON prompt string for edits (character lock + creative staging).
 *
 * @param {string} sceneDescription
 * @param {{
 *   mood?: string,
 *   styleExtras?: string,
 *   seed?: string|number,
 *   pretty?: boolean,
 * }} [opts]
 * @returns {string} JSON text suitable as the `prompt` form field
 */
export function buildCaptainPrompt(sceneDescription, opts = {}) {
  const scene = String(sceneDescription || "posing confidently").trim();
  const moodKey = opts.mood || "flex";
  const mood = moodFor(moodKey);
  const seed = String(opts.seed ?? `${moodKey}|${scene}|${Date.now()}`);
  const camera = pickAngle(seed);

  const payload = {
    task: "identity-locked character edit",
    instruction:
      "Preserve the reference character exactly. Change only pose, camera, wardrobe drape, and environment to match this brief.",
    subject: { ...CAPTAIN_IDENTITY },
    lock: {
      must_keep: [
        "chili-pepper head shape and gloss",
        "green stem",
        "orange-yellow flame halo",
        "diamond black sunglasses",
        "navy suit + iced chains + citrus medallion",
      ],
      single_character: true,
      no_readable_text: true,
    },
    camera: {
      angle_id: camera.id,
      shot: camera.shot,
      lens: camera.lens,
      directing_note: camera.note,
    },
    scene: {
      action: scene,
      mood: moodKey,
      location: mood.location,
      lighting: mood.light,
      props: mood.props,
      extras: opts.styleExtras || null,
    },
    composition: {
      framing: "hero character primary focus",
      depth: "cinematic foreground/midground/background separation",
      color: "vibrant chili red, navy, diamond sparkle, warm key",
    },
    avoid: CAPTAIN_NEGATIVE,
  };

  return JSON.stringify(payload, null, opts.pretty ? 2 : 0);
}

/** @deprecated alias — visual base string for logs / older callers */
export const CAPTAIN_VISUAL_BASE = [
  CAPTAIN_IDENTITY.name,
  CAPTAIN_IDENTITY.species,
  CAPTAIN_IDENTITY.head,
  CAPTAIN_IDENTITY.face,
  CAPTAIN_IDENTITY.hands,
  CAPTAIN_IDENTITY.wardrobe,
  CAPTAIN_IDENTITY.render,
].join(", ");
