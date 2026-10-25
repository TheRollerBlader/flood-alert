import type { NextRequest } from "next/server";
import { crossingsPayload, json, optionsResponse, readMode } from "@/lib/crossing-response";

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: NextRequest) {
  const mode = await readMode(request);
  if (mode instanceof Response) return mode;
  return json(await crossingsPayload(mode));
}
