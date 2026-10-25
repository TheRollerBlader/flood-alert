"use client";

import { STATUS_STYLES, type CrossingPrediction } from "@flood/engine";
import maplibregl from "maplibre-gl";
import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

export function CrossingMap({
  crossings,
  selectedId,
  onSelect,
}: {
  crossings: CrossingPrediction[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const onSelectRef = useRef(onSelect);
  const fittedRef = useRef(false);
  onSelectRef.current = onSelect;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;
    const map = new maplibregl.Map({
      container,
      style: "https://tiles.openfreemap.org/styles/positron",
      center: [-96.74, 33.21],
      zoom: 10,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      fittedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let cancelled = false;
    const markers: maplibregl.Marker[] = [];

    const addMarkers = () => {
      if (cancelled) return;
      if (crossings.length > 0 && !fittedRef.current) {
        const bounds = new maplibregl.LngLatBounds();
        for (const crossing of crossings) bounds.extend([crossing.longitude, crossing.latitude]);
        map.fitBounds(bounds, { padding: 56, maxZoom: 12, duration: 0 });
        fittedRef.current = true;
      }
      for (const crossing of crossings) {
        const selected = crossing.id === selectedId;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "crossing-marker";
        button.dataset.selected = selected ? "true" : "false";
        button.style.background = STATUS_STYLES[crossing.status].fill;
        button.setAttribute("aria-label", `${crossing.name}, ${STATUS_STYLES[crossing.status].label}`);
        button.addEventListener("click", () => onSelectRef.current(crossing.id));
        markers.push(
          new maplibregl.Marker({ element: button, anchor: "center" })
            .setLngLat([crossing.longitude, crossing.latitude])
            .addTo(map),
        );
      }
    };

    if (map.isStyleLoaded()) addMarkers();
    else map.once("load", addMarkers);

    return () => {
      cancelled = true;
      map.off("load", addMarkers);
      for (const marker of markers) marker.remove();
    };
  }, [crossings, selectedId]);

  return <div ref={containerRef} className="h-full w-full" />;
}
