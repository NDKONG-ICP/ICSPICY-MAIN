import type { VarietyPublic } from "@/declarations/backend.did";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useSunPosition } from "@/hooks/useSunPosition";
import { useDeviceTier } from "@/lib/garden-device-tier";
import {
  type ModelType,
  getPlantById,
} from "@/lib/garden-plant-catalog";
import type {
  CameraPresetId,
  GardenDesign,
  LayerVisibility,
  PendingPlacement,
  PlantPlacement,
} from "@/lib/garden-types";
import { Html, OrbitControls, Sky } from "@react-three/drei";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { CameraPresetController } from "./CameraPresetController";
import {
  type Collider,
  FPVController,
  type PlantRef,
  type ReticleState,
  type StickVisual,
  type TouchVisualState,
} from "./FPVController";
import { FpsGovernor } from "./FpsGovernor";
import { GardenGround } from "./GardenGround";
import { InstancedPlantField, instancedPlantIds } from "./InstancedPlantField";
import { GhostPreview3D } from "./GhostPreview";
import { GridOverlay3D } from "./GridOverlay";
import { PixelRatioLimiter, ScenePostProcessing } from "./ScenePostProcessing";
import { StructureMesh } from "./StructureMesh";
import {
  GltfPlantModel,
  type PlantCategory,
  ProceduralPlantGhost,
} from "./plants/GltfPlantModel";

type CamMode = "orbit" | "walk" | "build";

type Props = {
  design: GardenDesign;
  varieties: VarietyPublic[];
  selectedId: number | null;
  selectedType: "plant" | "structure" | null;
  ghost: { x: number; y: number } | null;
  pendingLabel?: string | null;
  pending?: PendingPlacement | null;
  readOnly?: boolean;
  useProcedural?: boolean;
  growthStage?: number;
  sunLat?: number;
  sunLng?: number;
  timeOfDayHour?: number;
  showSun?: boolean;
  satelliteEnabled?: boolean;
  gardenLat?: number;
  gardenLng?: number;
  satelliteZoom?: number;
  cameraPreset?: CameraPresetId;
  layers?: LayerVisibility;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  walkMode?: boolean;
  onExitWalk?: () => void;
  simulationMonth?: number | null;
  revealedPlantIds?: Set<number> | null;
  weatherOverlay?: boolean;
  isRaining?: boolean;
  windDirection?: number;
  liveWeatherHour?: number | null;
  tempTint?: "warm" | "cool" | "neutral";
  onSelectPlant: (id: number) => void;
  onSelectStructure: (id: number) => void;
  onPointerMove: (x: number, y: number) => void;
  onPlace: () => void;
  onClearSelection: () => void;
  onMoveItem: (
    id: number,
    type: "plant" | "structure",
    x: number,
    y: number,
  ) => void;
  onDeleteItem: (id: number, type: "plant" | "structure") => void;
  /** Place at explicit metre coordinates — the same path the 2D canvas uses. */
  onPlaceAt?: (east: number, north: number) => void;
  /** Set the active placement "brush" (reuses the designer's pending state). */
  onSetBrush?: (pending: PendingPlacement | null) => void;
  /** Open the mobile catalog sheet (build-mode "＋" tile, touch only). */
  onOpenCatalog?: () => void;
};

// ---------------------------------------------------------------------------
// Category classification (drives which procedural model / GLTF is rendered).
// ---------------------------------------------------------------------------

function modelTypeToCategory(mt: ModelType): PlantCategory {
  switch (mt) {
    case "pepper":
      return "pepper";
    case "small_tree":
    case "large_tree":
    case "palm":
      return "tree";
    case "herb":
    case "groundcover":
    case "grass":
    case "succulent":
      return "herb";
    default:
      return "shrub";
  }
}

function categoryFromName(name: string): PlantCategory {
  const n = name.toLowerCase();
  if (/tree|citrus|avocado|mango|palm|banana|fig|guava/.test(n)) return "tree";
  if (/herb|basil|mint|cilantro|oregano|thyme|parsley|chive/.test(n))
    return "herb";
  if (/pepper|chili|chile|capsicum|reaper|ghost|scorpion|habanero|jalap/.test(n))
    return "pepper";
  return "shrub";
}

function inferSubcategory(scoville: number): string {
  if (scoville > 100_000) return "superhot";
  if (scoville > 10_000) return "hot";
  if (scoville > 1_000) return "medium";
  return "mild";
}

function getPlantVisualProps(
  plant: PlantPlacement,
  varieties: VarietyPublic[],
): {
  fruitColor?: string;
  plantColor?: string;
  scovilleMax?: number;
  subcategory?: string;
} {
  const catalog = plant.catalogId ? getPlantById(plant.catalogId) : undefined;
  const variety =
    plant.varietyId != null
      ? varieties.find((v) => Number(v.id) === plant.varietyId)
      : undefined;
  const scovilleMax =
    catalog?.scovilleMax ??
    plant.scoville ??
    (variety ? Number(variety.scovilleMax) : undefined);

  return {
    fruitColor: catalog?.fruitColor || undefined,
    plantColor: catalog?.color ?? plant.color,
    scovilleMax,
    subcategory:
      catalog?.subcategory ??
      (scovilleMax != null ? inferSubcategory(scovilleMax) : undefined),
  };
}

function getPlantCategory(
  plant: PlantPlacement,
  varieties: VarietyPublic[],
): PlantCategory {
  if (plant.catalogId) {
    const c = getPlantById(plant.catalogId);
    if (c) return modelTypeToCategory(c.modelType);
  }
  const name =
    plant.label ||
    varieties.find((v) => Number(v.id) === plant.varietyId)?.name ||
    "";
  return categoryFromName(name);
}

// ---------------------------------------------------------------------------
// In-canvas UI overlay (mode pill, hint bar, hotbar, reticle).
// ---------------------------------------------------------------------------

type OverlayProps = {
  camMode: CamMode;
  setCamMode: (m: CamMode) => void;
  buildBrush: PendingPlacement | null;
  hotbar: VarietyPublic[];
  onSelectSlot: (index: number) => void;
  removeTarget: boolean;
  placeValid: boolean;
  isTouch: boolean;
  touchVisualRef: React.RefObject<TouchVisualState>;
  reticleRef: React.RefObject<ReticleState | null>;
  onPlaceAt?: (east: number, north: number) => void;
  onDeleteItem: (id: number, type: "plant" | "structure") => void;
  onOpenCatalog?: () => void;
};

function ModePill({
  camMode,
  setCamMode,
  isTouch,
}: {
  camMode: CamMode;
  setCamMode: (m: CamMode) => void;
  isTouch: boolean;
}) {
  return (
    <div
      className={`pointer-events-auto absolute left-1/2 flex -translate-x-1/2 overflow-hidden rounded-full bg-black/65 shadow-xl backdrop-blur ${
        isTouch ? "top-2" : "bottom-4"
      }`}
    >
      {(
        [
          ["orbit", "🔭 Orbit"],
          ["walk", "🚶 Walk"],
          ["build", "🔨 Build"],
        ] as [CamMode, string][]
      ).map(([m, label]) => {
        const active = camMode === m;
        return (
          <button
            key={m}
            type="button"
            onClick={() => setCamMode(m)}
            className={isTouch ? "px-5 py-2.5 text-white" : "px-4 py-2 text-white"}
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              minHeight: isTouch ? 44 : undefined,
              background: active ? "#22c55e" : "transparent",
              color: active ? "#04210f" : "#e6e6e6",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function CanvasOverlay({
  camMode,
  setCamMode,
  buildBrush,
  hotbar,
  onSelectSlot,
  removeTarget,
  placeValid,
  isTouch,
  touchVisualRef,
  reticleRef,
  onPlaceAt,
  onDeleteItem,
  onOpenCatalog,
}: OverlayProps) {
  const fpv = camMode !== "orbit";
  const moveRingRef = useRef<HTMLDivElement>(null);
  const moveKnobRef = useRef<HTMLDivElement>(null);
  const lookRingRef = useRef<HTMLDivElement>(null);
  const lookKnobRef = useRef<HTMLDivElement>(null);

  // Touch joystick visuals: drive DOM from the shared ref via rAF (no re-render).
  useEffect(() => {
    if (!isTouch) return;
    let raf = 0;
    const apply = (
      ring: HTMLDivElement | null,
      knob: HTMLDivElement | null,
      s: StickVisual,
    ) => {
      if (!ring || !knob) return;
      ring.style.opacity = s.active ? "1" : "0";
      knob.style.opacity = s.active ? "1" : "0";
      if (s.active) {
        ring.style.left = `${s.ox}px`;
        ring.style.top = `${s.oy}px`;
        knob.style.left = `${s.kx}px`;
        knob.style.top = `${s.ky}px`;
      }
    };
    const tick = () => {
      const tv = touchVisualRef.current;
      if (tv) {
        apply(moveRingRef.current, moveKnobRef.current, tv.move);
        apply(lookRingRef.current, lookKnobRef.current, tv.look);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isTouch, touchVisualRef]);

  const hint = isTouch
    ? camMode === "build"
      ? "Left thumb move · Right thumb look · Aim with reticle · tap Place / Remove"
      : "Left thumb to move · Right thumb to look"
    : `Click to capture mouse · WASD move · Shift sprint · Esc release${
        camMode === "build" ? " · LMB place · RMB/X remove" : ""
      }`;

  return (
    <Html fullscreen>
      <div
        className="pointer-events-none absolute inset-0 select-none"
        style={{ touchAction: "none" }}
      >
        {/* Hint bar */}
        {fpv && (
          <div
            className={`absolute left-1/2 -translate-x-1/2 rounded-md bg-black/65 px-3 py-1.5 text-white shadow-lg backdrop-blur ${
              isTouch ? "bottom-2" : "top-3"
            }`}
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: isTouch ? 10 : 12,
              maxWidth: "92vw",
              textAlign: "center",
            }}
          >
            {hint}
          </div>
        )}

        {/* Center reticle (Build only) */}
        {camMode === "build" && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div
              className="relative h-6 w-6 rounded-full border-2"
              style={{
                borderColor: removeTarget ? "#ef4444" : "#22c55e",
                boxShadow: `0 0 8px ${removeTarget ? "#ef4444" : "#22c55e"}`,
              }}
            >
              <div
                className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ background: removeTarget ? "#ef4444" : "#22c55e" }}
              />
            </div>
          </div>
        )}

        {/* Touch joystick visuals (dynamic origin) */}
        {isTouch && fpv && (
          <>
            <div
              ref={moveRingRef}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                width: 100,
                height: 100,
                background: "rgba(34,197,94,0.15)",
                border: "1px solid rgba(34,197,94,0.4)",
                opacity: 0,
                transition: "opacity 150ms",
              }}
            />
            <div
              ref={moveKnobRef}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                width: 44,
                height: 44,
                background: "rgba(34,197,94,0.6)",
                opacity: 0,
                transition: "opacity 150ms",
              }}
            />
            <div
              ref={lookRingRef}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                width: 100,
                height: 100,
                background: "rgba(34,197,94,0.15)",
                border: "1px solid rgba(34,197,94,0.4)",
                opacity: 0,
                transition: "opacity 150ms",
              }}
            />
            <div
              ref={lookKnobRef}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                width: 44,
                height: 44,
                background: "rgba(34,197,94,0.6)",
                opacity: 0,
                transition: "opacity 150ms",
              }}
            />
          </>
        )}

        {/* Touch build buttons (Place / Remove) */}
        {isTouch && camMode === "build" && (
          <div className="pointer-events-none absolute bottom-28 left-1/2 flex -translate-x-1/2 items-center gap-16">
            <button
              type="button"
              disabled={!removeTarget}
              onClick={() => {
                const r = reticleRef.current;
                if (r?.plantId != null) onDeleteItem(r.plantId, "plant");
              }}
              title="Remove plant under reticle"
              className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full text-2xl shadow-xl transition"
              style={{
                background: removeTarget ? "#ef4444" : "#ef444455",
                color: "#fff",
                opacity: removeTarget ? 1 : 0.5,
              }}
            >
              🗑
            </button>
            <button
              type="button"
              disabled={!placeValid}
              onClick={() => {
                const r = reticleRef.current;
                if (r?.valid) onPlaceAt?.(r.x, r.z);
              }}
              title="Place at reticle"
              className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full text-2xl shadow-xl transition"
              style={{
                background: placeValid ? "#22c55e" : "#22c55e55",
                color: "#04210f",
                opacity: placeValid ? 1 : 0.5,
              }}
            >
              🌱
            </button>
          </div>
        )}

        {/* Build hotbar — top strip (touch) or bottom (desktop) */}
        {camMode === "build" && (
          <div
            className={`pointer-events-auto absolute left-1/2 flex -translate-x-1/2 gap-1.5 rounded-xl bg-black/60 p-1.5 shadow-xl backdrop-blur ${
              isTouch ? "top-16 max-w-[92vw] overflow-x-auto" : "bottom-16"
            }`}
          >
            {hotbar.map((v, i) => {
              const active =
                buildBrush?.kind === "plant" &&
                buildBrush.varietyId === Number(v.id);
              const dim = isTouch ? 56 : 48;
              return (
                <button
                  key={String(v.id)}
                  type="button"
                  onClick={() => onSelectSlot(i)}
                  title={v.name}
                  className="flex shrink-0 flex-col items-center justify-center rounded-lg border text-white transition"
                  style={{
                    width: dim,
                    height: dim,
                    borderColor: active ? "#22c55e" : "#ffffff22",
                    background: active ? "#22c55e22" : "#ffffff0d",
                  }}
                >
                  <span style={{ fontSize: isTouch ? 22 : 18 }}>🌶️</span>
                  {!isTouch && (
                    <span
                      style={{ fontFamily: "'DM Mono', monospace", fontSize: 9 }}
                    >
                      {i + 1}
                    </span>
                  )}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                if (isTouch) onOpenCatalog?.();
                else if (document.pointerLockElement) document.exitPointerLock();
              }}
              title="Pick from catalog"
              className="flex shrink-0 items-center justify-center rounded-lg border border-dashed border-white/30 text-2xl text-white/80"
              style={{ width: isTouch ? 56 : 48, height: isTouch ? 56 : 48 }}
            >
              ＋
            </button>
          </div>
        )}

        <ModePill camMode={camMode} setCamMode={setCamMode} isTouch={isTouch} />
      </div>
    </Html>
  );
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

type SceneProps = Props & {
  camMode: CamMode;
  setCamMode: (m: CamMode) => void;
  buildBrush: PendingPlacement | null;
  onSelectSlot: (index: number) => void;
  isTouch: boolean;
};

function Scene({
  design,
  varieties,
  selectedId,
  selectedType,
  ghost,
  pending,
  readOnly,
  growthStage = 1,
  sunLat = 28.5383,
  sunLng = -81.3792,
  timeOfDayHour = 14,
  cameraPreset = "sims",
  layers,
  camMode,
  setCamMode,
  buildBrush,
  onSelectSlot,
  isTouch,
  onSelectPlant,
  onSelectStructure,
  onPointerMove,
  onPlace,
  onClearSelection,
  onDeleteItem,
  onPlaceAt,
  onOpenCatalog,
}: SceneProps) {
  const cx = design.widthMeters / 2;
  const cz = design.depthMeters / 2;
  const plotSize = Math.max(design.widthMeters, design.depthMeters);
  const sun = useSunPosition(sunLat, sunLng, timeOfDayHour);
  const { settings: tierSettings } = useDeviceTier();

  const ghostGroupRef = useRef<THREE.Group>(null);
  const [removeTarget, setRemoveTarget] = useState<number | null>(null);
  const [placeValid, setPlaceValid] = useState(false);
  const touchVisualRef = useRef<TouchVisualState>({
    move: { active: false, ox: 0, oy: 0, kx: 0, ky: 0 },
    look: { active: false, ox: 0, oy: 0, kx: 0, ky: 0 },
  });
  const reticleRef = useRef<ReticleState | null>(null);

  const showGrid = layers?.grid !== false;
  const showShadows = layers?.shadows !== false && tierSettings.shadows;
  const showPlants = layers?.plants !== false;
  const showStructures = layers?.structures !== false;
  const isOrbit = camMode === "orbit";

  const fpvPlants = useMemo<PlantRef[]>(
    () => design.plants.map((p) => ({ id: p.id, x: p.x, z: p.y })),
    [design.plants],
  );
  const colliders = useMemo<Collider[]>(
    () => design.plants.map((p) => ({ x: p.x, z: p.y, radius: 0.3 })),
    [design.plants],
  );

  const handleGround = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      const p = e.point;
      const x = Math.max(0, Math.min(design.widthMeters, p.x));
      const y = Math.max(0, Math.min(design.depthMeters, p.z));
      if (e.type === "pointermove") onPointerMove(x, y);
      // Distinguish tap from camera drag: R3F's `delta` is the pointer travel
      // in pixels between down and up. Ignore "clicks" that were drags.
      else if (e.type === "click" && !readOnly && e.delta < 10) onPlace();
    },
    [design.depthMeters, design.widthMeters, onPlace, onPointerMove, readOnly],
  );

  // Instanced rendering for repeated varieties past the tier threshold.
  const instancedIds = useMemo(() => {
    if (design.plants.length <= tierSettings.maxPlantsBeforeInstancing)
      return new Set<number>();
    return instancedPlantIds(design.plants);
  }, [design.plants, tierSettings.maxPlantsBeforeInstancing]);

  const fillSun: [number, number, number] = [
    -sun.position[0],
    sun.position[1] * 0.6,
    -sun.position[2],
  ];

  const ghostCategory =
    buildBrush?.kind === "plant"
      ? categoryFromName(buildBrush.label)
      : "pepper";

  return (
    <>
      {isOrbit && cameraPreset !== "walk" && (
        <CameraPresetController
          preset={cameraPreset}
          plotCenter={[cx, 0, cz]}
          plotSize={plotSize}
        />
      )}

      {/* Warm Sims-style sky + lighting */}
      <Sky
        sunPosition={sun.position}
        turbidity={6}
        rayleigh={2}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />
      <fog attach="fog" args={["#c8e6c9", 20, 80]} />
      <ambientLight intensity={0.6} color="#fff5e0" />
      <directionalLight
        position={sun.position}
        intensity={1.2}
        color="#fffae0"
        castShadow={showShadows}
        shadow-mapSize={[tierSettings.shadowMapSize, tierSettings.shadowMapSize]}
        shadow-camera-far={100}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <directionalLight position={fillSun} intensity={0.3} color="#c0e0ff" />
      <hemisphereLight args={["#87ceeb", "#2d5a1b", 0.4]} />

      {/* Stylized grass ground */}
      <GardenGround
        widthMeters={design.widthMeters}
        depthMeters={design.depthMeters}
      />

      {showGrid && (
        <GridOverlay3D
          widthMeters={design.widthMeters}
          depthMeters={design.depthMeters}
          gridSizeMeters={design.gridSizeMeters}
        />
      )}

      {/* Orbit-mode ground interaction (placement + clear selection) */}
      {isOrbit && (
        <>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[cx, 0.001, cz]}
            onPointerMove={handleGround}
            onClick={handleGround}
          >
            <planeGeometry args={[design.widthMeters, design.depthMeters]} />
            <meshStandardMaterial transparent opacity={0} />
          </mesh>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[cx, -0.001, cz]}
            onClick={() => onClearSelection()}
          >
            <planeGeometry
              args={[design.widthMeters + 4, design.depthMeters + 4]}
            />
            <meshBasicMaterial visible={false} />
          </mesh>
        </>
      )}

      {/* Plants — repeated varieties above the tier threshold render as a
          single instanced mesh; everything else gets the full model. */}
      {showPlants && instancedIds.size > 0 && (
        <InstancedPlantField plants={design.plants} />
      )}
      {showPlants &&
        design.plants.map((p) => {
          const isSelected = selectedId === p.id && selectedType === "plant";
          if (instancedIds.has(p.id) && !isSelected) return null;
          const visual = getPlantVisualProps(p, varieties);
          return (
            <GltfPlantModel
              key={`p-${p.id}`}
              category={getPlantCategory(p, varieties)}
              position={[p.x, 0, p.y]}
              scale={p.scale ?? 1}
              growthStage={growthStage}
              selected={isSelected}
              varietyName={p.label}
              fruitColor={visual.fruitColor}
              plantColor={visual.plantColor}
              scovilleMax={visual.scovilleMax}
              subcategory={visual.subcategory}
              onClick={() => onSelectPlant(p.id)}
            />
          );
        })}

      {/* Structures */}
      {showStructures &&
        design.structures.map((s) => (
          <StructureMesh
            key={`s-${s.id}`}
            placement={s}
            selected={selectedId === s.id && selectedType === "structure"}
            onSelect={() => onSelectStructure(s.id)}
          />
        ))}

      {/* Orbit ghost preview */}
      {isOrbit && ghost && pending && (
        <GhostPreview3D
          x={ghost.x}
          y={ghost.y}
          pending={pending}
          maturity={growthStage}
        />
      )}

      {/* Build-mode reticle ghost (positioned imperatively by FPVController) */}
      {camMode === "build" && buildBrush?.kind === "plant" && (
        <group ref={ghostGroupRef} visible={false}>
          <ProceduralPlantGhost
            category={ghostCategory}
            seed={7}
            scale={1}
            growthStage={1}
            plantColor={buildBrush.color}
            scovilleMax={buildBrush.scoville}
            fruitColor={
              buildBrush.catalogId
                ? (getPlantById(buildBrush.catalogId)?.fruitColor ?? undefined)
                : undefined
            }
            subcategory={
              buildBrush.catalogId
                ? getPlantById(buildBrush.catalogId)?.subcategory
                : buildBrush.scoville
                  ? inferSubcategory(buildBrush.scoville)
                  : undefined
            }
          />
        </group>
      )}

      {/* First-person controller (walk + build) */}
      {!isOrbit && (
        <FPVController
          mode={camMode === "build" ? "build" : "walk"}
          enabled
          isTouch={isTouch}
          widthMeters={design.widthMeters}
          depthMeters={design.depthMeters}
          colliders={colliders}
          plants={fpvPlants}
          ghostRef={ghostGroupRef}
          touchVisualRef={touchVisualRef}
          reticleRef={reticleRef}
          onTargetChange={setRemoveTarget}
          onReticleValidChange={setPlaceValid}
          onPlaceAtReticle={(x, z) => onPlaceAt?.(x, z)}
          onRemoveAtReticle={(id) => onDeleteItem(id, "plant")}
        />
      )}

      <CanvasOverlay
        camMode={camMode}
        setCamMode={setCamMode}
        buildBrush={buildBrush}
        hotbar={varieties.slice(0, 9)}
        onSelectSlot={onSelectSlot}
        removeTarget={removeTarget != null}
        placeValid={placeValid}
        isTouch={isTouch}
        touchVisualRef={touchVisualRef}
        reticleRef={reticleRef}
        onPlaceAt={onPlaceAt}
        onDeleteItem={onDeleteItem}
        onOpenCatalog={onOpenCatalog}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Wrapper
// ---------------------------------------------------------------------------

export function GardenCanvas3D(props: Props) {
  const { onSetBrush, pending, varieties, walkMode } = props;
  const { settings: tierSettings } = useDeviceTier();
  const mobile = useIsMobile();
  // Detect ACTUAL touch-primary devices, not touch-capable desktops/laptops.
  // pointer:coarse = touchscreen is the primary pointer (phones, tablets).
  // pointer:fine = mouse/trackpad is primary (laptops with touchscreens still have fine pointer).
  const isTouch =
    mobile ||
    (typeof window !== "undefined" &&
      window.matchMedia("(pointer: coarse)").matches &&
      !window.matchMedia("(pointer: fine)").matches);
  const plotSize = Math.max(
    props.design.widthMeters,
    props.design.depthMeters,
  );
  const viewDist = Math.max(plotSize, 8);
  const cx = props.design.widthMeters / 2;
  const cz = props.design.depthMeters / 2;
  const [desktopFx, setDesktopFx] = useState(true);
  const [camMode, setCamMode] = useState<CamMode>("orbit");
  const [buildBrush, setBuildBrush] = useState<PendingPlacement | null>(null);
  const internalRef = useRef<HTMLCanvasElement>(null);

  // Honour an externally-requested walk session once on mount/prop change.
  useEffect(() => {
    if (walkMode) setCamMode("walk");
  }, [walkMode]);

  useEffect(() => {
    const update = () => setDesktopFx(window.innerWidth >= 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const selectSlot = useCallback(
    (index: number) => {
      const v = varieties[index];
      if (!v) return;
      const brush: PendingPlacement = {
        kind: "plant",
        varietyId: Number(v.id),
        label: v.name,
        color: "#dc2626",
        icon: "🌶️",
        scoville: Number(v.scovilleMax),
      };
      setBuildBrush(brush);
      onSetBrush?.(brush);
    },
    [varieties, onSetBrush],
  );

  // Number keys 1-9 pick a hotbar slot while in Build mode.
  useEffect(() => {
    if (camMode !== "build") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code.startsWith("Digit")) {
        const n = Number(e.code.slice(5));
        if (n >= 1 && n <= 9) selectSlot(n - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [camMode, selectSlot]);

  // Keep the placement brush armed in Build mode. `placePlant` clears `pending`
  // after each placement → re-arm. A fresh non-null plant `pending` (e.g. picked
  // from the catalog sheet) is adopted as the new brush.
  useEffect(() => {
    if (camMode !== "build") return;
    if (pending == null) {
      if (buildBrush) onSetBrush?.(buildBrush);
    } else if (pending.kind === "plant" && pending !== buildBrush) {
      setBuildBrush(pending);
    }
  }, [camMode, buildBrush, pending, onSetBrush]);

  return (
    <div className="h-full w-full min-h-[320px] rounded-lg overflow-hidden bg-[#0f172a] shadow-inner">
      <Canvas
        ref={(el) => {
          internalRef.current = el as unknown as HTMLCanvasElement;
          if (props.canvasRef && el) {
            (
              props.canvasRef as React.MutableRefObject<HTMLCanvasElement | null>
            ).current = el as unknown as HTMLCanvasElement;
          }
        }}
        dpr={tierSettings.pixelRatio}
        shadows={tierSettings.shadows}
        camera={{
          position: [
            cx + viewDist * 0.7,
            viewDist * 0.8,
            cz + viewDist * 0.7,
          ],
          fov: 50,
          near: 0.1,
          far: 1000,
        }}
        gl={{
          preserveDrawingBuffer: true,
          antialias: tierSettings.antialiasing,
          powerPreference: "high-performance",
          failIfMajorPerformanceCaveat: false,
        }}
      >
        <Suspense fallback={null}>
          <PixelRatioLimiter max={tierSettings.pixelRatio} />
          <FpsGovernor />
          <Scene
            {...props}
            camMode={camMode}
            setCamMode={setCamMode}
            buildBrush={buildBrush}
            onSelectSlot={selectSlot}
            isTouch={isTouch}
          />
          <ScenePostProcessing
            enabled={
              desktopFx &&
              !isTouch &&
              camMode === "orbit" &&
              tierSettings.postProcessing
            }
          />
        </Suspense>
        <OrbitControls
          makeDefault
          enabled={camMode === "orbit"}
          enableDamping
          dampingFactor={0.1}
          touches={{
            ONE: THREE.TOUCH.ROTATE,
            TWO: THREE.TOUCH.DOLLY_PAN,
          }}
          maxPolarAngle={Math.PI / 2.1}
          minDistance={2}
          maxDistance={50}
          target={[cx, 0, cz]}
        />
      </Canvas>
    </div>
  );
}
