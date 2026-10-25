import { predictCrossings, parseMode, type Mode } from "@flood/engine";
import { connection } from "next/server";
import { Suspense } from "react";
import { Dashboard } from "@/components/dashboard";

export default function Page({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardLoader searchParams={searchParams} />
    </Suspense>
  );
}

async function DashboardLoader({
  searchParams,
}: {
  searchParams: PageProps<"/">["searchParams"];
}) {
  await connection();
  const params = await searchParams;
  const raw = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const mode: Mode = parseMode(typeof raw === "string" ? raw : undefined) ?? "live";
  const crossings = await predictCrossings(mode);
  return <Dashboard initialMode={mode} initialCrossings={crossings} />;
}

function DashboardSkeleton() {
  return (
    <div className="flex h-dvh flex-col bg-paper text-ink">
      <header className="border-b border-line bg-panel px-4 py-3">
        <p className="font-display text-xs font-semibold tracking-[0.18em] text-brand uppercase">Low water</p>
        <h1 className="font-display text-3xl leading-none font-semibold tracking-tight">Flood Alert</h1>
        <p className="mt-1 text-sm text-muted">Loading crossings…</p>
      </header>
      <div className="flex-1 bg-[#d5e0e4]" />
    </div>
  );
}
