import { getSpicyAiActor, toSpicyAiMessage, chatErrorToString } from "./spicyai-idl";
import {
  getPlantById,
  getStructureById,
  PLANT_CATALOG,
  STRUCTURE_CATALOG,
} from "./garden-plant-catalog";
import type { GardenDesign, PlantPlacement, StructurePlacement } from "./garden-types";
import { generateLayoutFallback } from "./garden-ai-fallback";

export type GeneratedLayoutPlant = {
  catalogId: string;
  x: number;
  y: number;
  scale?: number;
};

export type GeneratedLayoutStructure = {
  structureId: string;
  x: number;
  y: number;
  width?: number;
  depth?: number;
};

export type GeneratedLayout = {
  name: string;
  widthMeters: number;
  depthMeters: number;
  plants: GeneratedLayoutPlant[];
  structures: GeneratedLayoutStructure[];
  explanation: string;
};

const SYSTEM_PROMPT = `You are a professional Florida landscape architect and permaculture designer.
Given a user's garden description, generate a complete garden layout as JSON.

Rules:
- Only use plants from the provided Florida plant catalog (use exact catalogId values)
- Respect companion planting (companions together, antagonists apart)
- Proper spacing based on mature width
- Layer: canopy trees → understory → shrubs → herbs → groundcover
- Include paths, raised beds, irrigation, compost where appropriate
- Zone 10a Florida assumptions

JSON schema:
{
  "name": "My Food Forest",
  "widthMeters": 20,
  "depthMeters": 30,
  "plants": [{ "catalogId": "carolina-reaper", "x": 5.0, "y": 3.0, "scale": 1.0 }],
  "structures": [{ "structureId": "raised-bed-4x2", "x": 2.0, "y": 1.0, "width": 4, "depth": 2 }],
  "explanation": "Brief design rationale..."
}

CRITICAL: Respond with ONLY the JSON object. No explanation, no markdown, no code fences.
Start your response with { and end with }. Nothing else.`;

function availablePlantsList(max = 50): string {
  return PLANT_CATALOG.slice(0, max)
    .map((p) => `${p.id}: ${p.name} (${p.matureWidth}m spread)`)
    .join("\n");
}

function structureSnippet(): string {
  return STRUCTURE_CATALOG.map((s) => `${s.id}|${s.name}|${s.defaultWidth}x${s.defaultDepth}`).join("\n");
}

export function extractJson(text: string): GeneratedLayout | null {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed) as GeneratedLayout;
  } catch {
    /* continue */
  }

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch?.[1]) {
    try {
      return JSON.parse(fenceMatch[1].trim()) as GeneratedLayout;
    } catch {
      /* continue */
    }
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1)) as GeneratedLayout;
    } catch {
      /* continue */
    }
  }

  return null;
}

function validateLayout(raw: GeneratedLayout, plotW: number, plotD: number): GeneratedLayout {
  const plants = (raw.plants ?? [])
    .filter((p) => getPlantById(p.catalogId))
    .map((p) => ({
      catalogId: p.catalogId,
      x: Math.max(0, Math.min(plotW, p.x)),
      y: Math.max(0, Math.min(plotD, p.y)),
      scale: p.scale ?? 1,
    }))
    .slice(0, 200);

  const structures = (raw.structures ?? [])
    .filter((s) => getStructureById(s.structureId))
    .map((s) => {
      const def = getStructureById(s.structureId)!;
      return {
        structureId: s.structureId,
        x: Math.max(0, Math.min(plotW, s.x)),
        y: Math.max(0, Math.min(plotD, s.y)),
        width: s.width ?? def.defaultWidth,
        depth: s.depth ?? def.defaultDepth,
      };
    })
    .slice(0, 30);

  return {
    name: raw.name?.slice(0, 120) || "AI Garden Design",
    widthMeters: Math.min(100, Math.max(2, raw.widthMeters || plotW)),
    depthMeters: Math.min(100, Math.max(2, raw.depthMeters || plotD)),
    plants,
    structures,
    explanation: raw.explanation || "AI-generated layout for your Florida garden.",
  };
}

export function layoutToDesign(
  layout: GeneratedLayout,
  existing?: GardenDesign,
): GardenDesign {
  let pid = 1;
  let sid = 1;
  const plants: PlantPlacement[] = layout.plants.map((p) => {
    const cat = getPlantById(p.catalogId)!;
    const plant: PlantPlacement = {
      id: pid++,
      varietyId: null,
      catalogId: p.catalogId,
      label: cat.name,
      x: p.x,
      y: p.y,
      rotation: 0,
      scale: Math.min(2, Math.max(0.5, p.scale ?? 1)),
      color: cat.color,
      icon: cat.iconEmoji,
      scoville: cat.scovilleMax,
    };
    return plant;
  });

  const structures: StructurePlacement[] = layout.structures.map((s) => {
    const def = getStructureById(s.structureId)!;
    return {
      id: sid++,
      structureType: s.structureId,
      x: s.x,
      y: s.y,
      width: s.width ?? def.defaultWidth,
      depth: s.depth ?? def.defaultDepth,
      rotation: 0,
      color: def.color,
    };
  });

  return {
    id: existing?.id ?? null,
    name: layout.name,
    description: layout.explanation,
    plants,
    structures,
    widthMeters: layout.widthMeters,
    depthMeters: layout.depthMeters,
    gridSizeMeters: existing?.gridSizeMeters ?? 1,
    isPublic: existing?.isPublic ?? false,
  };
}

export async function generateGardenLayout(
  userPrompt: string,
  plotWidth: number,
  plotDepth: number,
  zone: string,
): Promise<GeneratedLayout> {
  const userMessage = `Available plants:
${availablePlantsList(50)}

STRUCTURES (structureId|name|size):
${structureSnippet()}

Design request: ${userPrompt}
Plot: ${plotWidth}m × ${plotDepth}m, Zone ${zone}`;

  const actor = getSpicyAiActor();
  if (actor) {
    try {
      const res = await actor.chatWithLlm({
        messages: [
          toSpicyAiMessage({ role: "user", content: `${SYSTEM_PROMPT}\n\n${userMessage}` }),
        ],
      });
      if (res.ok?.response) {
        const parsed = extractJson(res.ok.response);
        if (parsed && parsed.plants?.length) {
          return validateLayout(parsed, plotWidth, plotDepth);
        }
        console.warn("SpicyAI garden: parsed JSON missing plants", res.ok.response.slice(0, 200));
      }
      if (res.err) {
        console.warn("SpicyAI garden layout:", chatErrorToString(res.err));
      }
    } catch (e) {
      console.warn("SpicyAI call failed, using fallback", e);
    }
  }

  return generateLayoutFallback(userPrompt, plotWidth, plotDepth, zone);
}

export const PRESET_PROMPTS = [
  { id: "pepper", emoji: "🌶️", label: "Pepper paradise", prompt: "All the hottest pepper varieties with companion basil and marigolds in raised beds" },
  { id: "forest", emoji: "🌳", label: "Tropical food forest", prompt: "Food forest with mango, avocado canopy, citrus understory, moringa, pigeon pea nitrogen fixers" },
  { id: "pollinator", emoji: "🦋", label: "Pollinator garden", prompt: "Florida native pollinator garden with milkweed, scorpion tail, blanket flower, native shrubs" },
  { id: "homestead", emoji: "🐔", label: "Backyard homestead", prompt: "Homestead with chicken coop, veggie raised beds, fruit trees, drip irrigation, compost" },
  { id: "herbs", emoji: "🌿", label: "Medicinal herb spiral", prompt: "Herb spiral with basil, rosemary, lemongrass, turmeric, moringa, culantro" },
  { id: "oasis", emoji: "🏝️", label: "Tropical oasis", prompt: "Tropical oasis with palms, bird of paradise, pond, shade sail, ornamental paths" },
] as const;

export function surprisePrompt(): string {
  const themes = PRESET_PROMPTS.map((p) => p.prompt);
  return themes[Math.floor(Math.random() * themes.length)]!;
}
