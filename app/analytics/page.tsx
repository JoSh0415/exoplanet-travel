"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/AuthContext";
import Navbar from "../components/Navbar";
import {
  fetchBookingsSummary,
  fetchTopDestinations,
  fetchVibesAnalytics,
  BookingsSummary,
  TopDestination,
  VibesAnalytics,
} from "../lib/api";

/* ─── Vibe emoji map (reused from bookings) ─── */
const VIBE_EMOJI: Record<string, string> = {
  Mysterious: "🌑",
  "Habitable Paradise": "🌍",
  "Molten Rock": "🌋",
  "Sauna World": "♨️",
  "Ice World": "🧊",
  "Gas Giant": "🪐",
  "Hot Jupiter": "🔥",
  "Literal Hellscape": "💀",
  "Barren Wasteland": "🏜️",
};

/* ─── Helpers ─── */
function today() {
  return new Date().toISOString().slice(0, 10);
}
function thirtyDaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

/* ─── Skeleton / Error shared components ─── */
function CardSkeleton({ className = "h-40" }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse ${className}`}
    />
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between gap-3">
      <span className="text-rose-400 text-sm font-mono">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 px-3 py-1 text-xs font-mono text-rose-400 border border-rose-500/30 rounded-lg hover:bg-rose-500/10 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

/* ─── Simple bar ─── */
function Bar({ value, max, color = "bg-cyan-500" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
      <div
        className={`h-full rounded-full ${color} transition-all duration-500`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ─── Travel class colours ─── */
const CLASS_COLORS: Record<string, string> = {
  ECONOMY: "bg-emerald-500",
  BUSINESS: "bg-amber-500",
  FIRST: "bg-violet-500",
};

/* ─── Main page ─── */
export default function AnalyticsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  /* Filters */
  const [from, setFrom] = useState(thirtyDaysAgo);
  const [to, setTo] = useState(today);
  const [groupBy, setGroupBy] = useState<"day" | "month">("day");

  /* Data */
  const [summary, setSummary] = useState<BookingsSummary | null>(null);
  const [destinations, setDestinations] = useState<TopDestination[] | null>(null);
  const [vibes, setVibes] = useState<VibesAnalytics | null>(null);

  /* Status */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, d, v] = await Promise.all([
        fetchBookingsSummary({ from, to, groupBy }),
        fetchTopDestinations(10),
        fetchVibesAnalytics(),
      ]);
      setSummary(s);
      setDestinations(d.destinations);
      setVibes(v);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [from, to, groupBy]);

  /* Auth guard */
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  /* Fetch data when user or filters change */
  useEffect(() => {
    if (user) load();
  }, [user, load]);

  /* Auth loading spinner */
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#06070a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null; // will redirect

  /* Derived values */
  const maxClassCount = summary ? Math.max(...summary.byTravelClass.map((c) => c.count), 1) : 1;
  const maxPeriodCount = summary ? Math.max(...summary.byPeriod.map((p) => p.count), 1) : 1;
  const maxDestBookings = destinations ? Math.max(...destinations.map((d) => d.bookings), 1) : 1;
  const maxVibeCount = vibes ? Math.max(...vibes.vibes.map((v) => v.count), 1) : 1;

  return (
    <div className="min-h-screen bg-[#06070a] relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <Navbar />

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* ──── Header ──── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">📊</span>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Analytics Dashboard
            </h1>
          </div>
          <p className="text-sm text-slate-500 font-mono mb-6">
            Booking insights across the exoplanet travel network
          </p>

          {/* Controls */}
          <div className="flex flex-wrap items-end gap-3">
            <button
              onClick={() => load()}
              disabled={loading}
              className="px-4 py-1.5 text-xs font-mono text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/10 hover:border-cyan-400/50 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2 self-end"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={loading ? "animate-spin" : ""}>
                <path d="M21.5 2v6h-6" />
                <path d="M2.5 22v-6h6" />
                <path d="M2 11.5a10 10 0 0 1 18.8-4.3" />
                <path d="M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-mono text-slate-600 uppercase">From</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="px-3 py-1.5 text-xs font-mono text-slate-300 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-cyan-500/40 transition-colors"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-mono text-slate-600 uppercase">To</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="px-3 py-1.5 text-xs font-mono text-slate-300 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-cyan-500/40 transition-colors"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-mono text-slate-600 uppercase">Group by</span>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as "day" | "month")}
                className="px-3 py-1.5 text-xs font-mono text-slate-300 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-cyan-500/40 transition-colors"
              >
                <option value="day">Day</option>
                <option value="month">Month</option>
              </select>
            </label>
          </div>
        </div>

        {/* ──── Error ──── */}
        {error && <ErrorBanner message={error} onRetry={load} />}

        {/* ──── Loading skeletons ──── */}
        {loading && !summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CardSkeleton className="h-32" />
            <CardSkeleton className="h-32" />
            <CardSkeleton className="h-64" />
            <CardSkeleton className="h-64" />
          </div>
        )}

        {/* ──── Dashboard cards ──── */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ── Total Bookings ── */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6 flex flex-col justify-center">
              <span className="text-[11px] font-mono text-slate-600 uppercase tracking-wider mb-1">
                Total Bookings
              </span>
              <span className="text-4xl font-bold text-white tracking-tight">
                {summary.totalBookings.toLocaleString()}
              </span>
              <span className="text-xs font-mono text-slate-500 mt-1">
                {from} → {to}
              </span>
            </div>

            {/* ── Bookings by Travel Class ── */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
              <span className="text-[11px] font-mono text-slate-600 uppercase tracking-wider mb-4 block">
                Bookings by Travel Class
              </span>
              {summary.byTravelClass.length === 0 ? (
                <p className="text-xs text-slate-500 font-mono">No data</p>
              ) : (
                <div className="space-y-3">
                  {summary.byTravelClass.map((tc) => (
                    <div key={tc.travelClass}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono text-slate-300">{tc.travelClass}</span>
                        <span className="text-xs font-mono text-slate-500">{tc.count}</span>
                      </div>
                      <Bar
                        value={tc.count}
                        max={maxClassCount}
                        color={CLASS_COLORS[tc.travelClass] ?? "bg-cyan-500"}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Top Destinations ── */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
              <span className="text-[11px] font-mono text-slate-600 uppercase tracking-wider mb-4 block">
                Top Destinations
              </span>
              {!destinations || destinations.length === 0 ? (
                <p className="text-xs text-slate-500 font-mono">No data</p>
              ) : (
                <div className="space-y-3">
                  {destinations.map((d, i) => (
                    <div key={d.planetId}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono text-slate-300 flex items-center gap-2">
                          <span className="text-slate-600 w-4 text-right">{i + 1}.</span>
                          <span>{VIBE_EMOJI[d.vibe ?? ""] ?? "✨"}</span>
                          <span>{d.name}</span>
                        </span>
                        <span className="text-xs font-mono text-slate-500">
                          {d.bookings} booking{d.bookings !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <Bar value={d.bookings} max={maxDestBookings} color="bg-cyan-500" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Vibe Distribution ── */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
              <span className="text-[11px] font-mono text-slate-600 uppercase tracking-wider mb-4 block">
                Vibe Distribution
              </span>
              {!vibes || vibes.vibes.length === 0 ? (
                <p className="text-xs text-slate-500 font-mono">No data</p>
              ) : (
                <div className="space-y-3">
                  {vibes.vibes.map((v) => {
                    const booked = vibes.topBooked.find((b) => b.vibe === v.vibe);
                    return (
                      <div key={v.vibe}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-mono text-slate-300 flex items-center gap-2">
                            <span>{VIBE_EMOJI[v.vibe] ?? "✨"}</span>
                            <span>{v.vibe}</span>
                          </span>
                          <span className="text-xs font-mono text-slate-500">
                            {v.count} planet{v.count !== 1 ? "s" : ""}
                            {booked ? ` · ${booked.bookings} booked` : ""}
                          </span>
                        </div>
                        <Bar value={v.count} max={maxVibeCount} color="bg-indigo-500" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Bookings by Period (full width) ── */}
            {summary.byPeriod.length > 0 && (
              <div className="md:col-span-2 rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
                <span className="text-[11px] font-mono text-slate-600 uppercase tracking-wider mb-4 block">
                  Bookings over Time ({groupBy === "month" ? "Monthly" : "Daily"})
                </span>
                <div className="flex items-end gap-[2px] h-40">
                  {summary.byPeriod.map((p) => {
                    const pct = maxPeriodCount > 0 ? (p.count / maxPeriodCount) * 100 : 0;
                    return (
                      <div
                        key={p.period}
                        className="group relative flex-1 flex flex-col items-center justify-end h-full"
                      >
                        {/* Tooltip */}
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap px-2 py-1 rounded bg-slate-800 text-[10px] font-mono text-slate-300 border border-white/10 z-20">
                          {p.period}: {p.count}
                        </div>
                        <div
                          className="w-full rounded-t bg-cyan-500/80 hover:bg-cyan-400 transition-colors min-h-[2px]"
                          style={{ height: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
                {/* X-axis labels (first, middle, last) */}
                <div className="flex justify-between mt-2">
                  <span className="text-[10px] font-mono text-slate-600">
                    {summary.byPeriod[0]?.period}
                  </span>
                  {summary.byPeriod.length > 2 && (
                    <span className="text-[10px] font-mono text-slate-600">
                      {summary.byPeriod[Math.floor(summary.byPeriod.length / 2)]?.period}
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-slate-600">
                    {summary.byPeriod[summary.byPeriod.length - 1]?.period}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
