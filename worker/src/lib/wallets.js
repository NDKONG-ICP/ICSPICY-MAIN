// Captain Capsaicin multi-wallet book.
//
// Capsaicin holds more than one ICP principal. Treat them as distinct treasuries:
// never assume the Crumbeatr/SWOP operating key is the BonsaiOS identity.
//
// Roles (per Bonsai friend / Canopy wallet guidance, 2026-09):
//   - captain_operating — BIP39 path m/44'/223'/0'/0/1 (existing Capsaicin key)
//   - canopy_bonsai     — plain principal from Canopy wallet login; used across
//                         the whole BonsaiOS ecosystem (registry CRM, Orbit mint,
//                         Bazaar trade). Fund THIS principal for Bonsai work if
//                         it differs from captain_operating.
//   - worker_hub        — BIP39 default (index 0); hub job runner only, not social.
//   - sweep_destination — admin treasury that receives excess operating float.

import { Principal } from "@dfinity/principal";

/** @typedef {'worker_hub' | 'captain_operating' | 'canopy_bonsai' | 'sweep_destination'} WalletRole */

/**
 * @typedef {object} WalletEntry
 * @property {WalletRole} role
 * @property {string} label
 * @property {string | null} principal  // null = not configured yet
 * @property {string} ecosystem
 * @property {string[]} uses
 * @property {string} notes
 * @property {'ready' | 'pending_login' | 'unset'} status
 */

/**
 * Resolve Capsaicin's wallet book from identities + secrets/env.
 * Canopy principal sources (first wins): hub secret `canopy_wallet_principal`,
 * then `CANOPY_WALLET_PRINCIPAL` env.
 *
 * @param {{
 *   workerPrincipal?: string,
 *   captainPrincipal: string,
 *   secrets?: Record<string, string | undefined>,
 * }} args
 * @returns {WalletEntry[]}
 */
export function buildWalletBook({ workerPrincipal, captainPrincipal, secrets = {} }) {
  const canopyRaw =
    secrets.canopy_wallet_principal?.trim() ||
    process.env.CANOPY_WALLET_PRINCIPAL?.trim() ||
    "";
  let canopyPrincipal = null;
  let canopyStatus = /** @type {WalletEntry['status']} */ ("pending_login");
  if (canopyRaw) {
    try {
      canopyPrincipal = Principal.fromText(canopyRaw).toText();
      canopyStatus = "ready";
    } catch {
      canopyPrincipal = null;
      canopyStatus = "pending_login";
    }
  }

  const sweepRaw = secrets.ambassador_sweep_principal?.trim() || "";
  let sweepPrincipal = null;
  let sweepStatus = /** @type {WalletEntry['status']} */ ("unset");
  if (sweepRaw) {
    try {
      sweepPrincipal = Principal.fromText(sweepRaw).toText();
      sweepStatus = "ready";
    } catch {
      sweepPrincipal = null;
      sweepStatus = "unset";
    }
  }

  /** @type {WalletEntry[]} */
  const book = [
    {
      role: "worker_hub",
      label: "Worker (hub jobs)",
      principal: workerPrincipal ?? null,
      ecosystem: "IC SPICY agent hub",
      uses: ["claim/report jobs", "load hub secrets"],
      notes: "BIP39 default derivation — not for social or Bonsai mint.",
      status: workerPrincipal ? "ready" : "unset",
    },
    {
      role: "captain_operating",
      label: "Captain Capsaicin (operating)",
      principal: captainPrincipal,
      ecosystem: "Crumbeatr + SWOP (+ ICP float)",
      uses: ["Crumbeatr", "SWOP", "ambassador sweep source"],
      notes:
        "BIP39 m/44'/223'/0'/0/1. Do NOT assume this is the Bonsai/Canopy identity.",
      status: "ready",
    },
    {
      role: "canopy_bonsai",
      label: "Canopy wallet (BonsaiOS)",
      principal: canopyPrincipal,
      ecosystem: "Entire BonsaiOS (registry CRM, Orbit Spots mint, Bazaar trade)",
      uses: ["registry CRM", "Orbit mint", "Bazaar list/buy/sell", "Canopy treasury"],
      notes:
        canopyStatus === "ready"
          ? canopyPrincipal === captainPrincipal
            ? "Same principal as operating wallet — no extra fund transfer needed."
            : "DIFFERENT from operating wallet — send ICP (pees) here before Bonsai mint/CRM."
          : "Generate via Canopy login on Bazaar/BonsaiOS, then set hub secret canopy_wallet_principal (or CANOPY_WALLET_PRINCIPAL). Friend: plain Canopy principal coincides with the rest of Bonsai.",
      status: canopyStatus,
    },
    {
      role: "sweep_destination",
      label: "Admin sweep destination",
      principal: sweepPrincipal,
      ecosystem: "IC SPICY treasury",
      uses: ["receive excess Capsaicin operating float"],
      notes: "Hub secret ambassador_sweep_principal.",
      status: sweepStatus,
    },
  ];

  return book;
}

/** Principal Capsaicin must use for all BonsaiOS calls, or null if Canopy not set yet. */
export function bonsaiPrincipal(book) {
  const canopy = book.find((w) => w.role === "canopy_bonsai");
  if (canopy?.status === "ready" && canopy.principal) return canopy.principal;
  return null;
}

/** True when Canopy is set and differs from the operating Capsaicin key. */
export function canopyNeedsFunding(book) {
  const op = book.find((w) => w.role === "captain_operating")?.principal;
  const canopy = book.find((w) => w.role === "canopy_bonsai");
  return Boolean(
    canopy?.status === "ready" &&
      canopy.principal &&
      op &&
      canopy.principal !== op,
  );
}

/** One-line log block for worker startup / show-wallets. */
export function formatWalletBook(book) {
  const lines = ["[wallets] Capsaicin multi-wallet book:"];
  for (const w of book) {
    const p = w.principal ?? "(not set)";
    lines.push(
      `  - ${w.role} [${w.status}] ${p}`,
      `      ${w.label} · ${w.ecosystem}`,
      `      uses: ${w.uses.join(", ")}`,
      `      ${w.notes}`,
    );
  }
  return lines.join("\n");
}
