import { useQuery } from "@tanstack/react-query";
import { BUNDLED_SNAPSHOT, fetchCatalog } from "@/lib/catalogQuery";

export function useCatalog() {
  return useQuery({
    queryKey: ["docs", "catalog"],
    queryFn: fetchCatalog,
    placeholderData: BUNDLED_SNAPSHOT,
    initialData: BUNDLED_SNAPSHOT,
  });
}
