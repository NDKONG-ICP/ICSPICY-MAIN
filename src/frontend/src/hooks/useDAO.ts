import type { ActorSubclass } from "@dfinity/agent";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Backend } from "../backend";
import { createActor } from "../backend";
import type {
  CreateProposalInput,
  ProposalCategory,
  ProposalPublic,
  ProposalResults,
  ProposalStatus,
  UpdateProposalInput,
  _SERVICE,
} from "../declarations/backend.did";
import { useActor } from "./useActor";
import { useActorReady } from "./useActorReady";

function rawService(actor: Backend | null): ActorSubclass<_SERVICE> | null {
  if (!actor) return null;
  return (actor as unknown as { actor: ActorSubclass<_SERVICE> }).actor;
}

function useDaoActor() {
  return useActor<Backend>(createActor);
}

export type { ProposalPublic, CreateProposalInput, ProposalCategory, ProposalStatus };

export function useProposals(
  status?: ProposalStatus,
  category?: ProposalCategory,
) {
  const { actor, isFetching } = useDaoActor();
  const { actorReady } = useActorReady();
  const svc = rawService(actor);
  return useQuery({
    queryKey: [
      "proposals",
      status ? Object.keys(status)[0] : "all",
      category ? Object.keys(category)[0] : "all",
    ],
    queryFn: async (): Promise<ProposalPublic[]> => {
      if (!svc) return [];
      if (typeof svc.getProposals === "function") {
        return svc.getProposals(
          status ? [status] : [],
          category ? [category] : [],
          0n,
          100n,
        );
      }
      return svc.listDAOProposals();
    },
    enabled: !!svc && !isFetching && actorReady,
  });
}

export function useProposal(id: bigint | undefined) {
  const { actor, isFetching } = useDaoActor();
  const { actorReady } = useActorReady();
  const svc = rawService(actor);
  return useQuery({
    queryKey: ["proposal", id?.toString()],
    queryFn: async (): Promise<ProposalPublic | null> => {
      if (!svc || id === undefined) return null;
      const r =
        typeof svc.getProposal === "function"
          ? await svc.getProposal(id)
          : await svc.getDAOProposal(id);
      return r.length === 1 ? r[0]! : null;
    },
    enabled: !!svc && !isFetching && actorReady && id !== undefined,
  });
}

export function useProposalResults(id: bigint | undefined) {
  const { actor, isFetching } = useDaoActor();
  const svc = rawService(actor);
  return useQuery({
    queryKey: ["proposalResults", id?.toString()],
    queryFn: async (): Promise<ProposalResults | null> => {
      if (!svc || id === undefined) return null;
      if (typeof svc.getProposalResults !== "function") return null;
      const r = await svc.getProposalResults(id);
      return r.length === 1 ? r[0]! : null;
    },
    enabled: !!svc && !isFetching && id !== undefined,
  });
}

export function useHasDAOAccess() {
  const { actor, isFetching } = useDaoActor();
  const { actorReady } = useActorReady();
  const svc = rawService(actor);
  return useQuery({
    queryKey: ["hasDAOAccess"],
    queryFn: async () => {
      if (!svc) return false;
      return svc.hasDAOAccess();
    },
    enabled: !!svc && !isFetching && actorReady,
  });
}

export function useDAOStats() {
  const { actor, isFetching } = useDaoActor();
  const { actorReady } = useActorReady();
  const svc = rawService(actor);
  return useQuery({
    queryKey: ["daoStats"],
    queryFn: async () => {
      if (!svc) {
        return {
          activeProposals: 0n,
          totalVotes: 0n,
          callerVotes: 0n,
          uniqueVoters: 0n,
        };
      }
      const stats = await svc.getDAOStats();
      return {
        activeProposals: BigInt(
          "activeProposals" in stats ? stats.activeProposals : 0,
        ),
        totalVotes: BigInt(stats.totalVotes),
        callerVotes: BigInt(
          "callerVotes" in stats ? (stats as { callerVotes: bigint }).callerVotes : 0,
        ),
        uniqueVoters: BigInt(
          "uniqueVoters" in stats ? (stats as { uniqueVoters: bigint }).uniqueVoters : 0,
        ),
      };
    },
    enabled: !!svc && !isFetching && actorReady,
  });
}

export function useHasVoted(proposalId: bigint | undefined) {
  const { actor, isFetching } = useDaoActor();
  const svc = rawService(actor);
  return useQuery({
    queryKey: ["hasVoted", proposalId?.toString()],
    queryFn: async () => {
      if (!svc || proposalId === undefined) return null;
      if (typeof svc.hasVoted !== "function") return null;
      const r = await svc.hasVoted(proposalId);
      return r.length === 1 ? r[0]! : null;
    },
    enabled: !!svc && !isFetching && proposalId !== undefined,
  });
}

export function useCastVote() {
  const { actor } = useDaoActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      proposalId,
      optionId,
    }: {
      proposalId: bigint;
      optionId: bigint;
    }) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      if (typeof svc.castVote === "function") {
        return svc.castVote(proposalId, optionId);
      }
      await svc.voteOnProposal(proposalId, optionId);
      return true;
    },
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ["proposals"] });
      void qc.invalidateQueries({ queryKey: ["daoStats"] });
      void qc.invalidateQueries({
        queryKey: ["proposal", variables.proposalId.toString()],
      });
      void qc.invalidateQueries({
        queryKey: ["hasVoted", variables.proposalId.toString()],
      });
    },
  });
}

export function useVoteOnProposal() {
  const cast = useCastVote();
  return useMutation({
    mutationFn: async ({
      proposalId,
      optionIndex,
    }: {
      proposalId: bigint;
      optionIndex: bigint;
    }) => cast.mutateAsync({ proposalId, optionId: optionIndex }),
  });
}

export function useCreateProposal() {
  const { actor } = useDaoActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateProposalInput) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      if (typeof svc.createProposal === "function") {
        const r = await svc.createProposal(input);
        return r.proposalId;
      }
      await svc.createDAOProposal(input);
      return 0n;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["proposals"] });
      void qc.invalidateQueries({ queryKey: ["daoStats"] });
    },
  });
}

export function useUpdateProposal() {
  const { actor } = useDaoActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: bigint;
      input: UpdateProposalInput;
    }) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      return svc.updateProposal(id, input);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["proposals"] });
    },
  });
}

export function usePublishProposal() {
  const { actor } = useDaoActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      return svc.publishProposal(id);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["proposals"] });
    },
  });
}

export function useCancelProposal() {
  const { actor } = useDaoActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      return svc.cancelProposal(id);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["proposals"] });
    },
  });
}

export function useCloseProposal() {
  const { actor } = useDaoActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      return svc.closeProposal(id);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["proposals"] });
    },
  });
}
