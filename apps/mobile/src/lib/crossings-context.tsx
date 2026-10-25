import type { CrossingPrediction, Mode } from "@flood/engine";
import * as Location from "expo-location";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { API_URL } from "@/lib/api";

interface Place {
  latitude: number;
  longitude: number;
}

interface CrossingsContextValue {
  mode: Mode;
  setMode: (mode: Mode) => void;
  crossings: CrossingPrediction[];
  loading: boolean;
  error: string | null;
  place: Place | null;
  locationNote: string | null;
  locating: boolean;
  locate: () => Promise<void>;
  dismissedId: string | null;
  dismiss: (id: string) => void;
}

const CrossingsContext = createContext<CrossingsContextValue | null>(null);

export function CrossingsProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>("live");
  const [crossings, setCrossings] = useState<CrossingPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`${API_URL}/api/crossings?mode=${mode}`);
        if (!response.ok) throw new Error(String(response.status));
        const body = (await response.json()) as { crossings: CrossingPrediction[] };
        if (!cancelled) {
          setCrossings(body.crossings);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError("Could not reach the Flood Alert server. Start the web app, and set EXPO_PUBLIC_API_URL on a physical phone.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    setLoading(true);
    void load();
    const timer = setInterval(() => void load(), 60_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [mode]);

  const setMode = useCallback((next: Mode) => {
    setDismissedId(null);
    setModeState(next);
  }, []);

  const locate = useCallback(async () => {
    setLocating(true);
    setLocationNote(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setLocationNote("Location is off. Allow it to check crossings within a mile.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setPlace({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      setDismissedId(null);
    } catch {
      setLocationNote("Could not read this phone's location.");
    } finally {
      setLocating(false);
    }
  }, []);

  const value = useMemo<CrossingsContextValue>(
    () => ({
      mode,
      setMode,
      crossings,
      loading,
      error,
      place,
      locationNote,
      locating,
      locate,
      dismissedId,
      dismiss: setDismissedId,
    }),
    [mode, setMode, crossings, loading, error, place, locationNote, locating, locate, dismissedId],
  );

  return <CrossingsContext.Provider value={value}>{children}</CrossingsContext.Provider>;
}

export function useCrossings() {
  const value = useContext(CrossingsContext);
  if (!value) throw new Error("useCrossings must be used inside CrossingsProvider");
  return value;
}
