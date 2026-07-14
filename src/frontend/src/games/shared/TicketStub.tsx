import type { ReactNode } from "react";
import "./arcade-theme.css";
import "./ticket-stub.css";

export function TicketStub({
  children,
  className = "",
  variant = "default",
  "data-ocid": dataOcid,
}: {
  children: ReactNode;
  className?: string;
  /** chip = compact stat; popup = score toast; default = general CSS ticket */
  variant?: "default" | "chip" | "compact" | "popup";
  "data-ocid"?: string;
}) {
  const resolved =
    variant === "compact" ? "chip" : variant;

  return (
    <div
      className={[
        "arcade-ticket-stub",
        `arcade-ticket-stub--${resolved}`,
        className,
      ].join(" ")}
      data-ocid={dataOcid}
    >
      <span className="arcade-ticket-stub__corner arcade-ticket-stub__corner--tl" aria-hidden />
      <span className="arcade-ticket-stub__corner arcade-ticket-stub__corner--tr" aria-hidden />
      <span className="arcade-ticket-stub__corner arcade-ticket-stub__corner--bl" aria-hidden />
      <span className="arcade-ticket-stub__corner arcade-ticket-stub__corner--br" aria-hidden />
      <div className="arcade-ticket-stub__body arcade-painted-text">{children}</div>
    </div>
  );
}
