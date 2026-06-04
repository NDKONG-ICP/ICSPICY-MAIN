import type { ActorSubclass } from "@dfinity/agent";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Backend } from "../backend";
import { createActor } from "../backend";
import type {
  CreatePlantingEventInput,
  PlantingEvent,
  PlantingEventType,
  UpdatePlantingEventInput,
  ZoneCalendar,
  ZoneRecommendation,
  ZoneSchedule,
  _SERVICE,
} from "../declarations/backend.did";
import {
  type GerminationScheduleInput,
  createGerminationScheduleEvents,
} from "../lib/planting-schedule-utils";
import { useActor } from "./useActor";
import { useActorReady } from "./useActorReady";
import { useAuth } from "./useAuth";

function rawService(actor: Backend | null): ActorSubclass<_SERVICE> | null {
  if (!actor) return null;
  return actor as unknown as ActorSubclass<_SERVICE>;
}

function useScheduleActor() {
  return useActor<Backend>(createActor);
}

export function useZoneSchedule(zone: string, month: number) {
  const { actor } = useScheduleActor();
  const svc = rawService(actor);
  return useQuery({
    queryKey: ["zoneSchedule", zone, month],
    queryFn: async (): Promise<Array<ZoneRecommendation>> => {
      if (!svc) return [];
      const result: ZoneSchedule = await svc.getZoneSchedule(
        zone,
        BigInt(month),
      );
      return result.recommendations;
    },
    enabled: !!svc && month >= 1 && month <= 12,
  });
}

export function useZoneCalendar(zone: string) {
  const { actor } = useScheduleActor();
  const svc = rawService(actor);
  return useQuery({
    queryKey: ["zoneCalendar", zone],
    queryFn: async (): Promise<ZoneCalendar> => {
      if (!svc) throw new Error("Not connected");
      return svc.getZoneCalendar(zone);
    },
    enabled: !!svc && zone.length > 0,
  });
}

export function useMyPlantingSchedule(start: bigint, end: bigint) {
  const { actor } = useScheduleActor();
  const { actorReady } = useActorReady();
  const { isAuthenticated } = useAuth();
  const svc = rawService(actor);
  return useQuery({
    queryKey: ["plantingSchedule", start.toString(), end.toString()],
    queryFn: async (): Promise<Array<PlantingEvent>> => {
      if (!svc) return [];
      return svc.getMySchedule(start, end);
    },
    enabled: !!svc && actorReady && isAuthenticated,
  });
}

export function useUpcomingPlantingEvents() {
  const { actor } = useScheduleActor();
  const { actorReady } = useActorReady();
  const { isAuthenticated } = useAuth();
  const svc = rawService(actor);
  return useQuery({
    queryKey: ["plantingUpcoming"],
    queryFn: async (): Promise<Array<PlantingEvent>> => {
      if (!svc) return [];
      return svc.getUpcomingEvents();
    },
    enabled: !!svc && actorReady && isAuthenticated,
  });
}

export function useOverduePlantingEvents() {
  const { actor } = useScheduleActor();
  const { actorReady } = useActorReady();
  const { isAuthenticated } = useAuth();
  const svc = rawService(actor);
  return useQuery({
    queryKey: ["plantingOverdue"],
    queryFn: async (): Promise<Array<PlantingEvent>> => {
      if (!svc) return [];
      return svc.getOverdueEvents();
    },
    enabled: !!svc && actorReady && isAuthenticated,
  });
}

export function useCreatePlantingEvent() {
  const { actor } = useScheduleActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePlantingEventInput) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      return svc.createPlantingEvent(input);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["plantingSchedule"] });
      void qc.invalidateQueries({ queryKey: ["plantingUpcoming"] });
      void qc.invalidateQueries({ queryKey: ["plantingOverdue"] });
    },
  });
}

export function useCompletePlantingEvent() {
  const { actor } = useScheduleActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      return svc.completeEvent(id);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["plantingSchedule"] });
      void qc.invalidateQueries({ queryKey: ["plantingUpcoming"] });
      void qc.invalidateQueries({ queryKey: ["plantingOverdue"] });
    },
  });
}

export function useDeletePlantingEvent() {
  const { actor } = useScheduleActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      return svc.deletePlantingEvent(id);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["plantingSchedule"] });
      void qc.invalidateQueries({ queryKey: ["plantingUpcoming"] });
      void qc.invalidateQueries({ queryKey: ["plantingOverdue"] });
    },
  });
}

export function useCreateGerminationSchedule() {
  const { actor } = useScheduleActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: GerminationScheduleInput) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      await createGerminationScheduleEvents(svc, input);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["plantingSchedule"] });
      void qc.invalidateQueries({ queryKey: ["plantingUpcoming"] });
      void qc.invalidateQueries({ queryKey: ["plantingOverdue"] });
    },
  });
}

export function useUpdatePlantingEvent() {
  const { actor } = useScheduleActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdatePlantingEventInput) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      return svc.updatePlantingEvent(input);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["plantingSchedule"] });
      void qc.invalidateQueries({ queryKey: ["plantingUpcoming"] });
      void qc.invalidateQueries({ queryKey: ["plantingOverdue"] });
    },
  });
}

export function eventTypeLabel(t: PlantingEventType): string {
  if ("startIndoors" in t) return "Start Indoors";
  if ("directSow" in t) return "Direct Sow";
  if ("transplantOutdoors" in t) return "Transplant";
  if ("harvest" in t) return "Harvest";
  return "Event";
}

const EVENT_EMOJI: Record<string, string> = {
  startIndoors: "🟢",
  directSow: "🌱",
  transplantOutdoors: "🪴",
  harvest: "🌶️",
};

export function eventTypeToCandid(key: string): PlantingEventType {
  switch (key) {
    case "startIndoors":
      return { startIndoors: null };
    case "directSow":
      return { directSow: null };
    case "transplantOutdoors":
      return { transplantOutdoors: null };
    case "harvest":
      return { harvest: null };
    default:
      return { directSow: null };
  }
}

export function emojiForEventType(key: string): string {
  return EVENT_EMOJI[key] ?? "📋";
}
