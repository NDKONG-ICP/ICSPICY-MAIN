import { Actor, HttpAgent, type Identity } from "@dfinity/agent";
import type {
  ContainerSize,
  DeathCause,
  PlantId,
  WeatherSnapshot,
} from "../declarations/backend.did";
import { type _SERVICE, idlFactory } from "../declarations/backend.did.js";
import { BACKEND_CANISTER_ID } from "./auth-config";

const IC_HOST = import.meta.env.DEV
  ? "http://127.0.0.1:4943"
  : "https://icp-api.io";

export async function createBackendActor(
  identity: Identity,
): Promise<_SERVICE> {
  const agent = await HttpAgent.create({ host: IC_HOST, identity });
  if (import.meta.env.DEV) {
    await agent.fetchRootKey();
  }
  return Actor.createActor(idlFactory, {
    agent,
    canisterId: BACKEND_CANISTER_ID,
  });
}

export async function callRemovePlant(
  identity: Identity,
  plantId: PlantId,
): Promise<boolean> {
  const actor = await createBackendActor(identity);
  return actor.removePlant(plantId);
}

export async function callAddWeatherSnapshot(
  identity: Identity,
  plantId: PlantId,
  snapshot: WeatherSnapshot,
): Promise<boolean> {
  const actor = await createBackendActor(identity);
  return actor.addWeatherSnapshot(plantId, snapshot);
}

export async function callRevivePlant(
  identity: Identity,
  plantId: PlantId,
): Promise<boolean> {
  const actor = await createBackendActor(identity);
  return actor.revivePlant(plantId);
}

export async function callMarkPlantDead(
  identity: Identity,
  plantId: PlantId,
  cause: DeathCause,
  notes: string | null,
  photoUrl: string | null,
): Promise<boolean> {
  const actor = await createBackendActor(identity);
  return actor.markPlantDead(
    plantId,
    cause,
    notes != null && notes !== "" ? [notes] : [],
    photoUrl != null && photoUrl !== "" ? [photoUrl] : [],
  );
}

export async function callTransplantPlant(
  identity: Identity,
  plantId: PlantId,
  newContainer: ContainerSize,
  locationNotes: string | null,
): Promise<boolean> {
  const actor = await createBackendActor(identity);
  return actor.transplantPlant(
    plantId,
    newContainer,
    locationNotes != null && locationNotes !== "" ? [locationNotes] : [],
  );
}
