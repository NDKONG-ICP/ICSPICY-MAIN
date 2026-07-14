/** Persist PayPal approval when canister confirm fails after capture. */

export type PendingPayPalSettlement = {
  orderId: string;
  paypalOrderId: string;
  totalCents: string;
  storedAt: number;
};

const STORAGE_KEY = "icspicy-pending-paypal-settlement";

export function storePendingPayPalSettlement(
  record: Omit<PendingPayPalSettlement, "storedAt">,
) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...record, storedAt: Date.now() }),
  );
}

export function getPendingPayPalSettlement(): PendingPayPalSettlement | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingPayPalSettlement;
  } catch {
    return null;
  }
}

export function clearPendingPayPalSettlement() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}
