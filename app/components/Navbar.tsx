"use client";

import Link from "next/link";
import { useAuth } from "../lib/AuthContext";

export default function Navbar() {
  const { user, loading, logout } = useAuth();

  return (
    <nav className="relative z-20 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
      <Link
        href="/exoplanets"
        className="flex items-center gap-2 group"
      >
        <span className="text-xl group-hover:scale-110 transition-transform">🚀</span>
        <span className="text-sm font-bold tracking-tight text-slate-300 group-hover:text-white transition-colors hidden sm:inline">
          Exoplanet Travel
        </span>
      </Link>

      <div className="flex items-center gap-3">
        {loading ? (
          <div className="w-20 h-8 rounded-lg bg-white/5 animate-pulse" />
        ) : user ? (
          <>
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-500 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300">{user.name || user.email}</span>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-slate-500 hover:text-rose-400 bg-white/5 border border-white/10 hover:border-rose-500/30 rounded-lg transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" x2="9" y1="12" y2="12"/>
              </svg>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg shadow-md shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all hover:-translate-y-0.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
              <polyline points="10 17 15 12 10 7"/>
              <line x1="15" x2="3" y1="12" y2="12"/>
            </svg>
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}
