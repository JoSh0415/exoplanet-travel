"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../lib/AuthContext";
import Navbar from "../../components/Navbar";
import {
  fetchImportRuns,
  refreshExoplanets,
  DataImportRun,
  Paginated,
  RefreshResult,
} from "../../lib/api";

/* ─── Helpers ─── */
function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ─── Toast banner ─── */
function Toast({
  result,
  onDismiss,
}: {
  result: RefreshResult;
  onDismiss: () => void;
}) {
  const isError = !!result.errorMessage;
  return (
    <div
      className={`mb-6 p-4 rounded-xl border flex items-start gap-3 ${
        isError
          ? "bg-amber-500/10 border-amber-500/20"
          : "bg-emerald-500/10 border-emerald-500/20"
      }`}
    >
      <span className="text-lg mt-0.5">{isError ? "⚠️" : "✅"}</span>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-semibold ${
            isError ? "text-amber-400" : "text-emerald-400"
          }`}
        >
          {result.message}
        </p>
        <p className="text-xs font-mono text-slate-500 mt-1">
          Inserted: {result.insertedCount} · Updated: {result.updatedCount} ·
          Retrieved at: {fmtDate(result.retrievedAt)}
        </p>
        {result.errorMessage && (
          <p className="text-xs font-mono text-amber-400/70 mt-1 break-all">
            {result.errorMessage}
          </p>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="text-slate-600 hover:text-slate-400 transition-colors text-lg leading-none"
      >
        ×
      </button>
    </div>
  );
}

/* ─── Expandable row cell ─── */
function ExpandableCell({ text, label }: { text: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setOpen((o) => !o)}
          className="text-[10px] font-mono text-cyan-500 hover:text-cyan-400 transition-colors"
        >
          {open ? `▾ Hide ${label}` : `▸ Show ${label}`}
        </button>
        <button
          onClick={copy}
          className="text-[10px] font-mono text-slate-600 hover:text-slate-400 transition-colors"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      {open && (
        <pre className="mt-1 text-[10px] font-mono text-slate-400 bg-white/[0.03] border border-white/[0.06] rounded-lg p-2 overflow-x-auto max-w-xs sm:max-w-md whitespace-pre-wrap break-all">
          {text}
        </pre>
      )}
    </div>
  );
}

/* ─── Main page ─── */
export default function AdminImportsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [data, setData] = useState<Paginated<DataImportRun> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<RefreshResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchImportRuns({ page, pageSize });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load import runs");
    } finally {
      setLoading(false);
    }
  }, [page]);

  /* Auth guard */
  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  /* Fetch data */
  useEffect(() => {
    if (user) load();
  }, [user, load]);

  /* Forbidden check */
  if (!authLoading && user && user.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-[#06070a] relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
        </div>
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

  /* Refresh handler */
  const handleRefresh = async () => {
    setRefreshing(true);
    setToast(null);
    try {
      const result = await refreshExoplanets();
      setToast(result);
      // Reload table to show new run
      setPage(1);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#06070a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

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
          <div className="flex items-center gap-2 text-xs font-mono text-slate-600 mb-3">
            <Link href="/admin" className="hover:text-cyan-400 transition-colors">
              Admin
            </Link>
            <span>/</span>
            <span className="text-slate-400">Import Runs</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-2xl">🛰️</span>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  NASA Import Runs
                </h1>
              </div>
              <p className="text-sm text-slate-500 font-mono">
                Data provenance log — every dataset refresh from NASA&apos;s Exoplanet Archive
              </p>
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl shadow-md shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none shrink-0"
            >
              {refreshing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Refreshing…
                </>
              ) : (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                  Refresh NASA Dataset
                </>
              )}
            </button>
          </div>
        </div>

        {/* Toast */}
        {toast && <Toast result={toast} onDismiss={() => setToast(null)} />}

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between gap-3">
            <span className="text-rose-400 text-sm font-mono">{error}</span>
            <button
              onClick={() => {
                setError(null);
                load();
              }}
              className="shrink-0 px-3 py-1 text-xs font-mono text-rose-400 border border-rose-500/30 rounded-lg hover:bg-rose-500/10 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !data && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {data && data.items.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🛸</div>
            <h2 className="text-xl font-semibold text-slate-300 mb-2">No import runs yet</h2>
            <p className="text-slate-500 text-sm mb-6">
              Click &quot;Refresh NASA Dataset&quot; to trigger the first import.
            </p>
          </div>
        )}

        {/* Import runs table */}
        {data && data.items.length > 0 && (
          <>
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
              {/* Table header */}
              <div className="hidden md:grid md:grid-cols-[1fr_80px_80px_80px_1fr] gap-4 px-5 py-3 border-b border-white/[0.06] text-[10px] font-mono text-slate-600 uppercase tracking-wider">
                <span>Retrieved At</span>
                <span>Inserted</span>
                <span>Updated</span>
                <span>Status</span>
                <span>Details</span>
              </div>

              {/* Rows */}
              {data.items.map((run) => {
                const isError = !!run.errorMessage;
                return (
                  <div
                    key={run.id}
                    className="grid grid-cols-1 md:grid-cols-[1fr_80px_80px_80px_1fr] gap-2 md:gap-4 px-5 py-4 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors last:border-b-0"
                  >
                    {/* Retrieved At */}
                    <div>
                      <span className="md:hidden text-[10px] font-mono text-slate-600 uppercase block mb-0.5">
                        Retrieved At
                      </span>
                      <span className="text-xs font-mono text-slate-300">
                        {fmtDate(run.retrievedAt)}
                      </span>
                      <span className="block text-[10px] font-mono text-slate-600 mt-0.5">
                        {run.sourceName}
                      </span>
                    </div>

                    {/* Inserted */}
                    <div>
                      <span className="md:hidden text-[10px] font-mono text-slate-600 uppercase block mb-0.5">
                        Inserted
                      </span>
                      <span className="text-xs font-mono text-emerald-400">
                        +{run.insertedCount}
                      </span>
                    </div>

                    {/* Updated */}
                    <div>
                      <span className="md:hidden text-[10px] font-mono text-slate-600 uppercase block mb-0.5">
                        Updated
                      </span>
                      <span className="text-xs font-mono text-amber-400">
                        ~{run.updatedCount}
                      </span>
                    </div>

                    {/* Status */}
                    <div>
                      <span className="md:hidden text-[10px] font-mono text-slate-600 uppercase block mb-0.5">
                        Status
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono border rounded-full ${
                          isError
                            ? "bg-amber-400/10 border-amber-400/20 text-amber-400"
                            : "bg-emerald-400/10 border-emerald-400/20 text-emerald-400"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isError ? "bg-amber-400" : "bg-emerald-400"
                          }`}
                        />
                        {isError ? "Partial" : "Success"}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="space-y-1">
                      <ExpandableCell text={run.tapQuery} label="TAP Query" />
                      {run.errorMessage && (
                        <ExpandableCell text={run.errorMessage} label="Error" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
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
