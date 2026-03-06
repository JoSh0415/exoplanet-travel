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

export type Booking = {
  id: string;
  userId: string;
  planetId: string;
  travelClass: string;
  bookingDate: string;
};

export function buildQuery(params: Record<string, string | number | boolean | null | undefined>) {
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

export async function fetchExoplanet(id: string): Promise<Exoplanet> {
  const res = await fetch(`/api/exoplanets/${id}`, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? `Failed to fetch exoplanet (${res.status})`);
  }
  return res.json();
}

export type BookingWithDetails = {
  id: string;
  bookingDate: string;
  travelClass: string;
  status?: string;
  user: { id: string; name: string | null; email: string };
  planet: { id: string; name: string; distance: number; vibe: string | null; discoveryYear: number | null };
};

export async function createBooking(input: {
  userId: string;
  planetId: string;
  travelClass: string;
}): Promise<Booking> {
  const res = await fetch(`/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? `Failed to create booking (${res.status})`);
  }

  return res.json();
}

export async function fetchBookings(query: {
  page?: number;
  pageSize?: number;
  userId?: string;
}): Promise<Paginated<BookingWithDetails>> {
  const res = await fetch(`/api/bookings${buildQuery(query)}`, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? `Failed to fetch bookings (${res.status})`);
  }
  return res.json();
}

export async function updateBooking(
  id: string,
  input: { travelClass?: string; status?: string }
): Promise<Booking> {
  const res = await fetch(`/api/bookings/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? `Failed to update booking (${res.status})`);
  }

  return res.json();
}

export async function deleteBooking(id: string): Promise<void> {
  const res = await fetch(`/api/bookings/${id}`, { method: "DELETE" });

  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? `Failed to delete booking (${res.status})`);
  }
}