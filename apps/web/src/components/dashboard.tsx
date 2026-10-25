"use client";

import {
  compareBySeverity,
  DATA_SOURCES,
  haversineMiles,
  isAlertStatus,
  NEAR_MILES,
  STATUS_STYLES,
  type CrossingPrediction,
  type Mode,
} from "@flood/engine";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { CrossingPanel } from "@/components/crossing-panel";
import { DemoBanner } from "@/components/demo-banner";
import { NearAlert } from "@/components/near-alert";

const CrossingMap = dynamic(() => import("@/components/crossing-map").then((mod) => mod.CrossingMap), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-[#d5e0e4]" />,
});

interface Place {
  latitude: number;
  longitude: number;
}

export function Dashboard({
  initialMode,
  initialCrossings,
}: {
  initialMode: Mode;
  initialCrossings: CrossingPrediction[];
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [crossings, setCrossings] = useState(initialCrossings);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const [loadNote, setLoadNote] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialMode);
    setCrossings(initialCrossings);
  }, [initialMode, initialCrossings]);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const response = await fetch(`/api/crossings?mode=${mode}`);
        if (!response.ok) throw new Error("status");
        const body = (await response.json()) as { crossings: CrossingPrediction[] };
        if (!cancelled) {
          setCrossings(body.crossings);
          setLoadNote(null);
        }
      } catch {
        if (!cancelled) setLoadNote("The latest gauge check failed. Showing the last depths.");
      }
    }
    const timer = window.setInterval(() => void refresh(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [mode]);

  async function chooseMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    setDismissedId(null);
    const path = next === "demo" ? "/?mode=demo" : "/";
    window.history.replaceState(null, "", path);
    try {
      const response = await fetch(`/api/crossings?mode=${next}`);
      if (!response.ok) throw new Error("status");
      const body = (await response.json()) as { crossings: CrossingPrediction[] };
      setCrossings(body.crossings);
      setLoadNote(null);
    } catch {
      setLoadNote("Could not switch modes. Try again.");
    }
  }

  function locate() {
    if (!navigator.geolocation) {
      setLocationNote("This browser cannot share location.");
      return;
    }
    setLocating(true);
    setLocationNote(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPlace({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setDismissedId(null);
        setLocating(false);
      },
      () => {
        setLocationNote("Location is off. Allow it to check crossings within a mile.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
    );
  }

  const threat = useMemo(() => {
    if (!place) return null;
    const nearby = crossings
      .filter((crossing) => isAlertStatus(crossing.status))
      .map((crossing) => ({ crossing, miles: haversineMiles(place, crossing) }))
      .filter((item) => item.miles <= NEAR_MILES)
      .sort((a, b) => compareBySeverity(a.crossing, b.crossing) || a.miles - b.miles);
    return nearby[0] ?? null;
  }, [place, crossings]);

  const showAlert = threat != null && threat.crossing.id !== dismissedId;

  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink md:h-dvh md:overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-panel px-4 py-3">
        <div>
          <p className="font-display text-xs font-semibold tracking-[0.18em] text-brand uppercase">Low water</p>
          <h1 className="font-display text-3xl leading-none font-semibold tracking-tight">Flood Alert</h1>
          <p className="mt-1 text-sm text-muted">Prosper, Frisco, and McKinney · predicted depth, not a drone measurement</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-line bg-white p-1" role="group" aria-label="Prediction mode">
            <ModeButton active={mode === "live"} onClick={() => void chooseMode("live")}>
              Live
            </ModeButton>
            <ModeButton active={mode === "demo"} onClick={() => void chooseMode("demo")}>
              Demo storm
            </ModeButton>
          </div>
          <button
            type="button"
            onClick={locate}
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white"
          >
            {locating ? "Finding you…" : "Use my location"}
          </button>
        </div>
      </header>
      {mode === "demo" && !showAlert ? <DemoBanner /> : null}
      {loadNote ? <p className="bg-white px-4 py-2 text-sm text-muted">{loadNote}</p> : null}
      {locationNote ? <p className="bg-white px-4 py-2 text-sm text-muted">{locationNote}</p> : null}
      <div className="flex flex-col md:min-h-0 md:flex-1 md:flex-row">
        <div className="relative h-[42dvh] shrink-0 md:order-2 md:h-auto md:min-h-0 md:flex-1">
          <CrossingMap crossings={crossings} selectedId={selectedId} onSelect={setSelectedId} />
          <ul className="pointer-events-none absolute bottom-3 left-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1.5">
            {(["clear", "watch", "warning", "severe", "critical"] as const).map((status) => (
              <li
                key={status}
                className="rounded-full bg-white/95 px-2 py-1 text-[11px] font-semibold tracking-wide uppercase shadow-sm"
                style={{ color: STATUS_STYLES[status].ink }}
              >
                <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: STATUS_STYLES[status].fill }} />
                {STATUS_STYLES[status].label}
              </li>
            ))}
          </ul>
        </div>
        <aside className="border-t border-line bg-panel md:order-1 md:flex md:min-h-0 md:w-[23rem] md:flex-none md:flex-col md:overflow-hidden md:border-t-0 md:border-r">
          <CrossingPanel
            crossings={crossings}
            selectedId={selectedId}
            sources={DATA_SOURCES}
            onSelect={setSelectedId}
          />
        </aside>
      </div>
      {showAlert && threat ? (
        <NearAlert
          crossing={threat.crossing}
          miles={threat.miles}
          demo={mode === "demo"}
          onDismiss={() => setDismissedId(threat.crossing.id)}
        />
      ) : null}
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold ${active ? "bg-ink text-white" : "text-ink"}`}
    >
      {children}
    </button>
  );
}
