export type Exoplanet = {
  id: string;
  name: string;
  distance: number;
  temperature?: number | null;
  gravity?: number | null;
  vibe?: string | null;
  discoveryYear?: number | null;
};

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ExoplanetQuery = {
  page?: number;
  pageSize?: number;
  q?: string;
  vibe?: string;
  minDistance?: number;
  maxDistance?: number;
  sort?: "distance" | "discoveryYear" | "name";
  order?: "asc" | "desc";
};

export function buildQuery(params: Record<string, any>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export async function fetchExoplanets(query: ExoplanetQuery): Promise<Paginated<Exoplanet>> {
  const res = await fetch(`/api/exoplanets${buildQuery(query)}`, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? `Failed to fetch exoplanets (${res.status})`);
  }
  return res.json();
}
