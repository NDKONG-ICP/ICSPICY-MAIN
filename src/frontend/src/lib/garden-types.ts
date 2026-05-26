export type PlantPlacement = {
  id: number;
  varietyId: number | null;
  label: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  color: string;
  icon: string;
};

export type StructurePlacement = {
  id: number;
  structureType: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  rotation: number;
  color: string;
};

export type GardenDesign = {
  id: number | null;
  name: string;
  description: string | null;
  plants: PlantPlacement[];
  structures: StructurePlacement[];
  widthMeters: number;
  depthMeters: number;
  gridSizeMeters: number;
  isPublic: boolean;
};

export type DesignerMode = "edit" | "view";
export type ViewMode = "3d" | "2d";
export type SelectedType = "plant" | "structure" | null;

export type PendingPlacement =
  | { kind: "plant"; varietyId: number; label: string; color: string; icon: string }
  | { kind: "structure"; structureType: string; width: number; depth: number; color: string };

export type StructurePreset = {
  structureType: string;
  label: string;
  emoji: string;
  width: number;
  depth: number;
  color: string;
};

export const HISTORY_MAX = 30;
