import { useActor } from "@caffeineai/core-infrastructure";
import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createActor } from "../backend";
import { useIcrc7Actor } from "../lib/icrc7-actor";

import type {
  AddFeedingInput,
  AddWeatherRecordInput,
  ArtworkLayerId,
  ClaimTokenId,
  ContainerSize,
  CounterOfferInput,
  CreateCommentInput,
  CreateOrderInput,
  CreatePlantInput,
  CreatePostInput,
  CreateProductInput,
  CreateProposalInput,
  CreateRecipeInput,
  CreateTrayInput,
  MembershipTier,
  MintRWAProvenanceInput,
  NFTStandard,
  Offer,
  OrderId,
  OrderStatus,
  PaymentToken,
  PlantId,
  PlantStage,
  PostId,
  ProductCategory,
  ProductId,
  ProposalId,
  RarityTier,
  RecipeId,
  SaveProfileInput,
  SubmitOfferInput,
  TrayId,
  TreasuryToken,
  TreasuryTransaction,
  UpdateCellDataInput,
  UpdatePlantMetadataInput,
  UpdateProductInput,
  UpdateRecipeInput,
  UserRole,
} from "../backend";
import { useActorReady } from "./useActorReady";
import { useAuth } from "./useAuth";

function useBackendActor() {
  return useActor(createActor);
}

// ─── Products ───────────────────────────────────────────────────────────────

export function useBulkCreateProducts() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (inputs: CreateProductInput[]) => {
      if (!actor) throw new Error("Not connected");
      // Call bulkCreateProducts if available, otherwise fall back to sequential createProduct
      const a = actor as typeof actor & {
        bulkCreateProducts?: (
          inputs: CreateProductInput[],
        ) => Promise<Array<{ ok: unknown } | { err: string }>>;
      };
      if (typeof a.bulkCreateProducts === "function") {
        return a.bulkCreateProducts(inputs);
      }
      // Fallback: sequential
      const results: Array<{ ok: unknown } | { err: string }> = [];
      for (const input of inputs) {
        try {
          const ok = await actor.createProduct(input);
          results.push({ ok });
        } catch (e) {
          results.push({
            err: e instanceof Error ? e.message : "Unknown error",
          });
        }
      }
      return results;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useProducts() {
  const { actor } = useBackendActor();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: ["products", actorReady],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listProducts();
    },
    // Use actorReady as the gate — same pattern as useProfile().
    // The previous `!!actor && !isFetching` guard was blocking this query
    // because isFetching stays true during actor initialization, causing the
    // products list to never load in the admin panel.
    enabled: !!actor && actorReady,
  });
}

export function useProduct(productId: ProductId | undefined) {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["product", productId?.toString()],
    queryFn: async () => {
      if (!actor || productId === undefined) return null;
      return actor.getProduct(productId);
    },
    enabled: !!actor && !isFetching && productId !== undefined,
  });
}

export function useProductsByCategory(category: ProductCategory | undefined) {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["products", "category", category],
    queryFn: async () => {
      if (!actor || !category) return [];
      return actor.listProductsByCategory(category);
    },
    enabled: !!actor && !isFetching && !!category,
  });
}

export function useCreateProduct() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateProductInput) => {
      if (!actor) throw new Error("Not connected");
      return actor.createProduct(input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useUpdateProduct() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateProductInput) => {
      if (!actor) throw new Error("Not connected");
      return actor.updateProduct(input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useDeleteProduct() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (productId: ProductId) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteProduct(productId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

// ─── Plants ─────────────────────────────────────────────────────────────────

export function usePlants() {
  const { actor } = useBackendActor();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: ["plants", actorReady],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listPlants();
    },
    enabled: !!actor && actorReady,
  });
}

export function useMyPlants() {
  const { actor } = useBackendActor();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: ["myPlants", actorReady],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listMyPlants();
    },
    enabled: !!actor && actorReady,
  });
}

export function usePlantsByStage(stage: PlantStage | undefined) {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["plants", "stage", stage],
    queryFn: async () => {
      if (!actor || !stage) return [];
      return actor.listPlantsByStage(stage);
    },
    enabled: !!actor && !isFetching && !!stage,
  });
}

export function usePlant(plantId: PlantId | undefined) {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["plant", plantId?.toString()],
    queryFn: async () => {
      if (!actor || plantId === undefined) return null;
      return actor.getPlant(plantId);
    },
    enabled: !!actor && !isFetching && plantId !== undefined,
  });
}

export function usePlantTimeline(plantId: PlantId | undefined) {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["plantTimeline", plantId?.toString()],
    queryFn: async () => {
      if (!actor || plantId === undefined) return null;
      return actor.getPlantTimeline(plantId);
    },
    enabled: !!actor && !isFetching && plantId !== undefined,
  });
}

export function useCreatePlant() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePlantInput) => {
      if (!actor) throw new Error("Not connected");
      return actor.createPlant(input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plants"] });
      qc.invalidateQueries({ queryKey: ["myPlants"] });
      qc.invalidateQueries({ queryKey: ["trays"] });
    },
  });
}

export function useUpdatePlantStage() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      plantId,
      stage,
      notes,
    }: { plantId: PlantId; stage: PlantStage; notes: string }) => {
      if (!actor) throw new Error("Not connected");
      return actor.updatePlantStage(plantId, stage, notes);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plants"] });
      qc.invalidateQueries({ queryKey: ["myPlants"] });
      qc.invalidateQueries({ queryKey: ["plant"] });
      qc.invalidateQueries({ queryKey: ["plantTimeline"] });
    },
  });
}

export function useUpdatePlantMetadata() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdatePlantMetadataInput) => {
      if (!actor) throw new Error("Not connected");
      return actor.updatePlantMetadata(input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plants"] });
      qc.invalidateQueries({ queryKey: ["myPlants"] });
      qc.invalidateQueries({ queryKey: ["plant"] });
    },
  });
}

export function useUpdateCellData() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateCellDataInput) => {
      if (!actor) throw new Error("Not connected");
      return actor.updateCellData(input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myPlants"] });
      qc.invalidateQueries({ queryKey: ["plants"] });
    },
  });
}

export function useToggleCooked() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (plantId: PlantId) => {
      if (!actor) throw new Error("Not connected");
      return actor.toggleCooked(plantId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myPlants"] });
      qc.invalidateQueries({ queryKey: ["plants"] });
    },
  });
}

export function useTransplantCell() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      plant_id: PlantId;
      container_size: ContainerSize;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.transplantCell(input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myPlants"] });
      qc.invalidateQueries({ queryKey: ["plants"] });
      qc.invalidateQueries({ queryKey: ["trays"] });
    },
  });
}

export function useAddPlantPhoto() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      plantId,
      photoKey,
    }: { plantId: PlantId; photoKey: string }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addPlantPhoto(plantId, photoKey);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myPlants"] });
      qc.invalidateQueries({ queryKey: ["plants"] });
    },
  });
}

export function useRemovePlantPhoto() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      plantId,
      photoKey,
    }: { plantId: PlantId; photoKey: string }) => {
      if (!actor) throw new Error("Not connected");
      return actor.removePlantPhoto(plantId, photoKey);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myPlants"] });
    },
  });
}

export function useSetForSale() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      plantId,
      forSale,
    }: { plantId: PlantId; forSale: boolean }) => {
      if (!actor) throw new Error("Not connected");
      return actor.setForSale(plantId, forSale);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myPlants"] });
      qc.invalidateQueries({ queryKey: ["plants"] });
    },
  });
}

export function useAddFeedingRecord() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AddFeedingInput) => {
      if (!actor) throw new Error("Not connected");
      return actor.addFeedingRecord(input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plantTimeline"] }),
  });
}

export function useMarkPlantGerminated() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      plantId,
      date,
    }: { plantId: PlantId; date: bigint }) => {
      if (!actor) throw new Error("Not connected");
      return actor.markPlantGerminated(plantId, date);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myPlants"] });
      qc.invalidateQueries({ queryKey: ["plants"] });
      qc.invalidateQueries({ queryKey: ["plantTimeline"] });
    },
  });
}

// ─── Weather ─────────────────────────────────────────────────────────────────

export function useMyWeatherRecords(limit = 14) {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["weatherRecords", limit],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMyWeatherRecords(BigInt(limit));
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddWeatherRecord() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AddWeatherRecordInput) => {
      if (!actor) throw new Error("Not connected");
      return actor.addWeatherRecord(input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["weatherRecords"] }),
  });
}

// ─── Artwork Layers ──────────────────────────────────────────────────────────

export function useArtworkLayers() {
  const { actor } = useBackendActor();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: ["artworkLayers", actorReady],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listArtworkLayers();
    },
    enabled: !!actor && actorReady,
  });
}

export function useAddArtworkLayer() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      objectKey,
      layerNumber,
    }: { name: string; objectKey: string; layerNumber: bigint }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addArtworkLayer(name, objectKey, layerNumber);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["artworkLayers"] }),
  });
}

export function useMintRWAProvenance() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: MintRWAProvenanceInput) => {
      if (!actor) throw new Error("Not connected");
      return actor.mintRWAProvenance(input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myPlants"] });
      qc.invalidateQueries({ queryKey: ["plants"] });
    },
  });
}

// ─── Trays ───────────────────────────────────────────────────────────────────

export function useTrays() {
  const { actor } = useBackendActor();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: ["trays", actorReady],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listTrays();
    },
    enabled: !!actor && actorReady,
  });
}

export function useMyTrays() {
  return useTrays();
}

export function useTray(trayId: TrayId | undefined) {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["tray", trayId?.toString()],
    queryFn: async () => {
      if (!actor || trayId === undefined) return null;
      return actor.getTray(trayId);
    },
    enabled: !!actor && !isFetching && trayId !== undefined,
  });
}

export function useCreateTray() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTrayInput) => {
      if (!actor) throw new Error("Not connected");
      return actor.createTray(input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trays"] }),
  });
}

export function useUpdateTrayName() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ trayId, name }: { trayId: TrayId; name: string }) => {
      if (!actor) throw new Error("Not connected");
      return actor.updateTrayName(trayId, name);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trays"] }),
  });
}

export function useDeleteTray() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (trayId: TrayId) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteTray(trayId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trays"] });
      qc.invalidateQueries({ queryKey: ["myPlants"] });
    },
  });
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export function useMyOrders() {
  const { actor } = useBackendActor();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: ["myOrders", actorReady],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listOrdersByBuyer();
    },
    enabled: !!actor && actorReady,
  });
}

export function useOrder(orderId: OrderId | undefined) {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["order", orderId?.toString()],
    queryFn: async () => {
      if (!actor || orderId === undefined) return null;
      return actor.getOrder(orderId);
    },
    enabled: !!actor && !isFetching && orderId !== undefined,
  });
}

export function usePlaceOrder() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateOrderInput) => {
      if (!actor) throw new Error("Not connected");
      return actor.placeOrder(input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["myOrders"] }),
  });
}

export function useUpdateOrderStatus() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orderId,
      status,
    }: { orderId: OrderId; status: OrderStatus }) => {
      if (!actor) throw new Error("Not connected");
      return actor.updateOrderStatus(orderId, status);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myOrders"] });
      qc.invalidateQueries({ queryKey: ["order"] });
    },
  });
}

// ─── DAO ─────────────────────────────────────────────────────────────────────

export function useProposals() {
  const { actor } = useBackendActor();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: ["proposals", actorReady],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listDAOProposals();
    },
    enabled: !!actor && actorReady,
  });
}

export function useProposal(proposalId: ProposalId | undefined) {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["proposal", proposalId?.toString()],
    queryFn: async () => {
      if (!actor || proposalId === undefined) return null;
      return actor.getDAOProposal(proposalId);
    },
    enabled: !!actor && !isFetching && proposalId !== undefined,
  });
}

export function useCreateProposal() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateProposalInput) => {
      if (!actor) throw new Error("Not connected");
      return actor.createDAOProposal(input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  });
}

// ─── Community ───────────────────────────────────────────────────────────────

export function usePosts() {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listPosts();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCommentsByPost(postId: PostId | undefined) {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["comments", postId?.toString()],
    queryFn: async () => {
      if (!actor || postId === undefined) return [];
      return actor.listCommentsByPost(postId);
    },
    enabled: !!actor && !isFetching && postId !== undefined,
  });
}

export function useCreatePost() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePostInput) => {
      if (!actor) throw new Error("Not connected");
      return actor.createPost(input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });
}

export function useLikePost() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      postId,
      liked,
    }: { postId: PostId; liked: boolean }) => {
      if (!actor) throw new Error("Not connected");
      return liked ? actor.unlikePost(postId) : actor.likePost(postId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });
}

export function useCreateComment() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCommentInput) => {
      if (!actor) throw new Error("Not connected");
      return actor.createComment(input);
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["comments", vars.post_id.toString()] }),
  });
}

export function useFollowUser() {
  const { actor } = useBackendActor();
  const { principal } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      target,
      following,
    }: { target: Principal; following: boolean }) => {
      if (!actor) throw new Error("Not connected");
      return following ? actor.unfollowUser(target) : actor.followUser(target);
    },
    onSuccess: () => {
      // Must use the principal-scoped key that matches useProfile's queryKey
      const principalText = principal?.toText() ?? "anon";
      qc.invalidateQueries({ queryKey: ["profile", principalText] });
    },
  });
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export function useProfile() {
  const { actor } = useBackendActor();
  const { principal, isAuthenticated } = useAuth();
  const { actorReady } = useActorReady();
  // Scope by principal so React Query never serves a stale profile from a
  // prior session. Matches the pattern used by useIsAdmin to prevent the
  // race condition where anonymous/old data is returned after sign-in.
  const principalText = principal?.toText() ?? "anon";
  const isAnon = !principal || principal.isAnonymous();

  // CRITICAL (TanStack Query v5): we return `isPending` (not `isLoading`) so
  // callers can correctly gate on "has this query returned data at least once".
  // isPending=true until the first successful response — including the window
  // between actorReady=true and the fetch completing where isLoading can be false.
  return useQuery({
    queryKey: ["profile", principalText],
    queryFn: async () => {
      if (!actor || isAnon || !isAuthenticated) return null;
      return actor.getCallerUserProfile();
    },
    // SIMPLIFIED GATE: actorReady is the single reliable source of truth.
    // ActorReadyProvider only sets actorReady=true AFTER a confirmed backend
    // round-trip proves the actor is using the authenticated identity.
    // For the admin, ensureAdminProfile() has already been called inside the
    // probe before actorReady=true fires, so the profile exists on the backend.
    enabled: actorReady,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useUserProfile(principal: Principal | undefined) {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["userProfile", principal?.toText()],
    queryFn: async () => {
      if (!actor || !principal) return null;
      return actor.getPublicProfile(principal);
    },
    enabled: !!actor && !isFetching && !!principal,
  });
}

export function useSaveProfile() {
  const { actor } = useBackendActor();
  const { principal } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveProfileInput) => {
      if (!actor) throw new Error("Not connected");
      return actor.saveCallerUserProfile(input);
    },
    onSuccess: () => {
      // Must use the principal-scoped key that matches useProfile's queryKey
      const principalText = principal?.toText() ?? "anon";
      qc.invalidateQueries({ queryKey: ["profile", principalText] });
    },
  });
}

// ─── Membership ──────────────────────────────────────────────────────────────

export function useMembership() {
  const { actor } = useBackendActor();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: ["membership", actorReady],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerMembership();
    },
    enabled: !!actor && actorReady,
  });
}

export function useHasMembership() {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["hasMembership"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.hasMembership();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useIssueMembership() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      owner,
      tier,
      standard,
    }: { owner: Principal; tier: MembershipTier; standard: NFTStandard }) => {
      if (!actor) throw new Error("Not connected");
      return actor.issueMembership(owner, tier, standard);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["membership"] });
      qc.invalidateQueries({ queryKey: ["hasMembership"] });
    },
  });
}

// ─── Admin ───────────────────────────────────────────────────────────────────

// Hardcoded admin PIDs — single source of truth for admin access control.
// All PIDs belong to the nursery owner (Internet Identity can assign different
// PIDs across devices/browsers, and may include/exclude the trailing checksum).
export const ADMIN_PIDS = new Set([
  "lgjjr-4bwun-koggr-pornj-ltxia-m4xxo-iy7mg-cct7e-okxub-mbxku-tae",
  "7qhp3-ojhp3-sjhf6-lnj6s-kqxyt-q4iaw-vtdxi-youle-zn666-4o5gh",
  "7qhp3-ojhp3-sjhf6-lnj6s-kqxyt-q4iaw-vtdxi-youle-zn666-4o5gh-qae",
]);

/**
 * Checks if a principal text matches any known admin PID.
 * Uses multiple strategies to handle whitespace, encoding, and case artifacts:
 *   1. Exact match
 *   2. Trimmed match (handles leading/trailing whitespace)
 *   3. Lowercase + trimmed match (handles any case differences)
 *   4. Prefix match — checks if the principal starts with a known PID base
 *      (handles cases where II appends extra checksum segments)
 */
function checkIsAdminPid(raw: string): boolean {
  if (!raw) return false;
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();

  // Strategy 1 & 2: exact and trimmed exact
  if (ADMIN_PIDS.has(raw) || ADMIN_PIDS.has(trimmed)) return true;

  // Strategy 3: case-insensitive
  for (const pid of ADMIN_PIDS) {
    if (pid.toLowerCase() === lower) return true;
  }

  // Strategy 4: prefix match — Internet Identity sometimes appends a checksum
  // segment to the base PID (e.g., "abc-def" → "abc-def-ghi"). Check if the
  // raw principal starts with any known admin PID.
  for (const pid of ADMIN_PIDS) {
    if (trimmed.startsWith(pid) || pid.startsWith(trimmed)) return true;
  }

  return false;
}

/**
 * useIsAdmin — SYNCHRONOUS. No TanStack Query, no async, no backend call.
 *
 * isAdmin is a pure derived value from the principal string. The PID is known
 * the instant isAuthenticated=true. No backend round-trip is needed because
 * admin status is determined solely by the hardcoded PID list.
 *
 * This eliminates ALL race conditions:
 *   - No isPending/isLoading confusion
 *   - No actorReady gate needed
 *   - No query cache stale data
 *   - No timing window where the query fires with anonymous context
 *
 * Callers receive { data: boolean, isPending: boolean, isFetching: false }
 * matching the TanStack Query shape so call sites need no changes.
 */
export function useIsAdmin() {
  const { principal, isAuthenticated, isInitializing } = useAuth();
  const principalText = principal?.toText() ?? "";

  // isAdmin is true ONLY when authenticated AND the PID matches admin list.
  // We use checkIsAdminPid() which applies trim/case/prefix normalization as
  // a safety net against encoding artifacts from Internet Identity.
  const isAdmin =
    isAuthenticated && principalText !== ""
      ? checkIsAdminPid(principalText)
      : false;

  // isPending is ONLY true while Internet Identity is still initializing.
  // Once isInitializing=false, we have a definitive answer — no waiting needed.
  const isPending = isInitializing;

  // Always log — never gated on NODE_ENV so it's visible in preview builds too.
  console.log("[useIsAdmin] principal check →", {
    principalText,
    principalTextLength: principalText.length,
    principalCharCodes: principalText
      .slice(0, 10)
      .split("")
      .map((c) => c.charCodeAt(0)),
    isAuthenticated,
    isInitializing,
    isAdmin,
    adminPidList: Array.from(ADMIN_PIDS),
    exactMatch: ADMIN_PIDS.has(principalText),
    trimmedMatch: ADMIN_PIDS.has(principalText.trim()),
  });

  return {
    data: isAdmin,
    isPending,
    isFetching: false,
  };
}

export function useUserRole() {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["userRole"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerUserRole();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAssignRole() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ user, role }: { user: Principal; role: UserRole }) => {
      if (!actor) throw new Error("Not connected");
      return actor.assignCallerUserRole(user, role);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["userRole"] }),
  });
}

export function useMintICRC37() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      plantId,
      imageKey,
      attributes,
    }: {
      plantId: PlantId;
      imageKey: string | null;
      attributes: Array<[string, string]>;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.mintICRC37(plantId, imageKey, attributes);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plants"] }),
  });
}

export function useMintHederaNFT() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      plantId,
      imageKey,
      attributes,
    }: {
      plantId: PlantId;
      imageKey: string | null;
      attributes: Array<[string, string]>;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.mintHederaNFT(plantId, imageKey, attributes);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plants"] }),
  });
}

export function useAirdropNFT() {
  const { actor } = useBackendActor();
  return useMutation({
    mutationFn: async ({
      tokenId,
      recipient,
    }: { tokenId: string; recipient: Principal }) => {
      if (!actor) throw new Error("Not connected");
      return actor.airdropNFT(tokenId, recipient);
    },
  });
}

export function useGeneratePickupQR() {
  const { actor } = useBackendActor();
  return useMutation({
    mutationFn: async (plantId: PlantId) => {
      if (!actor) throw new Error("Not connected");
      return actor.generatePickupQRPayload(plantId);
    },
  });
}

// ─── Recipes ─────────────────────────────────────────────────────────────────

export function useListRecipes() {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["recipes"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listRecipes();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetRecipe(id: RecipeId | undefined) {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["recipe", id?.toString()],
    queryFn: async () => {
      if (!actor || id === undefined) return null;
      return actor.getRecipe(id);
    },
    enabled: !!actor && !isFetching && id !== undefined,
  });
}

export function useCreateRecipe() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateRecipeInput) => {
      if (!actor) throw new Error("Not connected");
      return actor.createRecipe(input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recipes"] }),
  });
}

export function useUpdateRecipe() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateRecipeInput) => {
      if (!actor) throw new Error("Not connected");
      return actor.updateRecipe(input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recipes"] }),
  });
}

export function useDeleteRecipe() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: RecipeId) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteRecipe(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recipes"] }),
  });
}

export function useToggleRecipeFeatured() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: RecipeId) => {
      if (!actor) throw new Error("Not connected");
      return actor.toggleRecipeFeatured(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recipes"] }),
  });
}

export function useSeedDefaultRecipes() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Not connected");
      return actor.seedDefaultRecipes();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recipes"] }),
  });
}

// ─── Claim Tokens (QR NFT Claims) ────────────────────────────────────────────

export function useGenerateClaimToken() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      plantId,
      rarityTier,
    }: { plantId: PlantId; rarityTier: RarityTier }) => {
      if (!actor) throw new Error("Not connected");
      return actor.generateClaimToken(plantId, rarityTier);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plants"] });
      qc.invalidateQueries({ queryKey: ["myPlants"] });
    },
  });
}

export function useRedeemClaim() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tokenId: ClaimTokenId) => {
      if (!actor) throw new Error("Not connected");
      return actor.redeemClaim(tokenId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["membership"] });
      qc.invalidateQueries({ queryKey: ["hasMembership"] });
      qc.invalidateQueries({ queryKey: ["claimToken"] });
    },
  });
}

export function useGetClaimToken(tokenId: ClaimTokenId | undefined) {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["claimToken", tokenId],
    queryFn: async () => {
      if (!actor || !tokenId) return null;
      return actor.getClaimToken(tokenId);
    },
    enabled: !!actor && !isFetching && !!tokenId,
  });
}

// ─── Application Schedule Builder ────────────────────────────────────────────

export function useGetScheduleData(
  stage: string | undefined,
  inputs: string[],
) {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["scheduleData", stage, inputs],
    queryFn: async () => {
      if (!actor || !stage || inputs.length === 0) return [];
      return actor.getScheduleData(stage, inputs);
    },
    enabled: !!actor && !isFetching && !!stage && inputs.length > 0,
  });
}

export function useSaveSchedule() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      stage,
      inputs,
    }: { stage: string; inputs: string[] }) => {
      if (!actor) throw new Error("Not connected");
      return actor.saveSchedule(stage, inputs);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mySchedules"] }),
  });
}

export function useGetMySchedules() {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["mySchedules"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMySchedules();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetScheduleByShareToken(shareToken: string | undefined) {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["schedule", shareToken],
    queryFn: async () => {
      if (!actor || !shareToken) return null;
      return actor.getScheduleByShareToken(shareToken);
    },
    enabled: !!actor && !isFetching && !!shareToken,
  });
}

// ─── Batch Gift Pack ──────────────────────────────────────────────────────────

export function useCreateBatchGiftPack() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (plantIds: PlantId[]) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.createBatchGiftPack(plantIds);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["batchGiftPacks"] });
      qc.invalidateQueries({ queryKey: ["batchGiftPack"] });
    },
  });
}

export function useGetBatchGiftPack(tokenId: ClaimTokenId | undefined) {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["batchGiftPack", tokenId],
    queryFn: async () => {
      if (!actor || !tokenId) return null;
      return actor.getBatchGiftPack(tokenId);
    },
    enabled: !!actor && !isFetching && !!tokenId,
  });
}

export function useRedeemBatchClaim() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tokenId: ClaimTokenId) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.redeemBatchClaim(tokenId);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["membership"] });
      qc.invalidateQueries({ queryKey: ["hasMembership"] });
      qc.invalidateQueries({ queryKey: ["batchGiftPack"] });
    },
  });
}

// ─── Resale Marketplace ───────────────────────────────────────────────────────

export function useGetActiveResaleListings() {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["resaleListings"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getActiveResaleListings();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetMyResaleListings() {
  const { actor } = useBackendActor();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: ["myResaleListings", actorReady],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMyResaleListings();
    },
    enabled: !!actor && actorReady,
  });
}

export function useListNFTForResale() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      plantId,
      priceIcp,
    }: { plantId: PlantId; priceIcp: number }) => {
      if (!actor) throw new Error("Not connected");
      return actor.listNFTForResale(plantId, priceIcp);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["resaleListings"] });
      qc.invalidateQueries({ queryKey: ["myResaleListings"] });
      qc.invalidateQueries({ queryKey: ["myPlants"] });
    },
  });
}

export function useCancelResaleListing() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (listingId: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.cancelResaleListing(listingId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["resaleListings"] });
      qc.invalidateQueries({ queryKey: ["myResaleListings"] });
      qc.invalidateQueries({ queryKey: ["myPlants"] });
    },
  });
}

export function useBuyResaleListing() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (listingId: string) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.buyResaleListing(listingId);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["resaleListings"] });
      qc.invalidateQueries({ queryKey: ["myResaleListings"] });
      qc.invalidateQueries({ queryKey: ["myPlants"] });
      qc.invalidateQueries({ queryKey: ["membership"] });
      qc.invalidateQueries({ queryKey: ["hasMembership"] });
    },
  });
}

// ─── Lifecycle Upgrade Triggers ───────────────────────────────────────────────

export function useTriggerLifecycleUpgrade() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      plantId,
      newStage,
    }: { plantId: PlantId; newStage: string }) => {
      if (!actor) throw new Error("Not connected");
      return actor.triggerLifecycleUpgrade(plantId, newStage);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plants"] });
      qc.invalidateQueries({ queryKey: ["myPlants"] });
      qc.invalidateQueries({ queryKey: ["plantTimeline"] });
      qc.invalidateQueries({ queryKey: ["upgradeHistory"] });
    },
  });
}

export function useGetUpgradeHistory(plantId: PlantId | undefined) {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["upgradeHistory", plantId?.toString()],
    queryFn: async () => {
      if (!actor || plantId === undefined) return [];
      return actor.getUpgradeHistory(plantId);
    },
    enabled: !!actor && !isFetching && plantId !== undefined,
  });
}

// ─── Canister ID ──────────────────────────────────────────────────────────────

export function useGetCanisterId() {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["canisterId"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCanisterId();
    },
    enabled: !!actor && !isFetching,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

// ─── EXT Minting ─────────────────────────────────────────────────────────────

export function useMintEXT() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      plantId,
      imageKey,
      attributes,
    }: {
      plantId: PlantId;
      imageKey: string;
      attributes: Array<[string, string]>;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.mintEXT(plantId, imageKey, attributes);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plants"] }),
  });
}

// ─── Batch Founders Mint ──────────────────────────────────────────────────────

export function useBatchMintFoundersCollection() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entries: import("../backend").FoundersMintInput[]) => {
      if (!actor) throw new Error("Not connected");
      return actor.batchMintFoundersCollection(entries);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plants"] });
      qc.invalidateQueries({ queryKey: ["membership"] });
    },
  });
}

// ─── Token Prices (ICPSwap Oracle) ───────────────────────────────────────────

export function useTokenPrices() {
  const { actor } = useBackendActor();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: ["tokenPrices", actorReady],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTokenPrices();
    },
    enabled: !!actor && actorReady,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useRefreshTokenPrices() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Not connected");
      return actor.refreshTokenPrices();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tokenPrices"] }),
  });
}

export function useMembershipPrices() {
  const { actor, isFetching } = useBackendActor();
  const ORACLE_TOKENS = ["ICP", "ckBTC", "ckETH", "ckUSDC", "ckUSDT"] as const;
  return useQuery({
    queryKey: ["membershipPrices"],
    queryFn: async () => {
      if (!actor) return {};
      const results = await Promise.all(
        ORACLE_TOKENS.map(async (t) => {
          try {
            const price = await actor.getMembershipPriceInToken(t);
            return [t, price] as const;
          } catch {
            return [t, null] as const;
          }
        }),
      );
      return Object.fromEntries(results) as Record<string, bigint | null>;
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 60_000,
  });
}

// ─── Treasury ─────────────────────────────────────────────────────────────────

export function useTreasuryBalances() {
  const { actor } = useBackendActor();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: ["treasuryBalances", actorReady],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTreasuryBalances();
    },
    enabled: !!actor && actorReady,
    refetchInterval: 30_000,
  });
}

export function useTreasuryLedger() {
  const { actor } = useBackendActor();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: ["treasuryLedger", actorReady],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTreasuryLedger();
    },
    enabled: !!actor && actorReady,
  });
}

export function useTreasuryDeposit() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      token,
      amount,
      memo,
    }: { token: TreasuryToken; amount: bigint; memo?: string }) => {
      if (!actor) throw new Error("Not connected");
      return actor.treasuryDeposit(token, amount, memo ?? null);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["treasuryBalances"] });
      qc.invalidateQueries({ queryKey: ["treasuryLedger"] });
    },
  });
}

export function useTreasuryWithdraw() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      token,
      amount,
      to,
      memo,
    }: {
      token: TreasuryToken;
      amount: bigint;
      to: Principal;
      memo?: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.treasuryWithdraw(token, amount, to, memo ?? null);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["treasuryBalances"] });
      qc.invalidateQueries({ queryKey: ["treasuryLedger"] });
    },
  });
}

export function useTreasuryTransfer() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      token,
      amount,
      from,
      to,
      memo,
    }: {
      token: TreasuryToken;
      amount: bigint;
      from: Principal;
      to: Principal;
      memo?: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.treasuryTransfer(token, amount, from, to, memo ?? null);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["treasuryBalances"] });
      qc.invalidateQueries({ queryKey: ["treasuryLedger"] });
    },
  });
}

// ─── Offers ───────────────────────────────────────────────────────────────────

export function useSubmitOffer() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SubmitOfferInput) => {
      if (!actor) throw new Error("Not connected");
      return actor.submitOffer(input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myOffers"] });
      qc.invalidateQueries({ queryKey: ["offersForNft"] });
    },
  });
}

export function useCounterOffer() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CounterOfferInput) => {
      if (!actor) throw new Error("Not connected");
      return actor.counterOffer(input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myOffers"] });
      qc.invalidateQueries({ queryKey: ["offersReceived"] });
    },
  });
}

export function useAcceptOffer() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (offerId: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.acceptOffer(offerId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myOffers"] });
      qc.invalidateQueries({ queryKey: ["offersReceived"] });
      qc.invalidateQueries({ queryKey: ["resaleListings"] });
      qc.invalidateQueries({ queryKey: ["myResaleListings"] });
    },
  });
}

export function useRejectOffer() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (offerId: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.rejectOffer(offerId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myOffers"] });
      qc.invalidateQueries({ queryKey: ["offersReceived"] });
    },
  });
}

export function useCancelOffer() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (offerId: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.cancelOffer(offerId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myOffers"] });
    },
  });
}

export function useGetMyOffers() {
  const { actor, isFetching } = useBackendActor();
  return useQuery<Offer[]>({
    queryKey: ["myOffers"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMyOffers();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetOffersReceived() {
  const { actor, isFetching } = useBackendActor();
  return useQuery<Offer[]>({
    queryKey: ["offersReceived"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getOffersReceived();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetOffersForNft(nftId: string | undefined) {
  const { actor, isFetching } = useBackendActor();
  return useQuery<Offer[]>({
    queryKey: ["offersForNft", nftId],
    queryFn: async () => {
      if (!actor || !nftId) return [];
      return actor.getOffersForNft(nftId);
    },
    enabled: !!actor && !isFetching && !!nftId,
  });
}

// ─── Admin: Submit to DAB ─────────────────────────────────────────────────────

export function useAdminSubmitToDAB() {
  const { actor } = useBackendActor();
  return useMutation({
    mutationFn: async ({
      collectionName,
      collectionDescription,
      standard,
      canisterIdOverride,
    }: {
      collectionName: string;
      collectionDescription: string;
      standard: string;
      canisterIdOverride?: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.adminSubmitToDAB(
        collectionName,
        collectionDescription,
        standard,
        canisterIdOverride ?? null,
      );
    },
  });
}

// ─── Artwork Upload (direct backend chunk upload) ─────────────────────────────

export function useBeginArtworkUpload() {
  const { actor } = useBackendActor();
  return useMutation({
    mutationFn: async (totalChunks: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.beginArtworkUpload(totalChunks);
    },
  });
}

export function useUploadArtworkChunk() {
  const { actor } = useBackendActor();
  return useMutation({
    mutationFn: async ({
      chunkIndex,
      totalChunks,
      data,
    }: { chunkIndex: bigint; totalChunks: bigint; data: Uint8Array }) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.uploadArtworkChunk(
        chunkIndex,
        totalChunks,
        data,
      );
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
  });
}

export function useFinalizeArtworkUpload() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Not connected");
      return actor.finalizeArtworkUpload();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["artworkFiles"] });
      qc.invalidateQueries({ queryKey: ["artworkLayers"] });
    },
  });
}

export function useListArtworkFiles() {
  const { actor } = useBackendActor();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: ["artworkFiles", actorReady],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listArtworkFiles();
    },
    enabled: !!actor && actorReady,
  });
}

// ─── NFT Pool ─────────────────────────────────────────────────────────────────

export function useGetPoolDashboard() {
  const { actor } = useBackendActor();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: ["poolDashboard", actorReady],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getPoolDashboard();
    },
    enabled: !!actor && actorReady,
    refetchInterval: 15_000,
  });
}

export function useListPoolNFTs(
  statusFilter: import("../backend").PoolNFTStatus | null,
  limit = 100,
) {
  const { actor } = useBackendActor();
  const { actorReady } = useActorReady();
  return useQuery({
    queryKey: ["poolNFTs", JSON.stringify(statusFilter), limit, actorReady],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listPoolNFTs(statusFilter, BigInt(limit));
    },
    enabled: !!actor && actorReady,
  });
}

export function useGenerateAllPoolNFTs() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Not connected");
      return actor.generateAllPoolNFTs();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["poolDashboard"] });
      qc.invalidateQueries({ queryKey: ["poolNFTs"] });
    },
  });
}

export function useAssignPoolNFT() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      nftId,
      action,
    }: { nftId: bigint; action: import("../backend").AssignAction }) => {
      if (!actor) throw new Error("Not connected");
      return actor.assignPoolNFT(nftId, action);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["poolDashboard"] });
      qc.invalidateQueries({ queryKey: ["poolNFTs"] });
    },
  });
}

export function useBatchAssignPoolNFTs() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      nftIds,
      action,
    }: { nftIds: bigint[]; action: import("../backend").AssignAction }) => {
      if (!actor) throw new Error("Not connected");
      return actor.batchAssignPoolNFTs(nftIds, action);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["poolDashboard"] });
      qc.invalidateQueries({ queryKey: ["poolNFTs"] });
    },
  });
}

export function useResetPoolNFT() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (nftId: bigint) => {
      if (!actor) throw new Error("Not connected");
      // resetPoolNFT is on artwork-upload-api.mo (canonical poolNFTs map).
      // Type-cast until bindgen runs post-deploy.
      const a = actor as typeof actor & {
        resetPoolNFT: (
          id: bigint,
        ) => Promise<
          { __kind__: "ok"; ok: string } | { __kind__: "err"; err: string }
        >;
      };
      const result = await a.resetPoolNFT(nftId);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["poolDashboard"] });
      qc.invalidateQueries({ queryKey: ["poolNFTs"] });
    },
  });
}

export function useStorePhotoFile() {
  const { actor } = useBackendActor();
  return useMutation({
    mutationFn: async ({
      pathPrefix,
      data,
      mimeType,
    }: { pathPrefix: string; data: Uint8Array; mimeType: string }) => {
      if (!actor) throw new Error("Not connected");
      const path = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      const result = await actor.storeArtworkFile(path, data, mimeType);
      return result.path;
    },
  });
}

// ─── Zone / Tray Order, Notes & Photos ───────────────────────────────────────

/**
 * Persists the user-defined sort order for a tray/zone.
 * Falls back to a no-op if the backend doesn't expose updateTrayOrder yet —
 * the frontend maintains order via localStorage in that case.
 */
export function useUpdateTrayOrder() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      trayId,
      newOrder,
    }: { trayId: TrayId; newOrder: number }) => {
      if (!actor) throw new Error("Not connected");
      // updateTrayOrder is a new backend method — use optional cast
      const a = actor as typeof actor & {
        updateTrayOrder?: (id: TrayId, order: bigint) => Promise<void>;
      };
      if (typeof a.updateTrayOrder === "function") {
        await a.updateTrayOrder(trayId, BigInt(newOrder));
      }
      // If not available yet, silently succeed — order stored in localStorage
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trays"] }),
  });
}

/**
 * Saves freeform notes on a zone/tray.
 * Falls back to a no-op if the backend doesn't expose updateZoneNotes yet.
 */
export function useUpdateZoneNotes() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      trayId,
      notes,
    }: { trayId: TrayId; notes: string }) => {
      if (!actor) throw new Error("Not connected");
      const a = actor as typeof actor & {
        updateZoneNotes?: (id: TrayId, notes: string) => Promise<void>;
      };
      if (typeof a.updateZoneNotes === "function") {
        await a.updateZoneNotes(trayId, notes);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trays"] }),
  });
}

/**
 * Adds a photo blob key to a zone.
 * Falls back to a no-op if the backend doesn't expose addZonePhoto yet.
 */
export function useAddZonePhoto() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      trayId,
      photoKey,
    }: { trayId: TrayId; photoKey: string }) => {
      if (!actor) throw new Error("Not connected");
      const a = actor as typeof actor & {
        addZonePhoto?: (id: TrayId, key: string) => Promise<void>;
      };
      if (typeof a.addZonePhoto === "function") {
        await a.addZonePhoto(trayId, photoKey);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trays"] }),
  });
}

/**
 * Removes a photo blob key from a zone.
 * Falls back to a no-op if the backend doesn't expose removeZonePhoto yet.
 */
export function useRemoveZonePhoto() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      trayId,
      photoKey,
    }: { trayId: TrayId; photoKey: string }) => {
      if (!actor) throw new Error("Not connected");
      const a = actor as typeof actor & {
        removeZonePhoto?: (id: TrayId, key: string) => Promise<void>;
      };
      if (typeof a.removeZonePhoto === "function") {
        await a.removeZonePhoto(trayId, photoKey);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trays"] }),
  });
}

// ─── ICRC-7 NFT queries (Phase 3.6) ─────────────────────────────────────────
//
// These four hooks call the parallel raw actor in lib/icrc7-actor.ts —
// see that file for the rationale. Each hook is INDEPENDENT (no compound
// useNFT wrapper): the detail page calls all four in parallel via React
// Query, and each section can render its own loading state without
// blocking the others.
//
// All four accept `bigint | null` so the caller can pass `null` for an
// invalid route param without a conditional hook call. The `enabled` gate
// short-circuits the queryFn when tokenId is null, so no network call
// fires for invalid ids.

export function useTokenMetadata(tokenId: bigint | null) {
  const { actor, isFetching } = useIcrc7Actor();
  return useQuery({
    queryKey: ["icrc7TokenMetadata", tokenId?.toString() ?? null],
    queryFn: async () => {
      if (!actor || tokenId == null) return null;
      const raw = await actor.icrc7_token_metadata([tokenId]);
      const [entry] = raw;
      // Candid optional decodes as a 0/1-element tuple.
      return entry.length === 0 ? null : entry[0];
    },
    enabled: !!actor && !isFetching && tokenId != null,
  });
}

export function useTokenOwner(tokenId: bigint | null) {
  const { actor, isFetching } = useIcrc7Actor();
  return useQuery({
    queryKey: ["icrc7Owner", tokenId?.toString() ?? null],
    queryFn: async () => {
      if (!actor || tokenId == null) return null;
      const raw = await actor.icrc7_owner_of([tokenId]);
      const [entry] = raw;
      return entry.length === 0 ? null : entry[0];
    },
    enabled: !!actor && !isFetching && tokenId != null,
  });
}

export function useIsPepperHead(tokenId: bigint | null) {
  const { actor, isFetching } = useIcrc7Actor();
  return useQuery({
    queryKey: ["isPepperHead", tokenId?.toString() ?? null],
    queryFn: async () => {
      if (!actor || tokenId == null) return false;
      return actor.isPepperHead(tokenId);
    },
    enabled: !!actor && !isFetching && tokenId != null,
  });
}

export function useTokenCertified(tokenId: bigint | null) {
  const { actor, isFetching } = useIcrc7Actor();
  return useQuery({
    queryKey: ["icrc7Certified", tokenId?.toString() ?? null],
    queryFn: async () => {
      if (!actor || tokenId == null) return null;
      const r = await actor.icrc7_token_metadata_certified(tokenId);
      // Normalize Candid's 0/1-element-tuple optionals to T | null so
      // consumers can do truthy checks without unwrapping.
      return {
        value: r.value.length === 0 ? null : r.value[0],
        certificate: r.certificate.length === 0 ? null : r.certificate[0],
        witness: r.witness,
      };
    },
    enabled: !!actor && !isFetching && tokenId != null,
  });
}

// ─── Phase 4 Payment hooks ───────────────────────────────────────────────────

export function useConfirmICPayPayment() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orderId,
      paymentId,
    }: { orderId: bigint; paymentId: string }) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.confirmICPayPayment(orderId, paymentId);
      if (!result.success) throw new Error(result.message);
      return result;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });
}

export function usePurchasePepperHead() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      token,
      amount,
    }: { token: PaymentToken; amount: bigint }) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.purchasePepperHead(token, amount);
      if (!result.success) throw new Error(result.message);
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["icrc7Owner"] });
      qc.invalidateQueries({ queryKey: ["isPepperHeadAvailable"] });
    },
  });
}

export function useIsPepperHeadAvailable() {
  const { actor, isFetching } = useIcrc7Actor();
  return useQuery({
    queryKey: ["isPepperHeadAvailable"],
    queryFn: async () => {
      if (!actor) return 0n;
      return actor.isPepperHeadAvailable();
    },
    enabled: !!actor && !isFetching,
    staleTime: 60_000,
  });
}

export function useSetICPaySecretKey() {
  const { actor } = useBackendActor();
  return useMutation({
    mutationFn: async (key: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.setICPaySecretKey(key);
    },
  });
}
