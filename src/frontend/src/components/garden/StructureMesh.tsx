import type { StructurePlacement } from "@/lib/garden-types";
import { memo } from "react";
import { resolveStructureMesh } from "./structures/StructureModels";

type Props = {
  placement: StructurePlacement;
  selected?: boolean;
  onSelect?: () => void;
};

export const StructureMesh = memo(function StructureMesh(props: Props) {
  const Component = resolveStructureMesh(props.placement.structureType);
  return <Component {...props} />;
});
