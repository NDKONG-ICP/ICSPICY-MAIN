/** Public Capsaicin MiniRouter ↔ ICP proof records hosted on the frontend canister. */

export const CAPTAIN_PROOF_BASE = "/captain-posts";

export type CaptainProof = {
  v: number;
  id: string;
  at: string;
  agent: string;
  agentPrincipal: string;
  minirouter: {
    requestId: string | null;
    model: string | null;
    costEstimate?: number | null;
    activityUrl: string;
  };
  icp: {
    canisterId: string;
    imageUrl: string;
    imageKey: string;
    jpegBytes?: number | null;
  };
  posts: {
    crumbeatr: string | null;
    swop: string | null;
    community?: string | null;
  };
  sharePath: string;
  shareUrl: string;
};

export type CaptainProofIndex = {
  v: number;
  updatedAt?: string;
  proofs: Array<{
    id: string;
    at: string;
    imageUrl: string;
    requestId: string | null;
    sharePath: string;
  }>;
};

export function captainProofUrl(id: string): string {
  return `${CAPTAIN_PROOF_BASE}/${encodeURIComponent(id)}.proof.json`;
}

export function captainProofIndexUrl(): string {
  return `${CAPTAIN_PROOF_BASE}/index.json`;
}

export function captainProofSharePath(id: string): string {
  return `/p/captain/${encodeURIComponent(id)}`;
}

export async function fetchCaptainProof(
  id: string,
): Promise<CaptainProof | null> {
  try {
    const res = await fetch(captainProofUrl(id), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as CaptainProof;
  } catch {
    return null;
  }
}

export async function fetchCaptainProofIndex(): Promise<CaptainProofIndex> {
  try {
    const res = await fetch(captainProofIndexUrl(), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return { v: 1, proofs: [] };
    const data = (await res.json()) as CaptainProofIndex;
    return {
      v: data.v ?? 1,
      updatedAt: data.updatedAt,
      proofs: Array.isArray(data.proofs) ? data.proofs : [],
    };
  } catch {
    return { v: 1, proofs: [] };
  }
}
