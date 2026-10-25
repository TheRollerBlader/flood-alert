import type { NextRequest } from "next/server";
import { crossingPayload, json, optionsResponse, readMode } from "@/lib/crossing-response";

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const mode = await readMode(request);
  if (mode instanceof Response) return mode;
  const { id } = await context.params;
  const payload = await crossingPayload(id, mode);
  if (!payload) return json({ error: "Crossing not found." }, 404);
  return json(payload);
}
