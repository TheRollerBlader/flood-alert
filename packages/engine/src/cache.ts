const TTL_MS = 3 * 60 * 1000;

interface Entry {
  expires: number;
  value: unknown;
}

const cache = new Map<string, Entry>();

export async function cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expires > now) return hit.value as T;
  const value = await loader();
  cache.set(key, { expires: now + TTL_MS, value });
  return value;
}

export function clearDataCache(): void {
  cache.clear();
}
