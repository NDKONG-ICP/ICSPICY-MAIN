import { Suspense, useCallback, useMemo, useRef, useState, useEffect } from "react";
import SunCalc from "suncalc";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  OrbitControls,
  Sky,
  TransformControls,
} from "@react-three/drei";
import type { Group } from "three";
import type {
  CameraPresetId,
  GardenDesign,
  LayerVisibility,
  PlantPlacement,
  StructurePlacement,
} from "@/lib/garden-types";
import type { VarietyPublic } from "@/declarations/backend.did";
import { formatScoville } from "@/lib/garden-utils";
import { useSunPosition } from "@/hooks/useSunPosition";
import { AnimatedPlacement } from "./AnimatedPlacement";
import { AtmosphericEffects } from "./AtmosphericEffects";
import { CameraPresetController } from "./CameraPresetController";
import { EzTreePlant } from "./EzTreePlant";
import { GhostPreview3D } from "./GhostPreview";
import { GridOverlay3D } from "./GridOverlay";
import { InstancedPlantField, instancedPlantIds } from "./InstancedPlantField";
import { PlantModel } from "./plants/PlantModel";
import { SatelliteGround } from "./SatelliteGround";
import { ScenePostProcessing } from "./ScenePostProcessing";
import { StructureMesh } from "./StructureMesh";
import { SunlightSceneOverlay } from "./SunlightSimulation3D";
import { SwayingPlant } from "./SwayingPlant";
import { TexturedGround } from "./TexturedGround";

type Props = {
  design: GardenDesign;
  varieties: VarietyPublic[];
  selectedId: number | null;
  selectedType: "plant" | "structure" | null;
  ghost: { x: number; y: number } | null;
  pendingLabel?: string | null;
  pending?: import("@/lib/garden-types").PendingPlacement | null;
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
  cameraPreset?: CameraPresetId;
  layers?: LayerVisibility;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  onSelectPlant: (id: number) => void;
  onSelectStructure: (id: number) => void;
  onPointerMove: (x: number, y: number) => void;
  onPlace: () => void;
  onClearSelection: () => void;
  onMoveItem: (id: number, type: "plant" | "structure", x: number, y: number) => void;
  onDeleteItem: (id: number, type: "plant" | "structure") => void;
};

function TransformableItem({
  selectedId,
  selectedType,
  onMoveItem,
  children,
}: {
  selectedId: number;
  selectedType: "plant" | "structure";
  onMoveItem: Props["onMoveItem"];
  children: React.ReactNode;
}) {
  const groupRef = useRef<Group>(null);
  const commit = () => {
    const g = groupRef.current;
    if (!g) return;
    onMoveItem(selectedId, selectedType, g.position.x, g.position.z);
  };
  return (
    <TransformControls mode="translate" onMouseUp={commit}>
      <group ref={groupRef}>{children}</group>
    </TransformControls>
  );
}

function Scene({
  design,
  varieties,
  selectedId,
  selectedType,
  ghost,
  pending,
  readOnly,
  onSelectPlant,
  onSelectStructure,
  onPointerMove,
  onPlace,
  onClearSelection,
  onMoveItem,
  onDeleteItem,
  useProcedural = false,
  growthStage = 1,
  sunLat = 28.5383,
  sunLng = -81.3792,
  timeOfDayHour = 14,
  showSun = false,
  satelliteEnabled = false,
  gardenLat = 28.5383,
  gardenLng = -81.3792,
  cameraPreset = "sims",
  layers,
}: Props) {
  const cx = design.widthMeters / 2;
  const cz = design.depthMeters / 2;
  const plotSize = Math.max(design.widthMeters, design.depthMeters);
  const sun = useSunPosition(sunLat, sunLng, timeOfDayHour);
  const [atmospheric, setAtmospheric] = useState(false);

  useEffect(() => {
    if (window.innerWidth < 1024) return;
    const id = requestIdleCallback?.(() => setAtmospheric(true)) ?? setTimeout(() => setAtmospheric(true), 800);
    return () => {
      if (typeof id === "number") clearTimeout(id);
    };
  }, []);

  const scovilleByVariety = useMemo(() => {
    const m = new Map<number, string>();
    for (const v of varieties) {
      m.set(Number(v.id), formatScoville(v.scovilleMin, v.scovilleMax));
    }
    return m;
  }, [varieties]);

  const instancedIds = useMemo(() => instancedPlantIds(design.plants), [design.plants]);
  const selectedPlant =
    selectedType === "plant" ? design.plants.find((p) => p.id === selectedId) ?? null : null;
  const selectedStructure =
    selectedType === "structure" ? design.structures.find((s) => s.id === selectedId) ?? null : null;

  const handleGround = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      const p = e.point;
      const x = Math.max(0, Math.min(design.widthMeters, p.x));
      const y = Math.max(0, Math.min(design.depthMeters, p.z));
      if (e.type === "pointermove") onPointerMove(x, y);
      else if (e.type === "click" && !readOnly) onPlace();
    },
    [design.depthMeters, design.widthMeters, onPlace, onPointerMove, readOnly],
  );

  const sunPos = useMemo(() => {
    const pos = SunCalc.getPosition(new Date(), sunLat, sunLng);
    return {
      altitudeDeg: (pos.altitude * 180) / Math.PI,
      azimuthDeg: ((pos.azimuth * 180) / Math.PI + 180) % 360,
    };
  }, [sunLat, sunLng]);

  const renderPlant = (p: PlantPlacement, selected: boolean) => {
    if (layers && !layers.plants) return null;
    if (instancedIds.has(p.id)) return null;
    const label = p.varietyId != null ? scovilleByVariety.get(p.varietyId) ?? null : null;
    const mesh = useProcedural ? (
      <EzTreePlant
        placement={p}
        growthStage={growthStage}
        selected={selected}
        scovilleLabel={label}
        readOnly={readOnly}
        onSelect={() => onSelectPlant(p.id)}
        onLongPressDelete={() => onDeleteItem(p.id, "plant")}
      />
    ) : (
      <PlantModel
        placement={p}
        selected={selected}
        scovilleLabel={label}
        maturity={growthStage}
        readOnly={readOnly}
        onSelect={() => onSelectPlant(p.id)}
        onLongPressDelete={() => onDeleteItem(p.id, "plant")}
      />
    );
    return (
      <SwayingPlant intensity={0.012} seed={p.id}>
        <AnimatedPlacement>{mesh}</AnimatedPlacement>
      </SwayingPlant>
    );
  };

  const renderStructure = (s: StructurePlacement, selected: boolean) => {
    if (layers && !layers.structures) return null;
    return (
      <StructureMesh placement={s} selected={selected} onSelect={() => onSelectStructure(s.id)} />
    );
  };

  const showGrid = layers?.grid !== false;
  const showShadows = layers?.shadows !== false;

  return (
    <>
      <CameraPresetController preset={cameraPreset} plotCenter={[cx, 0, cz]} plotSize={plotSize} />
      <Sky
        sunPosition={sun.position}
        turbidity={sun.skyTurbidity}
        rayleigh={2}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />
      <color attach="background" args={[sun.skyColor]} />
      <fog attach="fog" args={[sun.skyColor, 25, 90]} />
      <ambientLight intensity={sun.ambientIntensity} color="#b8d4e3" />
      <directionalLight
        position={sun.position}
        intensity={sun.directionalIntensity}
        color="#fff5e6"
        castShadow={showShadows}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      <Environment preset="sunset" background={false} />
      {showShadows && (
        <ContactShadows position={[cx, 0, cz]} scale={plotSize + 4} blur={2} far={4} opacity={0.4} />
      )}

      {satelliteEnabled ? (
        <SatelliteGround
          lat={gardenLat}
          lng={gardenLng}
          widthMeters={design.widthMeters}
          depthMeters={design.depthMeters}
          centerX={cx}
          centerZ={cz}
          enabled
        />
      ) : (
        <TexturedGround
          widthMeters={design.widthMeters}
          depthMeters={design.depthMeters}
          centerX={cx}
          centerZ={cz}
        />
      )}

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[cx, 0.001, cz]}
        onPointerMove={handleGround}
        onClick={handleGround}
      >
        <planeGeometry args={[design.widthMeters, design.depthMeters]} />
        <meshStandardMaterial transparent opacity={0} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -0.001, cz]} onClick={() => onClearSelection()}>
        <planeGeometry args={[design.widthMeters + 4, design.depthMeters + 4]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {showGrid && (
        <GridOverlay3D
          widthMeters={design.widthMeters}
          depthMeters={design.depthMeters}
          gridSizeMeters={design.gridSizeMeters}
        />
      )}

      <InstancedPlantField plants={design.plants} />

      {design.structures
        .filter((s) => s.id !== selectedStructure?.id)
        .map((s) => (
          <AnimatedPlacement key={`s-${s.id}`}>{renderStructure(s, false)}</AnimatedPlacement>
        ))}
      {design.plants
        .filter((p) => p.id !== selectedPlant?.id)
        .map((p) => (
          <group key={`p-${p.id}`}>{renderPlant(p, false)}</group>
        ))}

      {!readOnly && selectedPlant && selectedId != null && (
        <TransformableItem selectedId={selectedId} selectedType="plant" onMoveItem={onMoveItem}>
          {renderPlant(selectedPlant, true)}
        </TransformableItem>
      )}
      {!readOnly && selectedStructure && selectedId != null && (
        <TransformableItem selectedId={selectedId} selectedType="structure" onMoveItem={onMoveItem}>
          {renderStructure(selectedStructure, true)}
        </TransformableItem>
      )}
      {readOnly && selectedPlant && (
        <group key={`ro-p-${selectedPlant.id}`}>{renderPlant(selectedPlant, true)}</group>
      )}
      {readOnly && selectedStructure && (
        <group key={`ro-s-${selectedStructure.id}`}>{renderStructure(selectedStructure, true)}</group>
      )}
      {ghost && pending && <GhostPreview3D x={ghost.x} y={ghost.y} pending={pending} maturity={growthStage} />}
      {showSun && (
        <SunlightSceneOverlay
          azimuthDeg={sunPos.azimuthDeg}
          altitudeDeg={sunPos.altitudeDeg}
          plotWidth={design.widthMeters}
          plotDepth={design.depthMeters}
        />
      )}
      <AtmosphericEffects
        enabled={atmospheric}
        plotWidth={design.widthMeters}
        plotDepth={design.depthMeters}
      />
    </>
  );
}

export function GardenCanvas3D(props: Props) {
  const cam = Math.max(props.design.widthMeters, props.design.depthMeters) * 0.85;
  const cx = props.design.widthMeters / 2;
  const cz = props.design.depthMeters / 2;
  const [desktopFx, setDesktopFx] = useState(true);
  const internalRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setDesktopFx(window.innerWidth >= 768);
    const onResize = () => setDesktopFx(window.innerWidth >= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="h-full w-full min-h-[320px] rounded-lg overflow-hidden bg-[#0f172a] shadow-inner">
      <Canvas
        ref={(el) => {
          internalRef.current = el as unknown as HTMLCanvasElement;
          if (props.canvasRef && el) {
            (props.canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current =
              el as unknown as HTMLCanvasElement;
          }
        }}
        shadows
        camera={{ position: [cx + cam * 0.4, cam, cz + cam * 0.4], fov: 50 }}
        gl={{ preserveDrawingBuffer: true }}
      >
        <Suspense fallback={null}>
          <Scene {...props} />
          <ScenePostProcessing enabled={desktopFx} />
        </Suspense>
        <OrbitControls
          makeDefault
          maxPolarAngle={Math.PI / 2.1}
          minDistance={3}
          maxDistance={40}
          target={[cx, 0, cz]}
        />
      </Canvas>
    </div>
  );
}
