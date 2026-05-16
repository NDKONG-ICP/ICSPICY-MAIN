import type {
  TransactionResponse,
  WalletConnectionResult,
} from "@ic-pay/icpay-sdk/dist/types";
import { useCallback, useEffect, useState } from "react";
import { getIcpay } from "../lib/icpay";

export type PaymentStatus =
  | "idle"
  | "connecting"
  | "paying"
  | "confirming"
  | "success"
  | "error";

interface UseICPayOptions {
  onSuccess?: (paymentId: string) => void;
  onError?: (error: string) => void;
}

export function useICPay(options?: UseICPayOptions) {
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  const icpay = getIcpay();

  // Listen for SDK transaction events (event-driven, no polling).
  useEffect(() => {
    const handleComplete = (detail: TransactionResponse) => {
      const id = detail?.transactionId?.toString() ?? null;
      if (id) {
        setPaymentId(id);
        setStatus("confirming");
        options?.onSuccess?.(id);
      }
    };

    const handleFailed = (detail: { message?: string; error?: string }) => {
      const msg = detail?.message ?? detail?.error ?? "Payment failed";
      setError(msg);
      setStatus("error");
      options?.onError?.(msg);
    };

    const unsubComplete = icpay.on(
      "icpay-sdk-transaction-completed",
      handleComplete,
    );
    const unsubFailed = icpay.on("icpay-sdk-transaction-failed", handleFailed);

    return () => {
      unsubComplete();
      unsubFailed();
    };
  }, [icpay, options]);

  const connectWallet = useCallback(
    async (
      provider: "plug" | "oisy" | "internet-identity",
    ): Promise<WalletConnectionResult | null> => {
      try {
        setStatus("connecting");
        setError(null);
        const result = await icpay.connectWallet(provider);
        setStatus("idle");
        return result;
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Wallet connection failed";
        setError(msg);
        setStatus("error");
        return null;
      }
    },
    [icpay],
  );

  const payUsd = useCallback(
    async (
      amountUsd: number,
      metadata?: Record<string, unknown>,
    ): Promise<TransactionResponse | null> => {
      try {
        setStatus("paying");
        setError(null);
        return await icpay.createPaymentUsd({ usdAmount: amountUsd, metadata });
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Payment creation failed";
        setError(msg);
        setStatus("error");
        return null;
      }
    },
    [icpay],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setPaymentId(null);
  }, []);

  return { status, error, paymentId, connectWallet, payUsd, reset };
}
