import {
  compareBySeverity,
  formatDepth,
  formatNumber,
  STATUS_STYLES,
  type CrossingPrediction,
} from "@flood/engine";

function clock(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
    timeZone: "America/Chicago",
    timeZoneName: "short",
  }).format(date);
}

export function CrossingPanel({
  crossings,
  selectedId,
  sources,
  onSelect,
}: {
  crossings: CrossingPrediction[];
  selectedId: string | null;
  sources: string;
  onSelect: (id: string | null) => void;
}) {
  const selected = crossings.find((crossing) => crossing.id === selectedId) ?? null;
  if (selected) {
    return <CrossingDetail crossing={selected} sources={sources} onBack={() => onSelect(null)} />;
  }

  const ordered = [...crossings].sort(compareBySeverity);
  return (
    <div className="flex flex-col md:h-full md:min-h-0">
      <div className="border-b border-line px-4 py-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">Crossings</h2>
        <p className="text-sm text-muted">{ordered.length} low-water sites</p>
      </div>
      <ul className="md:min-h-0 md:flex-1 md:overflow-y-auto">
        {ordered.map((crossing) => {
          const style = STATUS_STYLES[crossing.status];
          const depth = formatDepth(crossing.depthFt);
          return (
            <li key={crossing.id} className="border-b border-line">
              <button
                type="button"
                onClick={() => onSelect(crossing.id)}
                className="flex w-full items-stretch gap-3 px-4 py-3 text-left hover:bg-white/70"
              >
                <span className="mt-1 h-10 w-1.5 shrink-0 rounded-full" style={{ background: style.fill }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{crossing.name}</span>
                  <span className="mt-0.5 block text-sm text-muted">
                    {crossing.city} · {crossing.creek}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-display text-lg font-semibold leading-none" style={{ color: style.ink }}>
                    {depth.feet}
                  </span>
                  <span className="mt-1 block text-xs font-semibold tracking-wide uppercase" style={{ color: style.ink }}>
                    {style.label}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="border-t border-line px-4 py-3 text-xs leading-5 text-muted">{sources}</p>
    </div>
  );
}

function CrossingDetail({
  crossing,
  sources,
  onBack,
}: {
  crossing: CrossingPrediction;
  sources: string;
  onBack: () => void;
}) {
  const style = STATUS_STYLES[crossing.status];
  const depth = formatDepth(crossing.depthFt);
  return (
    <div className="flex flex-col md:h-full md:overflow-y-auto">
      <div className="border-b border-line px-4 py-3">
        <button type="button" onClick={onBack} className="text-sm font-semibold text-brand">
          All crossings
        </button>
        <p className="mt-3 text-xs font-semibold tracking-[0.16em] text-muted uppercase">{crossing.city}</p>
        <h2 className="font-display text-3xl font-semibold leading-none tracking-tight">{crossing.name}</h2>
        <p className="mt-2 text-sm text-muted">
          {crossing.road}
          {crossing.placeDetail ? ` · ${crossing.placeDetail}` : ""} · {crossing.lwxType}
        </p>
      </div>
      <div className="px-4 py-4" style={{ background: style.fill }}>
        <p className="text-xs font-semibold tracking-[0.16em] text-white/80 uppercase">{style.label}</p>
        <p className="font-display text-5xl font-semibold tracking-tight text-white">{depth.feet}</p>
        <p className="text-lg text-white/90">{depth.inches}</p>
      </div>
      <div className="space-y-4 px-4 py-4 text-sm leading-6">
        <p>{crossing.vehicleNote}</p>
        <dl className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-xs tracking-wide text-muted uppercase">Discharge</dt>
            <dd className="font-semibold">{formatNumber(crossing.dischargeCfs, 1)} cfs</dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-muted uppercase">{crossing.rainfallLabel}</dt>
            <dd className="font-semibold">{formatNumber(crossing.rainfallInches, 2)} in</dd>
          </div>
        </dl>
        <p>{crossing.gaugeNote}</p>
        {crossing.rainfallNote ? <p className="text-muted">{crossing.rainfallNote}</p> : null}
        <p className="text-muted">Updated {clock(crossing.updatedAt)}</p>
        <p className="border-t border-line pt-3 text-muted">{crossing.disclaimer}</p>
        <p className="text-xs leading-5 text-muted">{sources}</p>
      </div>
    </div>
  );
}
