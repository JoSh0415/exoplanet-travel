"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateBooking, deleteBooking, BookingWithDetails } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import Navbar from "../../components/Navbar";

const TRAVEL_CLASSES = ["Economy", "Business", "First Class", "Cryo Pod", "Warp Suite"];

const STATUS_OPTIONS = [
  { value: "CONFIRMED", label: "Confirmed", dot: "bg-emerald-400", text: "text-emerald-400" },
  { value: "CANCELLED", label: "Cancelled", dot: "bg-rose-400", text: "text-rose-400" },
  { value: "COMPLETED", label: "Completed", dot: "bg-sky-400", text: "text-sky-400" },
];

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

export default function BookingDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [booking, setBooking] = useState<BookingWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [travelClass, setTravelClass] = useState("");
  const [status, setStatus] = useState("");

  const loadBooking = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch the specific booking by listing with userId and scanning for ID
      // The API returns bookings with details when listing
      const res = await fetch(`/api/bookings?userId=${user.id}&pageSize=100`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load booking");
      const data = await res.json();
      const found = data.items.find((b: BookingWithDetails) => b.id === id);
      if (!found) throw new Error("Booking not found");
      setBooking(found);
      setTravelClass(found.travelClass);
      setStatus(found.status ?? "CONFIRMED");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load booking");
    } finally {
      setLoading(false);
    }
  }, [user, id]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (user) loadBooking();
  }, [user, authLoading, loadBooking, router]);

  const hasChanges = booking && (travelClass !== booking.travelClass || status !== (booking.status ?? "CONFIRMED"));

  const handleSave = async () => {
    if (!booking || !hasChanges) return;
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const updates: { travelClass?: string; status?: string } = {};
      if (travelClass !== booking.travelClass) updates.travelClass = travelClass;
      if (status !== (booking.status ?? "CONFIRMED")) updates.status = status;
      await updateBooking(booking.id, updates);
      setSuccessMessage("Booking updated successfully!");
      await loadBooking();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update booking");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!booking) return;
    if (!confirm("Delete this booking permanently? This action cannot be undone.")) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteBooking(booking.id);
      router.push("/bookings");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete booking");
      setDeleting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#06070a]">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen bg-[#06070a]">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-rose-400 text-sm font-mono mb-6">{error}</p>
          <Link
            href="/bookings"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-mono text-slate-400 bg-white/5 border border-white/10 rounded-lg hover:text-white hover:border-white/20 transition-all"
          >
            ← Back to Bookings
          </Link>
        </div>
      </div>
    );
  }

  if (!booking) return null;

  const vibeEmoji = VIBE_EMOJI[booking.planet.vibe ?? ""] ?? "✨";
  const currentStatus = STATUS_OPTIONS.find((s) => s.value === (booking.status ?? "CONFIRMED")) ?? STATUS_OPTIONS[0];

  return (
    <div className="min-h-screen bg-[#06070a] relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <Navbar />

      <main className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Back link */}
        <Link
          href="/bookings"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-500 hover:text-cyan-400 transition-colors mb-6"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" x2="5" y1="12" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to My Trips
        </Link>

        {/* Header card */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden mb-6">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{vibeEmoji}</span>
              <div>
                <Link
                  href={`/exoplanets/${booking.planet.id}`}
                  className="text-lg font-bold text-white hover:text-cyan-400 transition-colors"
                >
                  {booking.planet.name}
                </Link>
                {booking.planet.vibe && (
                  <p className="text-xs text-slate-500 font-mono">{booking.planet.vibe}</p>
                )}
              </div>
              <span className={`ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono border rounded-full ${currentStatus.text} bg-white/5 border-white/10`}>
                <span className={`w-1.5 h-1.5 rounded-full ${currentStatus.dot}`} />
                {currentStatus.label}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 text-[11px] font-mono">
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                <span className="text-slate-600 block mb-1">BOOKING ID</span>
                <span className="text-slate-300 break-all">{booking.id.slice(0, 12)}…</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                <span className="text-slate-600 block mb-1">DISTANCE</span>
                <span className="text-slate-300">{booking.planet.distance.toLocaleString()} ly</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                <span className="text-slate-600 block mb-1">BOOKED ON</span>
                <span className="text-slate-300">
                  {new Date(booking.bookingDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        {successMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-mono flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            {successMessage}
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-mono">
            {error}
          </div>
        )}

        {/* Edit form */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-white/[0.06]">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit Booking
            </h2>
          </div>
          <div className="p-6 space-y-5">
            {/* Travel Class */}
            <div>
              <label className="block text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-2">
                Travel Class
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TRAVEL_CLASSES.map((tc) => (
                  <button
                    key={tc}
                    onClick={() => setTravelClass(tc)}
                    className={`px-3 py-2.5 text-xs font-mono rounded-xl border transition-all ${
                      travelClass === tc
                        ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                        : "bg-white/[0.02] border-white/[0.06] text-slate-500 hover:text-slate-300 hover:border-white/[0.12]"
                    }`}
                  >
                    {tc}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-2">
                Status
              </label>
              <div className="flex gap-2">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setStatus(opt.value)}
                    className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-mono rounded-xl border transition-all ${
                      status === opt.value
                        ? `bg-white/5 border-white/20 ${opt.text}`
                        : "bg-white/[0.02] border-white/[0.06] text-slate-500 hover:text-slate-300 hover:border-white/[0.12]"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Save button */}
          <div className="px-6 py-4 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-600">
              {hasChanges ? "Unsaved changes" : "No changes"}
            </span>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="px-5 py-2 text-xs font-medium bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl shadow-md shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:pointer-events-none disabled:hover:translate-y-0"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Danger zone */}
        <div className="rounded-2xl bg-rose-500/[0.03] border border-rose-500/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-rose-500/10">
            <h2 className="text-sm font-semibold text-rose-400 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" x2="12" y1="9" y2="13" />
                <line x1="12" x2="12.01" y1="17" y2="17" />
              </svg>
              Danger Zone
            </h2>
          </div>
          <div className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-300">Delete this booking</p>
              <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                This action is permanent and cannot be undone.
              </p>
            </div>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 text-xs font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl hover:bg-rose-500/20 hover:border-rose-500/30 transition-all disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete Booking"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
