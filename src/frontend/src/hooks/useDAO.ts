import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createActor } from "../backend";
import type { CreateProposalInput, ProposalId } from "../backend";

function useBackendActor() {
  return useActor(createActor);
}

// ─── DAO Query Hooks ──────────────────────────────────────────────────────────

export function useProposals() {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["proposals"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listDAOProposals();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useProposal(id: ProposalId | undefined) {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["proposal", id?.toString()],
    queryFn: async () => {
      if (!actor || id === undefined) return null;
      return actor.getDAOProposal(id);
    },
    enabled: !!actor && !isFetching && id !== undefined,
  });
}

export function useHasDAOAccess() {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["hasDAOAccess"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.hasDAOAccess();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useDAOStats() {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["daoStats"],
    queryFn: async () => {
      if (!actor)
        return {
          totalProposals: BigInt(0),
          activeProposals: BigInt(0),
          totalVotes: BigInt(0),
        };
      return actor.getDAOStats();
    },
    enabled: !!actor && !isFetching,
  });
}

// ─── DAO Mutation Hooks ───────────────────────────────────────────────────────

export function useCreateProposal() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateProposalInput) => {
      if (!actor) throw new Error("Not connected");
      return actor.createDAOProposal(input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proposals"] });
      qc.invalidateQueries({ queryKey: ["daoStats"] });
    },
  });
}

export function useVoteOnProposal() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      proposalId,
      optionIndex,
    }: { proposalId: ProposalId; optionIndex: bigint }) => {
      if (!actor) throw new Error("Not connected");
      return actor.voteOnProposal(proposalId, optionIndex);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proposals"] });
      qc.invalidateQueries({ queryKey: ["daoStats"] });
    },
  });
}
