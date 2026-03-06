"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchBookings, deleteBooking, BookingWithDetails, Paginated } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import Navbar from "../components/Navbar";

const STATUS_STYLES: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  CONFIRMED: { label: "Confirmed", dot: "bg-emerald-400", text: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
  CANCELLED: { label: "Cancelled", dot: "bg-rose-400", text: "text-rose-400", bg: "bg-rose-400/10 border-rose-400/20" },
  COMPLETED: { label: "Completed", dot: "bg-sky-400", text: "text-sky-400", bg: "bg-sky-400/10 border-sky-400/20" },
};

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

export default function BookingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<Paginated<BookingWithDetails> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const pageSize = 12;

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchBookings({ userId: user.id, page, pageSize });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, [user, page]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (user) load();
  }, [user, authLoading, load, router]);

  const handleDelete = async (id: string) => {
    if (!confirm("Cancel this booking? This action cannot be undone.")) return;
    setDeletingId(id);
    try {
      await deleteBooking(id);
      setToast("Booking cancelled.");
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to cancel booking");
    } finally {
      setDeletingId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#06070a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#06070a] relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <Navbar />

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🎫</span>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              My Trips
            </h1>
          </div>
          <p className="text-sm text-slate-500 font-mono">
            Manage your interstellar travel bookings
          </p>
        </div>

        {/* Toast */}
        {toast && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-mono flex items-center justify-between gap-3 animate-fade-in-up">
            <span className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              {toast}
            </span>
            <div className="flex items-center gap-3">
              <Link href="/analytics" className="text-indigo-400 hover:text-indigo-300 transition-colors underline underline-offset-2">
                View analytics →
              </Link>
              <button onClick={() => setToast(null)} className="text-slate-500 hover:text-slate-300 transition-colors">
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-mono">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && !data && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-56 rounded-2xl bg-white/5 border border-white/5 animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {data && data.items.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🌌</div>
            <h2 className="text-xl font-semibold text-slate-300 mb-2">No bookings yet</h2>
            <p className="text-slate-500 text-sm mb-6">
              Your interstellar journey awaits. Browse exoplanets and book your first trip!
            </p>
            <Link
              href="/exoplanets"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl shadow-md shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all hover:-translate-y-0.5"
            >
              <span>🚀</span> Explore Exoplanets
            </Link>
          </div>
        )}

        {/* Booking cards */}
        {data && data.items.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.items.map((booking) => {
                const status = STATUS_STYLES[booking.status ?? "CONFIRMED"] ?? STATUS_STYLES.CONFIRMED;
                const vibeEmoji = VIBE_EMOJI[booking.planet.vibe ?? ""] ?? "✨";
                const isDeleting = deletingId === booking.id;

                return (
                  <div
                    key={booking.id}
                    className={`group relative rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300 overflow-hidden ${isDeleting ? "opacity-50 pointer-events-none" : ""}`}
                  >
                    {/* Card header with planet info */}
                    <div className="p-5 pb-3">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{vibeEmoji}</span>
                          <div>
                            <Link
                              href={`/exoplanets/${booking.planet.id}`}
                              className="text-sm font-semibold text-white hover:text-cyan-400 transition-colors"
                            >
                              {booking.planet.name}
                            </Link>
                            {booking.planet.vibe && (
                              <p className="text-[11px] text-slate-500 font-mono">{booking.planet.vibe}</p>
                            )}
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono border rounded-full ${status.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                          <span className={status.text}>{status.label}</span>
                        </span>
                      </div>

                      {/* Details grid */}
                      <div className="grid grid-cols-2 gap-3 text-[11px] font-mono">
                        <div>
                          <span className="text-slate-600 block mb-0.5">TRAVEL CLASS</span>
                          <span className="text-slate-300">{booking.travelClass}</span>
                        </div>
                        <div>
                          <span className="text-slate-600 block mb-0.5">DISTANCE</span>
                          <span className="text-slate-300">{booking.planet.distance.toLocaleString()} ly</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-600 block mb-0.5">BOOKED ON</span>
                          <span className="text-slate-300">
                            {new Date(booking.bookingDate).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card actions */}
                    <div className="flex border-t border-white/[0.06]">
                      <Link
                        href={`/bookings/${booking.id}`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-mono text-slate-500 hover:text-cyan-400 hover:bg-white/[0.03] transition-all"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Edit
                      </Link>
                      <div className="w-px bg-white/[0.06]" />
                      <button
                        onClick={() => handleDelete(booking.id)}
                        disabled={isDeleting}
                        className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-mono text-slate-500 hover:text-rose-400 hover:bg-rose-500/[0.05] transition-all disabled:opacity-50"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        {isDeleting ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-xs font-mono text-slate-500 bg-white/5 border border-white/10 rounded-lg hover:text-white hover:border-white/20 transition-all disabled:opacity-30 disabled:pointer-events-none"
                >
                  ← Prev
                </button>
                <span className="text-xs font-mono text-slate-500">
                  {page} / {data.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={page >= data.totalPages}
                  className="px-3 py-1.5 text-xs font-mono text-slate-500 bg-white/5 border border-white/10 rounded-lg hover:text-white hover:border-white/20 transition-all disabled:opacity-30 disabled:pointer-events-none"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
