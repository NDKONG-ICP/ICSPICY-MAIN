import type { Backend } from "../backend";

export type OrderPaymentAssets = {
  claimTokens: string[];
  nftTokenIds: bigint[];
};

/** Load NFT + pickup claim data after PayPal (or any flow missing inline tokens). */
export async function fetchOrderPaymentAssets(
  actor: Backend | null,
  orderId: bigint,
): Promise<OrderPaymentAssets> {
  if (!actor) throw new Error("Not connected");
  const [orderOpt, pickupTokens] = await Promise.all([
    actor.getOrder(orderId),
    actor.getOrderPickupClaimTokens(orderId),
  ]);
  const order =
    orderOpt ?? undefined;
  const lineNfts = order?.line_nft_token_ids ?? [];
  const claimTokens =
    pickupTokens.length > 0
      ? pickupTokens
      : lineNfts.length > 0
        ? []
        : [];
  return {
    claimTokens,
    nftTokenIds: lineNfts,
  };
}
