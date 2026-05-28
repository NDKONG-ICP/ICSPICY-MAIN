export type PlantPlacement = {
  id: number;
  varietyId: number | null;
  catalogId?: string | null;
  label: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  color: string;
  icon: string;
  scoville?: number;
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

export type GardenLocationMode = "gps" | "address" | "skip";

export type GardenLocation = {
  lat: number;
  lng: number;
  mode: GardenLocationMode;
  label: string;
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

export type CameraPresetId = "sims" | "top" | "walk" | "bird";

export const CAMERA_PRESETS: Record<
  CameraPresetId,
  { position: [number, number, number]; target: [number, number, number] }
> = {
  sims: { position: [8, 8, 8], target: [0, 0, 0] },
  top: { position: [0, 15, 0], target: [0, 0, 0] },
  walk: { position: [0, 1.7, -5], target: [0, 1, 5] },
  bird: { position: [0, 20, -10], target: [0, 0, 0] },
};

export type DesignerMode = "edit" | "view";
export type ViewMode = "3d" | "2d";
export type SelectedType = "plant" | "structure" | null;

export type PendingPlacement =
  | {
      kind: "plant";
      varietyId?: number | null;
      catalogId?: string;
      label: string;
      color: string;
      icon: string;
      scoville?: number;
      modelType?: string;
    }
  | {
      kind: "structure";
      structureType: string;
      structureId?: string;
      width: number;
      depth: number;
      color: string;
      label?: string;
    };

export type StructurePreset = {
  structureType: string;
  label: string;
  emoji: string;
  width: number;
  depth: number;
  color: string;
};

export type LayerVisibility = {
  plants: boolean;
  structures: boolean;
  grid: boolean;
  labels: boolean;
  shadows: boolean;
  spacing: boolean;
  companions: boolean;
  sunShade: boolean;
  irrigation: boolean;
  dimensions: boolean;
  satellite: boolean;
  annotations: boolean;
  contours: boolean;
};

export const DEFAULT_LAYERS: LayerVisibility = {
  plants: true,
  structures: true,
  grid: true,
  labels: true,
  shadows: true,
  spacing: false,
  companions: false,
  sunShade: false,
  irrigation: true,
  dimensions: false,
  satellite: true,
  annotations: true,
  contours: false,
};

export type GardenAnnotation = {
  id: number;
  x: number;
  y: number;
  text: string;
};

export type GardenScene = {
  id: string;
  name: string;
  preset: CameraPresetId;
};

export type MeasurePoint = { x: number; y: number };

export type GardenMeasurement =
  | { id: number; type: "distance"; points: [MeasurePoint, MeasurePoint] }
  | { id: number; type: "area"; points: MeasurePoint[] };

export type IrrigationLine = {
  id: number;
  points: MeasurePoint[];
  sourceLabel?: string;
};

export type GardenToolExtras = {
  annotations: GardenAnnotation[];
  scenes: GardenScene[];
  measurements: GardenMeasurement[];
  irrigationLines: IrrigationLine[];
  sitePhotoUrl: string | null;
  sectionCutY: number | null;
  activeTool: "none" | "measure" | "area" | "note" | "irrigation" | "section";
};

export const DEFAULT_TOOL_EXTRAS: GardenToolExtras = {
  annotations: [],
  scenes: [],
  measurements: [],
  irrigationLines: [],
  sitePhotoUrl: null,
  sectionCutY: null,
  activeTool: "none",
};

export const HISTORY_MAX = 30;
