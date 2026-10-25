"use client";

import { formatDepth, STATUS_STYLES, type CrossingPrediction } from "@flood/engine";
import { useEffect, useRef } from "react";
import { DemoBanner } from "@/components/demo-banner";

export function NearAlert({
  crossing,
  miles,
  demo,
  onDismiss,
}: {
  crossing: CrossingPrediction;
  miles: number;
  demo: boolean;
  onDismiss: () => void;
}) {
  const dismissRef = useRef<HTMLButtonElement>(null);
  const style = STATUS_STYLES[crossing.status];
  const depth = formatDepth(crossing.depthFt);

  useEffect(() => {
    dismissRef.current?.focus();
  }, [crossing.id]);

  return (
    <div className="fixed inset-0 z-30 flex flex-col" role="alertdialog" aria-modal="true" aria-labelledby="near-alert-title">
      {demo ? <DemoBanner /> : null}
      <div className="flex flex-1 flex-col justify-between px-6 py-8 text-white" style={{ background: style.ink }}>
        <p className="font-display text-sm font-semibold tracking-[0.18em] uppercase">Within 1 mile</p>
        <div className="max-w-xl">
          <p className="font-display text-5xl font-semibold tracking-tight sm:text-7xl" id="near-alert-title">
            Do not enter
          </p>
          <p className="mt-4 text-2xl font-semibold">{crossing.name}</p>
          <p className="mt-2 text-lg text-white/80">
            {style.label} · {depth.feet} ({depth.inches}) · {miles.toFixed(2)} mi away
          </p>
          <p className="mt-4 max-w-lg text-base leading-6 text-white/90">{crossing.vehicleNote}</p>
        </div>
        <button
          ref={dismissRef}
          type="button"
          onClick={onDismiss}
          className="mt-8 w-fit rounded-full bg-white px-5 py-3 text-base font-semibold text-ink"
        >
          I am not crossing here
        </button>
      </div>
    </div>
  );
}
