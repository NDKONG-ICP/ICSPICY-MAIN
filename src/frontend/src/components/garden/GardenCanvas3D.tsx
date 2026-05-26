import { Suspense, useCallback, useMemo, useRef } from "react";
import SunCalc from "suncalc";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, TransformControls } from "@react-three/drei";
import type { Group } from "three";
import type { GardenDesign, PlantPlacement, StructurePlacement } from "@/lib/garden-types";
import type { VarietyPublic } from "@/declarations/backend.did";
import { formatScoville } from "@/lib/garden-utils";
import { EzTreePlant } from "./EzTreePlant";
import { GhostPreview3D } from "./GhostPreview";
import { GridOverlay3D } from "./GridOverlay";
import { PlantMesh } from "./PlantMesh";
import { StructureMesh } from "./StructureMesh";
import { SunlightSceneOverlay } from "./SunlightSimulation3D";

type Props = {
  design: GardenDesign;
  varieties: VarietyPublic[];
  selectedId: number | null;
  selectedType: "plant" | "structure" | null;
  ghost: { x: number; y: number } | null;
  pendingLabel?: string | null;
  readOnly?: boolean;
  useProcedural?: boolean;
  growthStage?: number;
  sunLat?: number;
  sunLng?: number;
  showSun?: boolean;
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
  pendingLabel,
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
  showSun = false,
}: Props) {
  const scovilleByVariety = useMemo(() => {
    const m = new Map<number, string>();
    for (const v of varieties) {
      m.set(Number(v.id), formatScoville(v.scovilleMin, v.scovilleMax));
    }
    return m;
  }, [varieties]);

  const selectedPlant =
    selectedType === "plant"
      ? design.plants.find((p) => p.id === selectedId) ?? null
      : null;
  const selectedStructure =
    selectedType === "structure"
      ? design.structures.find((s) => s.id === selectedId) ?? null
      : null;

  const handleGround = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      const p = e.point;
      const x = Math.max(0, Math.min(design.widthMeters, p.x));
      const y = Math.max(0, Math.min(design.depthMeters, p.z));
      if (e.type === "pointermove") {
        onPointerMove(x, y);
      } else if (e.type === "click" && !readOnly) {
        onPlace();
      }
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
    const label =
      p.varietyId != null ? scovilleByVariety.get(p.varietyId) ?? null : null;
    const common = {
      placement: p,
      selected,
      scovilleLabel: label,
      readOnly,
      onSelect: () => onSelectPlant(p.id),
      onLongPressDelete: () => onDeleteItem(p.id, "plant"),
    };
    if (useProcedural) {
      return <EzTreePlant {...common} growthStage={growthStage} />;
    }
    return <PlantMesh {...common} />;
  };

  const renderStructure = (s: StructurePlacement, selected: boolean) => (
    <StructureMesh
      placement={s}
      selected={selected}
      onSelect={() => onSelectStructure(s.id)}
    />
  );

  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[8, 12, 6]} intensity={0.85} />
      <OrbitControls
        makeDefault
        maxPolarAngle={Math.PI / 2.1}
        minDistance={3}
        maxDistance={40}
        target={[design.widthMeters / 2, 0, design.depthMeters / 2]}
      />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[design.widthMeters / 2, 0, design.depthMeters / 2]}
        onPointerMove={handleGround}
        onClick={handleGround}
      >
        <planeGeometry args={[design.widthMeters, design.depthMeters]} />
        <meshStandardMaterial color="#365314" />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[design.widthMeters / 2, -0.001, design.depthMeters / 2]}
        onClick={() => onClearSelection()}
      >
        <planeGeometry args={[design.widthMeters + 4, design.depthMeters + 4]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      <GridOverlay3D
        widthMeters={design.widthMeters}
        depthMeters={design.depthMeters}
        gridSizeMeters={design.gridSizeMeters}
      />
      {design.structures
        .filter((s) => s.id !== selectedStructure?.id)
        .map((s) => (
          <group key={`s-${s.id}`}>{renderStructure(s, false)}</group>
        ))}
      {design.plants
        .filter((p) => p.id !== selectedPlant?.id)
        .map((p) => (
          <group key={`p-${p.id}`}>{renderPlant(p, false)}</group>
        ))}
      {!readOnly && selectedPlant && selectedId != null && (
        <TransformableItem
          selectedId={selectedId}
          selectedType="plant"
          onMoveItem={onMoveItem}
        >
          {renderPlant(selectedPlant, true)}
        </TransformableItem>
      )}
      {!readOnly && selectedStructure && selectedId != null && (
        <TransformableItem
          selectedId={selectedId}
          selectedType="structure"
          onMoveItem={onMoveItem}
        >
          {renderStructure(selectedStructure, true)}
        </TransformableItem>
      )}
      {readOnly && selectedPlant && (
        <group key={`ro-p-${selectedPlant.id}`}>{renderPlant(selectedPlant, true)}</group>
      )}
      {readOnly && selectedStructure && (
        <group key={`ro-s-${selectedStructure.id}`}>
          {renderStructure(selectedStructure, true)}
        </group>
      )}
      {ghost && pendingLabel && <GhostPreview3D x={ghost.x} y={ghost.y} />}
      {showSun && (
        <SunlightSceneOverlay
          azimuthDeg={sunPos.azimuthDeg}
          altitudeDeg={sunPos.altitudeDeg}
          plotWidth={design.widthMeters}
          plotDepth={design.depthMeters}
        />
      )}
    </>
  );
}

export function GardenCanvas3D(props: Props) {
  const cam = Math.max(props.design.widthMeters, props.design.depthMeters) * 0.85;

  return (
    <div className="h-full w-full min-h-[320px] rounded-lg overflow-hidden bg-[#0f172a]">
      <Canvas
        camera={{
          position: [
            props.design.widthMeters / 2 + cam * 0.4,
            cam,
            props.design.depthMeters / 2 + cam * 0.4,
          ],
          fov: 45,
        }}
      >
        <Suspense fallback={null}>
          <Scene {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
}
