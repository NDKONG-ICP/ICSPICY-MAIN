// lib/icpay.ts
//
// ICPay SDK singleton initializer.
// Initialized once on first call to getIcpay(); reused across all hooks.
// Never import this in Node/test environments that lack import.meta.env.

import { Icpay } from "@ic-pay/icpay-sdk";

let icpayInstance: Icpay | null = null;

export function getIcpay(): Icpay {
  if (!icpayInstance) {
    const publishableKey = import.meta.env.VITE_ICPAY_PUBLISHABLE_KEY;
    if (!publishableKey) {
      throw new Error("VITE_ICPAY_PUBLISHABLE_KEY not set in environment");
    }

    const apiUrl =
      import.meta.env.VITE_ICPAY_API_BASE ?? "https://api.icpay.org";
    const environment = import.meta.env.DEV ? "development" : "production";

    icpayInstance = new Icpay({ publishableKey, apiUrl, environment });
  }
  return icpayInstance;
}

/** Reset the singleton — useful for tests and hot-reload cleanup. */
export function resetIcpay(): void {
  icpayInstance = null;
}
