"use client";

import Link from "next/link";
import { useAuth } from "./lib/AuthContext";
import Navbar from "./components/Navbar";

const CTA_CARDS = [
  {
    href: "/exoplanets",
    emoji: "🪐",
    title: "Exoplanet Catalogue",
    description: "Browse thousands of confirmed worlds — filter by vibe, distance, and discovery year.",
    glow: "group-hover:shadow-cyan-500/20",
    border: "group-hover:border-cyan-500/40",
    accent: "text-cyan-400",
  },
  {
    href: "/bookings",
    emoji: "🎫",
    title: "My Bookings",
    description: "View, manage, and cancel your upcoming interstellar travel reservations.",
    glow: "group-hover:shadow-emerald-500/20",
    border: "group-hover:border-emerald-500/40",
    accent: "text-emerald-400",
  },
  {
    href: "/analytics",
    emoji: "📊",
    title: "Travel Insights",
    description: "Booking trends, top destinations, and vibe breakdowns across the galaxy.",
    glow: "group-hover:shadow-fuchsia-500/20",
    border: "group-hover:border-fuchsia-500/40",
    accent: "text-fuchsia-400",
  },
];

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Navbar />

      <main className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
        {/* Hero */}
        <section className="pt-20 pb-16 text-center animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 text-xs font-mono text-slate-400 bg-white/5 border border-white/10 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Now accepting bookings for 2026 departures
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Exoplanet
            </span>
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text text-transparent">
              Travel Bureau
            </span>
          </h1>
          <p className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Your gateway to confirmed worlds beyond the solar system.
            Explore the catalogue, book a trip, and track galactic travel trends.
          </p>
        </section>

        {/* Auth state banner */}
        <section className="mb-12 animate-fade-in-up [animation-delay:0.15s]">
          {loading ? (
            <div className="flex justify-center">
              <div className="h-12 w-72 rounded-xl bg-white/5 animate-pulse" />
            </div>
          ) : user ? (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 px-6 py-4 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center gap-2 text-sm font-mono text-slate-400">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Signed in as <span className="text-white">{user.email}</span>
              </div>
              <Link
                href="/bookings"
                className="px-4 py-2 text-sm font-medium rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 hover:border-cyan-500/40 transition-all"
              >
                Go to My Bookings →
              </Link>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-white/[0.03] border border-white/10">
              <Link
                href="/login"
                className="px-5 py-2.5 text-sm font-medium rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20"
              >
                Login / Register
              </Link>
              <Link
                href="/exoplanets"
                className="px-5 py-2.5 text-sm font-medium rounded-lg text-slate-400 bg-white/5 border border-white/10 hover:text-white hover:border-white/20 transition-all"
              >
                Browse as guest
              </Link>
            </div>
          )}
        </section>

        {/* CTA cards */}
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in-up [animation-delay:0.3s]">
          {CTA_CARDS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={`group relative flex flex-col gap-3 p-6 rounded-2xl bg-white/[0.03] border border-white/10 ${card.border} transition-all duration-300 hover:shadow-xl ${card.glow} hover:-translate-y-0.5`}
            >
              <span className="text-3xl">{card.emoji}</span>
              <h2 className={`text-lg font-semibold ${card.accent}`}>{card.title}</h2>
              <p className="text-sm text-slate-400 leading-relaxed">{card.description}</p>
              <span className="mt-auto pt-2 text-xs font-mono text-slate-500 group-hover:text-slate-300 transition-colors">
                Explore →
              </span>
            </Link>
          ))}

          {/* Admin card — only for ADMIN role */}
          {!loading && user?.role === "ADMIN" && (
            <Link
              href="/admin/imports"
              className="group relative flex flex-col gap-3 p-6 rounded-2xl bg-amber-500/[0.03] border border-amber-500/10 group-hover:border-amber-500/40 hover:border-amber-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/10 hover:-translate-y-0.5 sm:col-span-2 lg:col-span-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">🛡️</span>
                <div>
                  <h2 className="text-lg font-semibold text-amber-400">Admin — Dataset Refresh &amp; Provenance</h2>
                  <p className="text-sm text-slate-400 leading-relaxed mt-1">
                    Trigger NASA exoplanet imports, review run history, and inspect data lineage.
                  </p>
                </div>
              </div>
              <span className="mt-auto pt-1 text-xs font-mono text-slate-500 group-hover:text-amber-300 transition-colors">
                Open Admin Panel →
              </span>
            </Link>
          )}
        </section>

        {/* Footer tagline */}
        <p className="mt-16 text-center text-xs font-mono text-slate-600 animate-fade-in-up [animation-delay:0.45s]">
          Powered by NASA Exoplanet Archive &middot; Built with Next.js + Prisma
        </p>
      </main>
    </div>
  );
}
