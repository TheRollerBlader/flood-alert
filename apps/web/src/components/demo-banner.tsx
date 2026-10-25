export function DemoBanner() {
  return (
    <div className="flex items-start gap-3 bg-demo px-4 py-2.5 text-demo-ink sm:items-center" role="status">
      <span className="mt-0.5 shrink-0 rounded-full bg-demo-ink px-2 py-0.5 font-display text-[11px] font-semibold tracking-[0.16em] text-demo sm:mt-0">
        DEMO
      </span>
      <p className="text-sm leading-5">
        Demo storm — not a live warning. Depths are scripted so every hazard level is visible.
      </p>
    </div>
  );
}
