import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Backend } from "../backend";
import type { PlantId } from "../declarations/backend.did";
import { uploadNimsPhoto } from "../lib/nims-photo-upload";
import { useActor } from "./useActor";

export function useUploadNimsPhoto() {
  const { actor } = useActor<Backend>();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      plantId,
      file,
    }: {
      plantId: PlantId;
      file: File;
    }) => {
      if (!actor) throw new Error("Not connected");
      return uploadNimsPhoto(actor, plantId, file);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({
        queryKey: ["nimsPhoto", vars.plantId.toString()],
      });
      qc.invalidateQueries({
        queryKey: ["plantLifecycle", vars.plantId.toString()],
      });
    },
  });
}
