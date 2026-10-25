import { parseMode, predictCrossing, predictCrossings, toGeoJSON, DATA_SOURCES, type Mode } from "@flood/engine";
import { connection } from "next/server";
import type { NextRequest } from "next/server";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function optionsResponse() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

export async function readMode(request: NextRequest): Promise<Mode | Response> {
  await connection();
  const mode = parseMode(request.nextUrl.searchParams.get("mode"));
  if (!mode) return json({ error: "mode must be live or demo." }, 400);
  return mode;
}

export async function crossingsPayload(mode: Mode) {
  const crossings = await predictCrossings(mode);
  return { mode, crossings, sources: DATA_SOURCES };
}

export async function crossingPayload(id: string, mode: Mode) {
  const crossing = await predictCrossing(id, mode);
  if (!crossing) return null;
  return { mode, crossing, sources: DATA_SOURCES };
}

export async function geoJsonPayload(mode: Mode) {
  const crossings = await predictCrossings(mode);
  return toGeoJSON(crossings);
}
