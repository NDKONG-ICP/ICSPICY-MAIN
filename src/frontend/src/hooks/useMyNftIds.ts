import { Principal as DfinityPrincipal } from "@dfinity/principal";
import { useQuery } from "@tanstack/react-query";
import { useIcrc7Actor } from "../lib/icrc7-actor";
import { useActorReady } from "./useActorReady";
import { useAuth } from "./useAuth";

/** ICRC-7 token IDs owned by the connected principal (query). */
export function useMyNftTokenIds() {
  const { principal, isAuthenticated } = useAuth();
  const { actor, isFetching } = useIcrc7Actor();
  const { actorReady } = useActorReady();
  const pid = principal?.toText() ?? "";

  return useQuery({
    queryKey: ["icrc7_tokens_of", pid],
    enabled:
      !!actor &&
      actorReady &&
      isAuthenticated &&
      !!principal &&
      !principal.isAnonymous() &&
      !isFetching,
    queryFn: async () => {
      if (!actor || !principal) return [];
      const account = {
        owner: DfinityPrincipal.fromText(principal.toText()),
        subaccount: [] as [],
      };
      const ids = await actor.icrc7_tokens_of(account, [], []);
      return ids;
    },
  });
}
