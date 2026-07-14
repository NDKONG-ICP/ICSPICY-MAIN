/** PayPal Checkout helpers — client ID is public; secret stays on canister. */

import { Actor, HttpAgent } from "@dfinity/agent";
import { BACKEND_CANISTER_ID, IC_HOST } from "./auth-config";

export type PayPalCheckoutConfig = {
  enabled: boolean;
  clientId: string;
  sandbox: boolean;
};

export function getPayPalClientId(): string {
  return import.meta.env.VITE_PAYPAL_CLIENT_ID ?? "";
}

export function isPayPalConfigured(): boolean {
  return getPayPalClientId().length > 0;
}

export function resolvePayPalClientId(
  config: PayPalCheckoutConfig | undefined,
): string {
  if (config?.enabled && config.clientId) return config.clientId;
  return getPayPalClientId();
}

export function isPayPalCheckoutEnabled(
  config: PayPalCheckoutConfig | undefined,
): boolean {
  if (config?.enabled && config.clientId.length > 0) return true;
  return getPayPalClientId().length > 0;
}

/** Anonymous query — does not depend on the generated Backend wrapper. */
export async function fetchPayPalCheckoutConfig(): Promise<PayPalCheckoutConfig> {
  const agent = await HttpAgent.create({ host: IC_HOST });
  if (import.meta.env.DEV) {
    await agent.fetchRootKey();
  }
  const actor = Actor.createActor(
    ({ IDL }) =>
      IDL.Service({
        getPayPalCheckoutConfig: IDL.Func(
          [],
          [
            IDL.Record({
              enabled: IDL.Bool,
              clientId: IDL.Text,
              sandbox: IDL.Bool,
            }),
          ],
          ["query"],
        ),
      }),
    { agent, canisterId: BACKEND_CANISTER_ID },
  ) as {
    getPayPalCheckoutConfig: () => Promise<PayPalCheckoutConfig>;
  };
  return actor.getPayPalCheckoutConfig();
}

export function centsToPayPalAmount(cents: bigint | number): string {
  const n = typeof cents === "bigint" ? Number(cents) : cents;
  return (n / 100).toFixed(2);
}

export const paypalCustomIds = {
  order: (orderId: bigint) => `icspicy:order:${orderId.toString()}`,
  plant: (plantId: bigint) => `icspicy:plant:${plantId.toString()}`,
  coop: (tokenId: bigint) => `icspicy:coop:${tokenId.toString()}`,
  pepperhead: "icspicy:pepperhead",
} as const;
