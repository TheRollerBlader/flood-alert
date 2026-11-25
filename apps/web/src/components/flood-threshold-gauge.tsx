import {
  buildThresholdGaugeScale,
  estimateCrossingThresholdEta,
  findCrossing,
  formatNumber,
  type CrossingPrediction,
} from "@flood/engine";

export function FloodThresholdGauge({ crossing }: { crossing: CrossingPrediction }) {
  const scale = buildThresholdGaugeScale(crossing.depthFt);
  const baseCrossing = findCrossing(crossing.id);
  const eta =
    baseCrossing && crossing.dischargeCfs != null
      ? estimateCrossingThresholdEta(
          baseCrossing,
          crossing.dischargeCfs,
          0,
          crossing.rainfallInches ?? 0,
        )
      : null;

  return (
    <section
      aria-label="Flood stage threshold gauge"
      className="rounded-lg border border-line bg-white/60 p-3"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">
          Stage Thresholds
        </h3>
        <span className="text-xs text-muted">
          {scale.nextThreshold
            ? `${formatNumber(scale.nextThreshold.remainingFt, 2)} ft to ${scale.nextThreshold.label}`
            : crossing.depthFt == null
              ? "Depth unavailable"
              : "Above critical stage"}
        </span>
      </div>

      <div className="mt-2.5">
        <svg
          viewBox="0 0 280 34"
          className="h-9 w-full overflow-visible"
          role="img"
          aria-label={
            crossing.depthFt != null
              ? `Predicted water depth ${formatNumber(crossing.depthFt, 2)} feet on a 0 to ${formatNumber(scale.maxScaleFt, 1)} foot scale`
              : "Water depth scale unavailable"
          }
        >
          {scale.segments.map((segment) => {
            const x = (segment.startPct / 100) * 280;
            const width = Math.max(1, (segment.widthPct / 100) * 280);
            return (
              <rect
                key={segment.status}
                x={x}
                y={10}
                width={width}
                height={10}
                fill={segment.color}
                opacity={0.85}
              />
            );
          })}

          {scale.markerPct != null ? (
            <g transform={`translate(${(scale.markerPct / 100) * 280}, 0)`}>
              <line x1={0} y1={4} x2={0} y2={26} stroke="#0f172a" strokeWidth={2} />
              <circle cx={0} cy={15} r={4} fill="#ffffff" stroke="#0f172a" strokeWidth={2} />
            </g>
          ) : null}

          <text x={0} y={33} fontSize="9" fill="#5c6b73">
            0 ft
          </text>
          <text
            x={(0.5 / scale.maxScaleFt) * 280}
            y={33}
            fontSize="9"
            textAnchor="middle"
            fill="#5c6b73"
          >
            0.5
          </text>
          <text
            x={(1.0 / scale.maxScaleFt) * 280}
            y={33}
            fontSize="9"
            textAnchor="middle"
            fill="#5c6b73"
          >
            1.0
          </text>
          <text
            x={(2.0 / scale.maxScaleFt) * 280}
            y={33}
            fontSize="9"
            textAnchor="middle"
            fill="#5c6b73"
          >
            2.0
          </text>
          <text x={280} y={33} fontSize="9" textAnchor="end" fill="#5c6b73">
            {formatNumber(scale.maxScaleFt, 1)} ft
          </text>
        </svg>
      </div>

      {eta ? (
        <dl className="mt-2 grid grid-cols-2 gap-2 border-t border-line pt-2 text-xs">
          <div>
            <dt className="text-muted">Warning trigger</dt>
            <dd className="font-semibold">{formatNumber(eta.warningThresholdCfs, 0)} cfs</dd>
          </div>
          <div>
            <dt className="text-muted">Critical trigger</dt>
            <dd className="font-semibold">{formatNumber(eta.criticalThresholdCfs, 0)} cfs</dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}
