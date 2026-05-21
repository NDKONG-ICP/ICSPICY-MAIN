import { useQuery } from "@tanstack/react-query";
import { fetchTokenPricesUsd } from "../lib/price-service";

export function useTokenPrices() {
  return useQuery({
    queryKey: ["token-prices-usd"],
    queryFn: fetchTokenPricesUsd,
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 2,
  });
}
