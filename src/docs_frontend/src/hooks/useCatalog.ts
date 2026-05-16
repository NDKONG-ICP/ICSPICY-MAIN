import { BUNDLED_SNAPSHOT, fetchCatalog } from "@/lib/catalogQuery";
import { useQuery } from "@tanstack/react-query";

export function useCatalog() {
  return useQuery({
    queryKey: ["docs", "catalog"],
    queryFn: fetchCatalog,
    placeholderData: BUNDLED_SNAPSHOT,
    initialData: BUNDLED_SNAPSHOT,
  });
}
