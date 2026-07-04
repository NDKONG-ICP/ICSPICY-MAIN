/**
 * Minimal Candid actor for the variety-guide backend methods.
 *
 * Kept separate from the giant generated declarations so the guide feature
 * works without regenerating bindings (mirrors the spicyai-idl pattern).
 */
import { Actor, HttpAgent } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";
import type { IDL } from "@dfinity/candid";
import { BACKEND_CANISTER_ID } from "./auth-config";

export type GuideSection = {
  id: string;
  title: string;
  icon: string;
  content: string;
  timing: [] | [string];
};

export type VarietyGuide = {
  varietyId: bigint;
  zone: string;
  generatedAt: bigint;
  sections: GuideSection[];
  recipeRefs: bigint[];
  version: bigint;
};

interface VarietyGuideActor {
  getVarietyGuide(varietyId: bigint, zone: string): Promise<[] | [VarietyGuide]>;
  saveVarietyGuide(
    varietyId: bigint,
    zone: string,
    sections: GuideSection[],
    recipeRefs: bigint[],
  ): Promise<boolean>;
  adminDeleteVarietyGuide(varietyId: bigint, zone: string): Promise<boolean>;
}

const guideIdlFactory: IDL.InterfaceFactory = ({ IDL }) => {
  const GuideSectionIdl = IDL.Record({
    id: IDL.Text,
    title: IDL.Text,
    icon: IDL.Text,
    content: IDL.Text,
    timing: IDL.Opt(IDL.Text),
  });
  const VarietyGuideIdl = IDL.Record({
    varietyId: IDL.Nat,
    zone: IDL.Text,
    generatedAt: IDL.Int,
    sections: IDL.Vec(GuideSectionIdl),
    recipeRefs: IDL.Vec(IDL.Nat),
    version: IDL.Nat,
  });
  return IDL.Service({
    getVarietyGuide: IDL.Func(
      [IDL.Nat, IDL.Text],
      [IDL.Opt(VarietyGuideIdl)],
      ["query"],
    ),
    saveVarietyGuide: IDL.Func(
      [IDL.Nat, IDL.Text, IDL.Vec(GuideSectionIdl), IDL.Vec(IDL.Nat)],
      [IDL.Bool],
      [],
    ),
    adminDeleteVarietyGuide: IDL.Func([IDL.Nat, IDL.Text], [IDL.Bool], []),
  });
};

function resolveHost(): string {
  if (typeof window === "undefined") return "https://icp-api.io";
  const { protocol, hostname, port } = window.location;
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost")
  ) {
    return `${protocol}//127.0.0.1:${port || "4943"}`;
  }
  return "https://icp-api.io";
}

let queryActor: VarietyGuideActor | null = null;

/** Anonymous actor — sufficient for the public getVarietyGuide query. */
function getGuideQueryActor(): VarietyGuideActor {
  if (!queryActor) {
    const agent = HttpAgent.createSync({ host: resolveHost() });
    queryActor = Actor.createActor<VarietyGuideActor>(guideIdlFactory, {
      agent,
      canisterId: BACKEND_CANISTER_ID,
    });
  }
  return queryActor;
}

let authClientPromise: Promise<AuthClient> | null = null;

async function getAuthClient(): Promise<AuthClient> {
  if (!authClientPromise) authClientPromise = AuthClient.create();
  return authClientPromise;
}

let authActor: VarietyGuideActor | null = null;

/** Authenticated actor for saveVarietyGuide (backend blocks anonymous updates). */
async function getGuideAuthActor(): Promise<VarietyGuideActor | null> {
  if (authActor) return authActor;
  const client = await getAuthClient();
  if (!(await client.isAuthenticated())) return null;
  const agent = HttpAgent.createSync({
    identity: client.getIdentity(),
    host: resolveHost(),
  });
  authActor = Actor.createActor<VarietyGuideActor>(guideIdlFactory, {
    agent,
    canisterId: BACKEND_CANISTER_ID,
  });
  return authActor;
}

export async function fetchVarietyGuide(
  varietyId: bigint,
  zoneKey: string,
): Promise<VarietyGuide | null> {
  const res = await getGuideQueryActor().getVarietyGuide(varietyId, zoneKey);
  return res.length > 0 ? (res[0] ?? null) : null;
}

/** Returns false when unauthenticated or when the backend rejects the write. */
export async function persistVarietyGuide(
  varietyId: bigint,
  zoneKey: string,
  sections: GuideSection[],
  recipeRefs: bigint[],
): Promise<boolean> {
  const actor = await getGuideAuthActor();
  if (!actor) return false;
  try {
    return await actor.saveVarietyGuide(varietyId, zoneKey, sections, recipeRefs);
  } catch (e) {
    console.warn("saveVarietyGuide failed", e);
    return false;
  }
}
