import type { NextRequest } from "next/server";
import { corsHeaders, geoJsonPayload, optionsResponse, readMode } from "@/lib/crossing-response";

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: NextRequest) {
  const mode = await readMode(request);
  if (mode instanceof Response) return mode;
  return Response.json(await geoJsonPayload(mode), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/geo+json",
    },
  });
}
