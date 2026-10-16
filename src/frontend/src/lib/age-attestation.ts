/** COPPA-style age attestation (self-cert 13+). Not legal advice. */

export type AgeAttestationStatus = "allowed" | "blocked";

export type AgeAttestationRecord = {
  status: AgeAttestationStatus;
  attestedAt: string;
  method: "self_cert_13_plus";
};

const LS_KEY = "icspicy_age_attestation_v1";
export const AGE_GATE_EVENT = "icspicy:age-gate-request";

export type AgeGateRequestDetail = {
  /** Called after user confirms 13+ */
  onAllowed: () => void;
};

export function readAgeAttestation(): AgeAttestationRecord | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AgeAttestationRecord;
  } catch {
    return null;
  }
}

export function isAgeAllowed(): boolean {
  return readAgeAttestation()?.status === "allowed";
}

export function isAgeBlocked(): boolean {
  return readAgeAttestation()?.status === "blocked";
}

export function saveAgeAllowed() {
  const rec: AgeAttestationRecord = {
    status: "allowed",
    attestedAt: new Date().toISOString(),
    method: "self_cert_13_plus",
  };
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(rec));
  } catch {
    /* ignore */
  }
}

export function saveAgeBlocked() {
  const rec: AgeAttestationRecord = {
    status: "blocked",
    attestedAt: new Date().toISOString(),
    method: "self_cert_13_plus",
  };
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(rec));
  } catch {
    /* ignore */
  }
}

/** If already allowed, runs immediately. Otherwise opens AgeGateHost modal. */
export function runWithAgeGate(onAllowed: () => void) {
  if (typeof window === "undefined") return;
  if (isAgeBlocked()) return;
  if (isAgeAllowed()) {
    onAllowed();
    return;
  }
  window.dispatchEvent(
    new CustomEvent(AGE_GATE_EVENT, {
      detail: { onAllowed } satisfies AgeGateRequestDetail,
    }),
  );
}
