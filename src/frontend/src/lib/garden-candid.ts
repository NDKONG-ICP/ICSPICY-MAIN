import type { Principal } from "@icp-sdk/core/principal";
import type {
  CreateGardenDesignResult,
  GardenDesign as CandidGardenDesign,
  GardenDesignInput,
  PlantPlacement as CandidPlant,
  StructurePlacement as CandidStructure,
} from "../declarations/backend.did";
import type { GardenDesign, PlantPlacement, StructurePlacement } from "./garden-types";

function plantFromCandid(p: CandidPlant): PlantPlacement {
  return {
    id: Number(p.id),
    varietyId: p.varietyId.length ? Number(p.varietyId[0]) : null,
    label: p.plantLabel,
    x: p.x,
    y: p.y,
    rotation: p.rotation,
    scale: p.scale,
    color: p.color,
    icon: p.icon,
  };
}

function structureFromCandid(s: CandidStructure): StructurePlacement {
  return {
    id: Number(s.id),
    structureType: s.structureType,
    x: s.x,
    y: s.y,
    width: s.width,
    depth: s.depth,
    rotation: s.rotation,
    color: s.color,
  };
}

export function designFromCandid(d: CandidGardenDesign): GardenDesign {
  return {
    id: Number(d.id),
    name: d.name,
    description: d.description.length ? d.description[0] : null,
    plants: d.plants.map(plantFromCandid),
    structures: d.structures.map(structureFromCandid),
    widthMeters: d.widthMeters,
    depthMeters: d.depthMeters,
    gridSizeMeters: d.gridSizeMeters,
    isPublic: d.isPublic,
  };
}

function plantToCandid(p: PlantPlacement): CandidPlant {
  return {
    id: BigInt(p.id),
    varietyId: p.varietyId != null ? [BigInt(p.varietyId)] : [],
    plantLabel: p.label,
    x: p.x,
    y: p.y,
    rotation: p.rotation,
    scale: p.scale,
    color: p.color,
    icon: p.icon,
  };
}

function structureToCandid(s: StructurePlacement): CandidStructure {
  return {
    id: BigInt(s.id),
    structureType: s.structureType,
    x: s.x,
    y: s.y,
    width: s.width,
    depth: s.depth,
    rotation: s.rotation,
    color: s.color,
  };
}

export function designToInput(d: GardenDesign): GardenDesignInput {
  return {
    name: d.name,
    description: d.description != null ? [d.description] : [],
    plants: d.plants.map(plantToCandid),
    structures: d.structures.map(structureToCandid),
    widthMeters: d.widthMeters,
    depthMeters: d.depthMeters,
    gridSizeMeters: d.gridSizeMeters,
    isPublic: d.isPublic,
  };
}

export function designIdFromCreate(result: CreateGardenDesignResult): number {
  return Number(result.designId);
}

export type GardenDesignMeta = {
  owner: Principal;
  nftTokenId: number | null;
  createdAt: bigint;
  updatedAt: bigint;
};

export function metaFromCandid(d: CandidGardenDesign): GardenDesignMeta {
  return {
    owner: d.owner,
    nftTokenId: d.nftTokenId.length ? Number(d.nftTokenId[0]) : null,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}
