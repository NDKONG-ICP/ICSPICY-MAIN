import { Grid } from "@react-three/drei";

type Props = {
  widthMeters: number;
  depthMeters: number;
  gridSizeMeters: number;
};

export function GridOverlay3D({
  widthMeters,
  depthMeters,
  gridSizeMeters,
}: Props) {
  return (
    <Grid
      args={[widthMeters, depthMeters]}
      cellSize={gridSizeMeters}
      cellThickness={0.6}
      sectionSize={gridSizeMeters * 5}
      sectionThickness={1}
      fadeDistance={40}
      fadeStrength={1}
      position={[widthMeters / 2, 0.02, depthMeters / 2]}
      infiniteGrid={false}
    />
  );
}
