import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import {
  emojiForEventType,
  eventTypeLabel,
  eventTypeToCandid,
  useCompletePlantingEvent,
  useCreatePlantingEvent,
  useDeletePlantingEvent,
  useMyPlantingSchedule,
  useOverduePlantingEvents,
  useUpcomingPlantingEvents,
} from "@/hooks/usePlantingSchedule";
import { useMyPlantsNims } from "@/hooks/usePlantLifecycle";
import { useNimsLocation } from "@/hooks/useNimsLocation";
import { useWeather } from "@/hooks/useWeather";
import {
  getPlantingRecommendations,
  normalizeZone,
  plantingActionToEventTypeKey,
  SUPPORTED_ZONES,
  ZONE_LABELS,
  type PlantingRecommendation,
  type SupportedZone,
} from "@/lib/planting-almanac";
import { getWeatherSuggestions } from "@/lib/weather-suggestions";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const EVENT_TYPES = [
  { key: "startIndoors", label: "Start Indoors", emoji: "🟢" },
  { key: "directSow", label: "Direct Sow", emoji: "🌱" },
  { key: "transplantOutdoors", label: "Transplant", emoji: "🪴" },
  { key: "harvest", label: "Harvest", emoji: "🌶️" },
] as const;

function monthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return {
    startNs: BigInt(start.getTime()) * 1_000_000n,
    endNs: BigInt(end.getTime()) * 1_000_000n,
  };
}

function nsToDate(ns: bigint) {
  return new Date(Number(ns / 1_000_000n));
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Planting calendar panel — Phase 9 schedule builder. */
export function PlantingCalendarPanel() {
  const { isAuthenticated, login } = useAuth();
  const { coordinates } = useNimsLocation();
  const [zone, setZone] = useState<SupportedZone>("10a");
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [addOpen, setAddOpen] = useState(false);
  const [plantName, setPlantName] = useState("");
  const [eventTypeKey, setEventTypeKey] = useState<string>("directSow");
  const [eventDate, setEventDate] = useState(
    now.toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState("");

  const { startNs, endNs } = monthRange(viewYear, viewMonth);
  const schedule = useMyPlantingSchedule(startNs, endNs);
  const upcoming = useUpcomingPlantingEvents();
  const overdue = useOverduePlantingEvents();
  const zoneRecs = useMemo(
    () => getPlantingRecommendations(viewMonth, zone),
    [viewMonth, zone],
  );
  const { data: weather } = useWeather(coordinates.lat, coordinates.lng);
  const { data: myPlants } = useMyPlantsNims();
  const createEvent = useCreatePlantingEvent();
  const completeEvent = useCompletePlantingEvent();
  const deleteEvent = useDeletePlantingEvent();

  const calendarDays = useMemo(() => {
    const first = new Date(viewYear, viewMonth - 1, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(viewYear, viewMonth - 1, d));
    }
    return cells;
  }, [viewMonth, viewYear]);

  const weatherSuggestions = useMemo(() => {
    if (!weather) return [];
    const plantHints =
      myPlants?.map((lc) => {
        const p = lc.plant;
        const lastWater = lc.wateringLog.at(-1)?.timestamp;
        const lastWateredDays =
          lastWater != null
            ? Math.floor(
                (Date.now() - Number(lastWater / 1_000_000n)) / 86_400_000,
              )
            : undefined;
        return {
          variety: p.variety || p.common_name?.[0] || "Plant",
          daysSincePlanted: Math.floor(
            (Date.now() - Number(p.planting_date / 1_000_000n)) / 86_400_000,
          ),
          daysToGermination: 14,
          lastWateredDays,
        };
      }) ?? [];
    return getWeatherSuggestions(weather, plantHints);
  }, [weather, myPlants]);

  const prefillFromRecommendation = (rec: PlantingRecommendation) => {
    setPlantName(rec.name);
    setNotes(rec.notes);
    setEventTypeKey(plantingActionToEventTypeKey(rec.action));
    setAddOpen(true);
  };

  const recommendationEventLabel = (rec: PlantingRecommendation) => rec.action;

  const suggestionColor = (type: string) => {
    if (type === "warning") return "text-red-400";
    if (type === "action") return "text-primary";
    if (type === "tip") return "text-emerald-400";
    return "text-muted-foreground";
  };

  const eventsByDay = useMemo(() => {
    const map = new Map<string, typeof schedule.data>();
    for (const ev of schedule.data ?? []) {
      const d = nsToDate(ev.scheduled_at);
      const key = d.toISOString().slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(ev);
      map.set(key, arr);
    }
    return map;
  }, [schedule.data]);

  const handleAdd = async () => {
    if (!plantName.trim()) {
      toast.error("Plant name is required.");
      return;
    }
    const d = new Date(`${eventDate}T12:00:00`);
    try {
      await createEvent.mutateAsync({
        name: plantName.trim(),
        emoji: emojiForEventType(eventTypeKey),
        event_type: eventTypeToCandid(eventTypeKey),
        scheduled_at: BigInt(d.getTime()) * 1_000_000n,
        notes: notes.trim(),
      });
      toast.success("Event added to your schedule.");
      setAddOpen(false);
      setPlantName("");
      setNotes("");
    } catch {
      toast.error("Failed to add event.");
    }
  };

  const shiftMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  };

  return (
    <div className="space-y-6" data-ocid="planting-calendar-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-semibold text-xl flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            Planting Calendar
          </h2>
          <p className="text-sm text-muted-foreground">
            {ZONE_LABELS[zone]} · {coordinates.label}
          </p>
        </div>
        <Select value={zone} onValueChange={(v) => setZone(normalizeZone(v))}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_ZONES.map((z) => (
              <SelectItem key={z} value={z}>
                Zone {z.toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant={viewMode === "calendar" ? "default" : "outline"}
            onClick={() => setViewMode("calendar")}
          >
            Calendar
          </Button>
          <Button
            size="sm"
            variant={viewMode === "list" ? "default" : "outline"}
            onClick={() => setViewMode("list")}
          >
            List
          </Button>
          {isAuthenticated ? (
            <Button size="sm" className="bg-primary" onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Event
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={login}>
              Sign in to schedule
            </Button>
          )}
        </div>
      </div>

      {weather && (
        <div className="rounded-xl border border-border bg-card/50 px-4 py-3 text-sm space-y-1.5">
          <div className="text-muted-foreground">
            {weather.current.tempF != null && (
              <span className="mr-3">{Math.round(weather.current.tempF)}°F now</span>
            )}
            {weather.moon.emoji} {weather.moon.phase}
          </div>
          {weatherSuggestions.map((s, i) => (
            <p key={i} className={suggestionColor(s.type)}>
              {s.text}
            </p>
          ))}
        </div>
      )}

      {(overdue.data?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 space-y-2">
          <p className="text-sm font-medium text-red-400">Overdue</p>
          {overdue.data?.map((ev) => (
            <div key={ev.id.toString()} className="flex items-center justify-between gap-2 text-sm">
              <span>
                {ev.name} — {eventTypeLabel(ev.event_type)}
              </span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() =>
                    completeEvent.mutate(ev.id, {
                      onSuccess: () => toast.success("Marked complete."),
                    })
                  }
                >
                  <Check className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-destructive"
                  onClick={() => deleteEvent.mutate(ev.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button size="sm" variant="ghost" onClick={() => shiftMonth(-1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="font-display font-semibold">
          {new Date(viewYear, viewMonth - 1).toLocaleString(undefined, {
            month: "long",
            year: "numeric",
          })}
        </span>
        <Button size="sm" variant="ghost" onClick={() => shiftMonth(1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {viewMode === "calendar" ? (
        schedule.isPending ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : (
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="py-1 text-muted-foreground font-medium">
                {d}
              </div>
            ))}
            {calendarDays.map((day, i) => {
              if (!day) return <div key={`pad-${i}`} />;
              const key = day.toISOString().slice(0, 10);
              const evs = eventsByDay.get(key) ?? [];
              const isToday = sameDay(day, now);
              return (
                <div
                  key={key}
                  className={[
                    "min-h-[72px] rounded-lg border p-1 text-left",
                    isToday ? "border-primary/50 bg-primary/5" : "border-border/60",
                  ].join(" ")}
                >
                  <span className="text-[11px] font-medium">{day.getDate()}</span>
                  <div className="mt-0.5 space-y-0.5">
                    {evs.slice(0, 2).map((ev) => (
                      <div
                        key={ev.id.toString()}
                        className="truncate rounded bg-muted/50 px-0.5 text-[9px]"
                        title={ev.name}
                      >
                        {ev.name}
                      </div>
                    ))}
                    {evs.length > 2 && (
                      <span className="text-[9px] text-muted-foreground">
                        +{evs.length - 2}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="space-y-2">
          {(upcoming.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No upcoming events.</p>
          ) : (
            upcoming.data?.map((ev) => (
              <div
                key={ev.id.toString()}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{ev.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {eventTypeLabel(ev.event_type)} ·{" "}
                    {nsToDate(ev.scheduled_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => completeEvent.mutate(ev.id)}
                >
                  Done
                </Button>
              </div>
            ))
          )}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-display font-semibold mb-3">
          What to plant in{" "}
          {new Date(viewYear, viewMonth - 1).toLocaleString(undefined, {
            month: "long",
          })}
        </h3>
        {zoneRecs.length > 0 ? (
          <div className="space-y-2">
            {zoneRecs.map((rec, i) => (
              <div
                key={i}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg bg-muted/20 p-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {rec.emoji} {rec.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{rec.notes}</p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {recommendationEventLabel(rec)}
                </Badge>
                {isAuthenticated ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs shrink-0"
                    onClick={() => prefillFromRecommendation(rec)}
                  >
                    Add to schedule
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No zone data for this month.</p>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add planting event</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Plant name</Label>
              <Input value={plantName} onChange={(e) => setPlantName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Event type</Label>
              <Select value={eventTypeKey} onValueChange={setEventTypeKey}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t.key} value={t.key}>
                      {t.emoji} {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAdd} disabled={createEvent.isPending}>
              Save event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
