/**
 * Minimal Candid actor for the recipe-video backend methods.
 *
 * Kept separate from the giant generated declarations so the feature works
 * without regenerating bindings (mirrors the variety-guide-idl pattern).
 */
import { Actor, HttpAgent } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";
import type { IDL } from "@dfinity/candid";
import { BACKEND_CANISTER_ID } from "./auth-config";

interface RecipeVideoActor {
  getRecipeVideoUrl(id: bigint): Promise<[] | [string]>;
  listRecipeVideoUrls(): Promise<Array<[bigint, string]>>;
  setRecipeVideoUrl(id: bigint, videoUrl: [] | [string]): Promise<boolean>;
}

const recipeVideoIdlFactory: IDL.InterfaceFactory = ({ IDL }) =>
  IDL.Service({
    getRecipeVideoUrl: IDL.Func([IDL.Nat], [IDL.Opt(IDL.Text)], ["query"]),
    listRecipeVideoUrls: IDL.Func(
      [],
      [IDL.Vec(IDL.Tuple(IDL.Nat, IDL.Text))],
      ["query"],
    ),
    setRecipeVideoUrl: IDL.Func([IDL.Nat, IDL.Opt(IDL.Text)], [IDL.Bool], []),
  });

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

let queryActor: RecipeVideoActor | null = null;

function getQueryActor(): RecipeVideoActor {
  if (!queryActor) {
    const agent = HttpAgent.createSync({ host: resolveHost() });
    queryActor = Actor.createActor<RecipeVideoActor>(recipeVideoIdlFactory, {
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

let authActor: RecipeVideoActor | null = null;

async function getAuthActor(): Promise<RecipeVideoActor | null> {
  if (authActor) return authActor;
  const client = await getAuthClient();
  if (!(await client.isAuthenticated())) return null;
  const agent = HttpAgent.createSync({
    identity: client.getIdentity(),
    host: resolveHost(),
  });
  authActor = Actor.createActor<RecipeVideoActor>(recipeVideoIdlFactory, {
    agent,
    canisterId: BACKEND_CANISTER_ID,
  });
  return authActor;
}

/** Public: YouTube URL for a recipe, or null. */
export async function fetchRecipeVideoUrl(
  recipeId: bigint,
): Promise<string | null> {
  const res = await getQueryActor().getRecipeVideoUrl(recipeId);
  return res.length > 0 ? (res[0] ?? null) : null;
}

/** Public: all recipe→video mappings (admin CMS list badges). */
export async function fetchAllRecipeVideoUrls(): Promise<Map<string, string>> {
  const rows = await getQueryActor().listRecipeVideoUrls();
  return new Map(rows.map(([id, url]) => [id.toString(), url]));
}

/** Admin: set (or clear with null) a recipe's YouTube URL. */
export async function saveRecipeVideoUrl(
  recipeId: bigint,
  videoUrl: string | null,
): Promise<boolean> {
  const actor = await getAuthActor();
  if (!actor) throw new Error("Sign in required");
  return actor.setRecipeVideoUrl(recipeId, videoUrl ? [videoUrl] : []);
}
