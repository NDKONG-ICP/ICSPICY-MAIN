type Props = {
  /** Display amount, e.g. "$25.00" or "the total shown" */
  amountLabel: string;
  className?: string;
};

/** California ARL-style clarity: one-time charge, no auto-renew. */
export function PurchaseDisclosure({ amountLabel, className }: Props) {
  return (
    <p
      className={className ?? "text-xs text-muted-foreground leading-relaxed"}
      data-ocid="purchase-disclosure"
    >
      One-time purchase of {amountLabel}. This is not a subscription and will not
      renew automatically.
    </p>
  );
}
