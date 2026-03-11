"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../lib/AuthContext";
import Navbar from "../components/Navbar";

export default function AdminPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  /* ── Forbidden ── */
  if (user.role !== "ADMIN") {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <Navbar />
        <main className="relative z-10 flex flex-col items-center justify-center min-h-[70vh] px-4">
          <div className="rounded-2xl bg-white/[0.03] border border-rose-500/20 p-10 text-center max-w-md">
            <span className="text-5xl mb-4 block">🔒</span>
            <h1 className="text-2xl font-bold text-white mb-2">Forbidden</h1>
            <p className="text-sm text-slate-500 font-mono mb-6">
              You need the <span className="text-rose-400">ADMIN</span> role to access this area.
            </p>
            <Link
              href="/exoplanets"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl shadow-md shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all hover:-translate-y-0.5"
            >
              ← Back to Exoplanets
            </Link>
          </div>
        </main>
      </div>
    );
  }

  /* ── Admin landing ── */
  return (
    <div className="min-h-screen relative overflow-hidden">
      <Navbar />
      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🛡️</span>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Admin Panel
            </h1>
          </div>
          <p className="text-sm text-slate-500 font-mono">
            System management & data provenance
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/admin/imports"
            className="group rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-cyan-500/30 p-6 transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🛰️</span>
              <h2 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors">
                NASA Import Runs
              </h2>
            </div>
            <p className="text-xs font-mono text-slate-500">
              View import history, trigger dataset refreshes, and inspect data provenance.
            </p>
          </Link>

          <Link
            href="/analytics"
            className="group rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-cyan-500/30 p-6 transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">📊</span>
              <h2 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors">
                Analytics Dashboard
              </h2>
            </div>
            <p className="text-xs font-mono text-slate-500">
              Booking insights, top destinations, and vibe distribution.
            </p>
          </Link>
        </div>
      </main>
    </div>
  );
}
