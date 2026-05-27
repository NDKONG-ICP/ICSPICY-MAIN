import { Html } from "@react-three/drei";
import { memo, useRef, useState } from "react";
import type { PlantPlacement } from "@/lib/garden-types";
import { getPlantById } from "@/lib/garden-plant-catalog";
import { GenericPlantModel } from "./GenericPlantModel";
import { PepperPlantModel } from "./PepperPlantModel";

type Props = {
  placement: PlantPlacement;
  selected?: boolean;
  scovilleLabel?: string | null;
  maturity?: number;
  readOnly?: boolean;
  onSelect?: () => void;
  onLongPressDelete?: () => void;
};

export const PlantModel = memo(function PlantModel({
  placement,
  selected,
  scovilleLabel,
  maturity = 0.85,
  readOnly,
  onSelect,
  onLongPressDelete,
}: Props) {
  const [hovered, setHovered] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rotY = (placement.rotation * Math.PI) / 180;
  const catalog = placement.catalogId ? getPlantById(placement.catalogId) : null;
  const scoville = placement.scoville ?? catalog?.scovilleMax ?? 50_000;
  const profile = catalog?.profile ?? (scoville > 500_000 ? "superhot" : scoville > 100_000 ? "bushy" : "upright");
  const modelType = catalog?.modelType ?? (placement.icon === "🌶️" ? "pepper" : "herb");

  const startLongPress = () => {
    if (readOnly || !onLongPressDelete) return;
    pressTimer.current = setTimeout(() => onLongPressDelete(), 600);
  };
  const cancelLongPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  const inner =
    modelType === "pepper" || placement.icon === "🌶️" || placement.icon === "🔥" ? (
      <PepperPlantModel
        scale={placement.scale}
        maturity={maturity}
        scoville={scoville}
        seed={placement.id}
        profile={profile}
        isSelected={selected}
      />
    ) : (
      <GenericPlantModel
        modelType={modelType}
        scale={placement.scale}
        maturity={maturity}
        color={placement.color || catalog?.color || "#2d7d2d"}
        fruitColor={catalog?.fruitColor ?? null}
        seed={placement.id}
        isSelected={selected}
      />
    );

  return (
    <group
      position={[placement.x, 0, placement.y]}
      rotation={[0, rotY, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
      onPointerDown={startLongPress}
      onPointerUp={cancelLongPress}
      onPointerLeave={cancelLongPress}
    >
      {inner}
      {(hovered || selected) && (
        <Html distanceFactor={14} position={[0, 0.6 * placement.scale + 0.2, 0]} center>
          <div className="rounded-md bg-card/95 border border-border px-2 py-1 text-xs whitespace-nowrap shadow-lg pointer-events-none max-w-[180px]">
            <span className="font-medium">{placement.label}</span>
            {catalog?.funFact && hovered && (
              <p className="text-muted-foreground mt-0.5 text-[10px]">{catalog.funFact}</p>
            )}
            {scovilleLabel && (
              <span className="text-muted-foreground ml-1">· {scovilleLabel}</span>
            )}
          </div>
        </Html>
      )}
    </group>
  );
});
