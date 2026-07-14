import {
  PayPalButtons,
  PayPalScriptProvider,
  type ReactPayPalScriptOptions,
} from "@paypal/react-paypal-js";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { usePayPalCheckoutConfig } from "../hooks/useBackend";
import {
  centsToPayPalAmount,
  isPayPalCheckoutEnabled,
  resolvePayPalClientId,
} from "../lib/paypal";

export interface PayPalCheckoutPanelProps {
  usdCents: bigint | number;
  customId: string;
  disabled?: boolean;
  onApproved: (paypalOrderId: string) => Promise<void>;
  onError?: (message: string) => void;
}

export function PayPalCheckoutPanel({
  usdCents,
  customId,
  disabled = false,
  onApproved,
  onError,
}: PayPalCheckoutPanelProps) {
  const [busy, setBusy] = useState(false);
  const { data: config, isLoading, isError } = usePayPalCheckoutConfig();
  const clientId = resolvePayPalClientId(config);
  const enabled = isPayPalCheckoutEnabled(config);

  const options = useMemo<ReactPayPalScriptOptions>(
    () => ({
      clientId,
      currency: "USD",
      intent: "capture",
      components: "buttons",
      enableFunding: "venmo",
      disableFunding: "paylater",
    }),
    [clientId],
  );

  if (isLoading) {
    return (
      <div
        className="flex items-center gap-2 text-sm text-muted-foreground py-2"
        data-ocid="paypal-checkout-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading PayPal…
      </div>
    );
  }

  if (isError) {
    return (
      <p
        className="text-xs text-amber-400/90 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2"
        data-ocid="paypal-checkout-error"
      >
        PayPal is temporarily unavailable. Use crypto payment below or refresh
        the page.
      </p>
    );
  }

  if (!enabled) {
    return (
      <p
        className="text-xs text-muted-foreground"
        data-ocid="paypal-checkout-unavailable"
      >
        PayPal checkout is not available right now. Use crypto payment below.
      </p>
    );
  }

  const amount = centsToPayPalAmount(usdCents);

  return (
    <div className="space-y-2" data-ocid="paypal-checkout-panel">
      <p className="text-sm font-medium text-foreground">
        Pay with PayPal or Venmo
      </p>
      <p className="text-xs text-muted-foreground">
        US buyers · USD only. Venmo appears when eligible on your device.
      </p>
      <PayPalScriptProvider options={options}>
        <div className={disabled || busy ? "pointer-events-none opacity-60" : ""}>
          {busy && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Confirming payment…
            </div>
          )}
          <PayPalButtons
            style={{ layout: "vertical", shape: "rect", label: "paypal" }}
            disabled={disabled || busy}
            createOrder={(_data, actions) =>
              actions.order.create({
                intent: "CAPTURE",
                purchase_units: [
                  {
                    amount: {
                      currency_code: "USD",
                      value: amount,
                    },
                    custom_id: customId,
                  },
                ],
              })
            }
            onApprove={async (data, actions) => {
              const orderId = data.orderID;
              if (!orderId) {
                onError?.("PayPal did not return an order ID");
                return;
              }
              setBusy(true);
              try {
                // Capture to merchant PayPal immediately — do not rely on canister
                // confirm alone (buyer bank can debit before our backend runs).
                if (actions.order) {
                  try {
                    await actions.order.capture();
                  } catch (captureErr) {
                    const msg =
                      captureErr instanceof Error
                        ? captureErr.message
                        : String(captureErr);
                    // Already captured (some funding sources auto-complete).
                    if (
                      !msg.toLowerCase().includes("already") &&
                      !msg.toLowerCase().includes("complet")
                    ) {
                      throw captureErr;
                    }
                  }
                }
                await onApproved(orderId);
              } catch (e) {
                onError?.(
                  e instanceof Error ? e.message : "PayPal settlement failed",
                );
              } finally {
                setBusy(false);
              }
            }}
            onError={(err) => {
              const msg =
                typeof err === "object" &&
                err &&
                "message" in err &&
                typeof err.message === "string"
                  ? err.message
                  : "PayPal checkout error";
              onError?.(msg);
            }}
          />
        </div>
      </PayPalScriptProvider>
    </div>
  );
}
