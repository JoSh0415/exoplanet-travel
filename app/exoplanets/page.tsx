"use client";

import { Suspense, useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchExoplanets, Exoplanet, Paginated } from "../lib/api";
import Navbar from "../components/Navbar";

type Sort = "distance" | "discoveryYear" | "name";
type Order = "asc" | "desc";

const PAGE_SIZES = [12, 24, 48] as const;
const VIBES = [
  "",
  "Mysterious",
  "Habitable Paradise",
  "Molten Rock",
  "Sauna World",
  "Ice World",
  "Gas Giant",
  "Hot Jupiter",
  "Literal Hellscape",
  "Barren Wasteland",
];

const VIBE_CONFIG: Record<string, { emoji: string; color: string; bg: string; effect?: string }> = {
  "Mysterious": { 
    emoji: "🌑", 
    color: "text-purple-400", 
    bg: "from-slate-900 via-purple-900/40 to-indigo-900",
    effect: "bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.15),transparent_50%)]"
  },
  "Habitable Paradise": { 
    emoji: "🌍", 
    color: "text-emerald-400", 
    bg: "from-sky-900/40 via-emerald-900/40 to-teal-900/60",
    effect: "bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30 mix-blend-overlay"
  },
  "Molten Rock": { 
    emoji: "🌋", 
    color: "text-red-400", 
    bg: "from-red-950 via-orange-900/40 to-red-900",
    effect: "bg-[radial-gradient(circle_at_bottom,rgba(239,68,68,0.3),transparent_60%)] animate-pulse"
  },
  "Sauna World": { 
    emoji: "♨️", 
    color: "text-orange-400", 
    bg: "from-orange-950 via-amber-900/40 to-yellow-900/30",
    effect: "bg-[linear-gradient(to_top,rgba(251,191,36,0.1),transparent)]"
  },
  "Ice World": { 
    emoji: "🧊", 
    color: "text-cyan-400", 
    bg: "from-cyan-950 via-sky-900/40 to-blue-900",
    effect: "bg-[linear-gradient(45deg,rgba(255,255,255,0.05)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.05)_75%,transparent_75%,transparent)] bg-[size:20px_20px]"
  },
  "Gas Giant": { 
    emoji: "🪐", 
    color: "text-fuchsia-400", 
    bg: "from-indigo-950 via-purple-900/40 to-fuchsia-900",
    effect: "bg-[repeating-linear-gradient(0deg,transparent,transparent_10px,rgba(192,132,252,0.05)_10px,rgba(192,132,252,0.05)_20px)]"
  },
  "Hot Jupiter": { 
    emoji: "🔥", 
    color: "text-amber-500", 
    bg: "from-orange-950 via-red-900/40 to-amber-900",
    effect: "bg-[conic-gradient(from_0deg,transparent,rgba(245,158,11,0.1),transparent)] animate-[spin_10s_linear_infinite]"
  },
  "Literal Hellscape": { 
    emoji: "💀", 
    color: "text-rose-600", 
    bg: "from-black via-red-950/60 to-black",
    effect: "bg-[radial-gradient(circle_at_center,rgba(225,29,72,0.2),transparent_70%)] animate-pulse"
  },
  "Barren Wasteland": { 
    emoji: "🏜️", 
    color: "text-stone-400", 
    bg: "from-stone-950 via-stone-900/40 to-neutral-900",
    effect: "bg-[radial-gradient(circle,rgba(168,162,158,0.1)_1px,transparent_1px)] bg-[size:16px_16px]"
  },
};

const DEFAULT_VIBE = { emoji: "✨", color: "text-blue-400", bg: "from-slate-900 via-blue-900/20 to-slate-900", effect: "" };

function numOrEmpty(v: string | null) {
  if (!v) return "";
  const n = Number(v);
  return Number.isFinite(n) ? n : "";
}

function formatDistance(d: number) {
  if (d >= 1000) return `${(d / 1000).toFixed(1)}k`;
  if (d >= 100) return d.toFixed(0);
  return d.toFixed(1);
}

function _tempLabel(k: number | null | undefined) {
  if (k == null) return null;
  if (k < 200) return "Freezing";
  if (k < 280) return "Cold";
  if (k < 310) return "Mild";
  if (k < 400) return "Warm";
  if (k < 700) return "Hot";
  return "Extreme";
}

function _gravLabel(g: number | null | undefined) {
  if (g == null) return null;
  if (g < 0.5) return "Micro";
  if (g < 0.9) return "Low";
  if (g < 1.2) return "Earth-like";
  if (g < 2) return "Strong";
  if (g < 5) return "Intense";
  return "Crushing";
}

void _tempLabel;
void _gravLabel;

export default function ExoplanetsPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 24, color: "#555a6e" }}>Loading destinations…</div>
      </div>
    }>
      <ExoplanetsContent />
    </Suspense>
  );
}

function ExoplanetsContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const initial = useMemo(() => {
    const page = Number(sp.get("page") ?? "1");
    const pageSize = Number(sp.get("pageSize") ?? "12");

    return {
      page: Number.isFinite(page) && page >= 1 ? page : 1,
      pageSize: PAGE_SIZES.includes(pageSize as (typeof PAGE_SIZES)[number]) ? pageSize : 12,
      q: sp.get("q") ?? "",
      vibe: sp.get("vibe") ?? "",
      minDistance: numOrEmpty(sp.get("minDistance")),
      maxDistance: numOrEmpty(sp.get("maxDistance")),
      sort: (sp.get("sort") as Sort) ?? "distance",
      order: (sp.get("order") as Order) ?? "asc",
    };
  }, [sp]);

  const [form, setForm] = useState(initial);
  const [data, setData] = useState<Paginated<Exoplanet> | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => setForm(initial), [initial]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetchExoplanets({
          page: initial.page,
          pageSize: initial.pageSize,
          q: initial.q || undefined,
          vibe: initial.vibe || undefined,
          minDistance: initial.minDistance === "" ? undefined : Number(initial.minDistance),
          maxDistance: initial.maxDistance === "" ? undefined : Number(initial.maxDistance),
          sort: initial.sort,
          order: initial.order,
        });
        if (!cancelled) setData(res);
      } catch (e: unknown) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [initial]);

  const pushParams = useCallback(
    (next: Partial<typeof form>) => {
      const merged = { ...form, ...next };
      const params = new URLSearchParams();

      params.set("page", String(merged.page));
      params.set("pageSize", String(merged.pageSize));
      if (merged.q) params.set("q", merged.q);
      if (merged.vibe) params.set("vibe", merged.vibe);
      if (merged.minDistance !== "") params.set("minDistance", String(merged.minDistance));
      if (merged.maxDistance !== "") params.set("maxDistance", String(merged.maxDistance));
      params.set("sort", merged.sort);
      params.set("order", merged.order);

      router.push(`/exoplanets?${params.toString()}`);
    },
    [form, router],
  );

  function onApplyFilters() {
    pushParams({ ...form, page: 1 });
  }

  function onClear() {
    router.push("/exoplanets?page=1&pageSize=12&sort=distance&order=asc");
  }

  function onSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") onApplyFilters();
  }

  const canPrev = (data?.page ?? 1) > 1;
  const canNext = data ? data.page < data.totalPages : false;
  const activeFilterCount = [form.q, form.vibe, form.minDistance !== "" ? form.minDistance : "", form.maxDistance !== "" ? form.maxDistance : ""].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-[#050510] text-slate-200 font-sans selection:bg-cyan-500/30 overflow-x-hidden relative">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(17,24,39,1),rgba(5,5,16,1))]"></div>
        <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-indigo-900/20 to-transparent opacity-30"></div>
        <div className="absolute bottom-0 left-0 right-0 h-[500px] bg-gradient-to-t from-cyan-900/10 to-transparent opacity-20"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_70%)]"></div>
      </div>

      <Navbar />

      <main className="relative z-10 max-w-7xl mx-auto px-6 pb-24 pt-12 md:pt-20">
        <header className="mb-16 text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/50 border border-slate-700/50 text-xs font-mono text-cyan-400 mb-6 backdrop-blur-sm animate-fade-in-up">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            SYSTEM ONLINE // READY TO EXPLORE
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 bg-gradient-to-b from-white via-white to-slate-500 bg-clip-text text-transparent drop-shadow-sm animate-fade-in-up [animation-delay:100ms]">
            Exoplanet <br className="md:hidden" />
            <span className="text-cyan-400/90 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]">Travel </span>
            <span className="text-indigo-400/90 drop-shadow-[0_0_15px_rgba(129,140,248,0.5)]">Agency</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed animate-fade-in-up [animation-delay:200ms]">
            Discover extraordinary worlds beyond our solar system. curated destinations for the discerning interstellar traveler.
          </p>
        </header>

        <section className="mb-12 animate-fade-in-up [animation-delay:300ms]">
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 md:p-6 shadow-2xl shadow-indigo-500/5">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-cyan-400 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </div>
                <input
                  ref={searchRef}
                  value={form.q}
                  onChange={(e) => setForm((f) => ({ ...f, q: e.target.value }))}
                  onKeyDown={onSearchKeyDown}
                  placeholder="Search sector, name, or designation..."
                  className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-mono text-sm"
                />
              </div>
              
              <div className="flex gap-2 w-full md:w-auto">
                <button
                  onClick={() => setFiltersOpen((o) => !o)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl border transition-all text-sm font-medium whitespace-nowrap flex-1 md:flex-none justify-center
                    ${filtersOpen ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200'}`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>
                  Filters
                  {activeFilterCount > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-cyan-500 text-black text-[10px] font-bold">{activeFilterCount}</span>}
                </button>
                
                <div className="relative group min-w-[160px] hidden md:block">
                   <select
                    value={`${form.sort}-${form.order}`}
                    onChange={(e) => {
                      const [s, o] = e.target.value.split("-") as [Sort, Order];
                      setForm((f) => ({ ...f, sort: s, order: o }));
                      pushParams({ sort: s, order: o, page: 1 });
                    }}
                    className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-10 text-sm text-slate-300 focus:outline-none focus:border-cyan-500/50 cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    <option value="distance-asc" className="bg-slate-900">Nearest First</option>
                    <option value="distance-desc" className="bg-slate-900">Farthest First</option>
                    <option value="name-asc" className="bg-slate-900">Name (A-Z)</option>
                    <option value="name-desc" className="bg-slate-900">Name (Z-A)</option>
                    <option value="discoveryYear-desc" className="bg-slate-900">Newest Discovery</option>
                    <option value="discoveryYear-asc" className="bg-slate-900">Oldest Discovery</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:hidden mt-3 relative group">
                <select
                value={`${form.sort}-${form.order}`}
                onChange={(e) => {
                  const [s, o] = e.target.value.split("-") as [Sort, Order];
                  setForm((f) => ({ ...f, sort: s, order: o }));
                  pushParams({ sort: s, order: o, page: 1 });
                }}
                className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-10 text-sm text-slate-300 focus:outline-none focus:border-cyan-500/50 cursor-pointer"
              >
                <option value="distance-asc" className="bg-slate-900">Sort: Nearest</option>
                <option value="distance-desc" className="bg-slate-900">Sort: Farthest</option>
                <option value="name-asc" className="bg-slate-900">Sort: Name (A-Z)</option>
                <option value="name-desc" className="bg-slate-900">Sort: Name (Z-A)</option>
                <option value="discoveryYear-desc" className="bg-slate-900">Sort: Newest</option>
                <option value="discoveryYear-asc" className="bg-slate-900">Sort: Oldest</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
            </div>

            {filtersOpen && (
              <div className="mt-6 pt-6 border-t border-white/10 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  <div className="lg:col-span-3">
                    <h3 className="text-xs font-mono font-bold text-slate-500 uppercase mb-4 tracking-wider">Atmosphere / Vibe</h3>
                    <div className="flex flex-wrap gap-2">
                      {VIBES.map((v) => (
                        <button
                          key={v}
                          onClick={() => {
                            const next = form.vibe === v ? "" : v;
                            setForm((f) => ({ ...f, vibe: next }));
                          }}
                          className={`px-4 py-2 rounded-lg text-sm transition-all border ${
                            form.vibe === v && v !== ""
                              ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_-3px_rgba(6,182,212,0.3)]"
                              : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200 hover:border-white/20"
                          } ${v === "" ? "font-medium" : ""}`}
                        >
                          {v === "" ? "All Frequencies" : (
                            <span className="flex items-center gap-2">
                              <span>{VIBE_CONFIG[v]?.emoji}</span>
                              {v}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-xs font-mono font-bold text-slate-500 uppercase mb-2 tracking-wider">Distance Range (ly)</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative group">
                        <label className="absolute -top-2.5 left-2 bg-slate-900 px-1 text-[10px] text-slate-500 group-focus-within:text-cyan-400">MIN</label>
                        <input
                          type="number"
                          value={form.minDistance}
                          onChange={(e) => setForm((f) => ({ ...f, minDistance: e.target.value === "" ? "" : Number(e.target.value) }))}
                          placeholder="0"
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono focus:border-cyan-500/50 focus:outline-none transition-colors"
                        />
                      </div>
                      <div className="relative group">
                        <label className="absolute -top-2.5 left-2 bg-slate-900 px-1 text-[10px] text-slate-500 group-focus-within:text-cyan-400">MAX</label>
                        <input
                          type="number"
                          value={form.maxDistance}
                          onChange={(e) => setForm((f) => ({ ...f, maxDistance: e.target.value === "" ? "" : Number(e.target.value) }))}
                          placeholder="∞"
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono focus:border-cyan-500/50 focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-white/5">
                  <button onClick={onClear} className="px-4 py-2 text-sm text-slate-500 hover:text-white transition-colors">Reset System</button>
                  <button onClick={onApplyFilters} className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all transform hover:-translate-y-0.5">
                    Update Scanners
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {data && !loading && !err && (
          <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-8 gap-4 px-2">
             <div className="text-sm font-mono text-slate-500">
                <span className="text-cyan-400 font-bold">{data.total}</span> SIGNALS DETECTED
                {form.q && <span className="ml-2 text-slate-600">{/* QUERY: */}&quot;{form.q}&quot;</span>}
             </div>
             <div className="flex items-center gap-4 text-xs font-mono text-slate-600 bg-slate-900/50 px-3 py-1.5 rounded-full border border-white/5">
                <span>PAGE {data.page} / {data.totalPages}</span>
             </div>
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-[280px] rounded-2xl bg-white/5 animate-pulse border border-white/5"></div>
            ))}
          </div>
        )}

        {err && (
          <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-8 text-center max-w-md mx-auto mt-12 backdrop-blur-sm">
            <svg className="w-12 h-12 text-red-500 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <h3 className="text-red-400 font-mono text-lg font-bold mb-2">SYSTEM ERROR</h3>
            <p className="text-red-200/60 text-sm mb-6">{err}</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded border border-red-500/30 transition-colors text-sm">RETRY CONNECTION</button>
          </div>
        )}

        {!loading && !err && data && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {data.items.length === 0 ? (
              <div className="col-span-full py-24 text-center">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white/5 mb-6 text-4xl animate-pulse">
                  📡
                </div>
                <h3 className="text-2xl font-bold text-slate-200 mb-2">No Signals Found</h3>
                <p className="text-slate-500 max-w-md mx-auto mb-8">Your scanning parameters yielded no results in this sector. Try adjusting your filter configuration.</p>
                <button onClick={onClear} className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all">Reset Parameters</button>
              </div>
            ) : (
              data.items.map((p) => {
                const vc = VIBE_CONFIG[p.vibe ?? ""] ?? DEFAULT_VIBE;
                
                let tempState = "normal";
                if (p.temperature && p.temperature > 800) tempState = "hot";
                else if (p.temperature && p.temperature < 200) tempState = "cold";
                
                const gravityWeight = p.gravity && p.gravity > 2 ? "heavy" : (p.gravity && p.gravity < 0.8 ? "light" : "normal");
                
                return (
                  <a
                    href={`/exoplanets/${p.id}`}
                    key={p.id}
                    className={`group relative bg-slate-900/40 backdrop-blur-md rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-2 block h-full flex flex-col
                      ${gravityWeight === 'heavy' ? 'border-b-4 border-slate-700 hover:border-b-cyan-500' : 'border border-white/10 hover:border-cyan-500/50'}
                      ${gravityWeight === 'light' ? 'shadow-[0_10px_30px_-10px_rgba(6,182,212,0.1)] hover:shadow-[0_20px_40px_-5px_rgba(6,182,212,0.2)]' : 'hover:shadow-[0_0_30px_-10px_rgba(6,182,212,0.3)]'}
                    `}
                  >
                    <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="flex gap-1">
                        <div className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse"></div>
                        <div className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse delay-75"></div>
                        <div className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse delay-150"></div>
                      </div>
                    </div>

                    <div className={`h-40 relative overflow-hidden bg-gradient-to-br ${vc.bg} p-6 flex items-center justify-center group-hover:scale-105 transition-transform duration-700`}>
                      <div className={`absolute inset-0 z-0 opacity-50 ${vc.effect || ''}`}></div>
                      
                      {tempState === "hot" && (
                         <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(239,68,68,0.2),transparent_70%)] animate-pulse z-1"></div>
                      )}
                      {tempState === "cold" && (
                         <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px] opacity-20 [mask-image:linear-gradient(to_bottom,transparent,black)] z-1"></div>
                      )}
                      
                      <div className="relative z-10">
                        {gravityWeight === 'heavy' && (
                          <div className="absolute inset-[-20%] border border-white/10 rounded-full animate-[spin_8s_linear_infinite] opacity-40 hover:opacity-100 transition-opacity"></div>
                        )}
                        
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center text-5xl shadow-2xl relative group-hover:scale-110 transition-transform duration-500
                          ${tempState === 'hot' ? 'shadow-red-500/20' : tempState === 'cold' ? 'shadow-cyan-500/20' : 'shadow-black/50'}
                        `}>
                           {vc.emoji}
                           <div className="absolute inset-0 rounded-full shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]"></div>
                           
                           <div className={`absolute -inset-4 rounded-full blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-700 ${vc.color.replace('text', 'bg').replace('400', '500')}`}></div>
                        </div>
                      </div>
                      
                      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 bg-repeat bg-[length:100px] mix-blend-overlay"></div>
                      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                    </div>
                    
                    <div className="p-5 flex-1 flex flex-col relative">
                      <div className="absolute left-0 top-6 w-1 h-8 bg-gradient-to-b from-transparent via-cyan-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                      <div className="mb-5">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-xl font-bold text-slate-100 group-hover:text-cyan-400 transition-colors leading-tight">{p.name}</h3>
                          {p.discoveryYear && (
                            <div className="text-[10px] font-mono text-slate-500 border border-white/10 px-1.5 py-0.5 rounded group-hover:border-cyan-500/30 group-hover:text-cyan-400/70 transition-colors">
                              {p.discoveryYear}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mt-2">
                           <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border bg-opacity-10 backdrop-blur-sm ${vc.color.replace('text', 'border').replace('400', '500')} ${vc.color}`}>
                             {p.vibe || "UNCLASSIFIED"}
                           </span>
                           {gravityWeight === 'heavy' && (
                             <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-purple-500/30 bg-purple-500/10 text-purple-400">HIGH G</span>
                           )}
                           {gravityWeight === 'light' && (
                             <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-blue-500/30 bg-blue-500/10 text-blue-400">LOW G</span>
                           )}
                           {p.distance < 20 && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-green-500/30 bg-green-500/10 text-green-400">NEARBY</span>
                           )}
                           {p.distance > 1000 && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-slate-500/30 bg-slate-500/10 text-slate-400">DEEP SPACE</span>
                           )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-0.5 bg-white/5 rounded-lg overflow-hidden border border-white/5 mb-5 font-mono">
                         <div className="bg-slate-900/50 p-2 text-center group-hover:bg-slate-900/80 transition-colors">
                            <div className="text-[9px] text-slate-500 uppercase mb-0.5">Dist</div>
                            <div className="text-xs text-slate-300">{formatDistance(p.distance)}</div>
                         </div>
                         <div className="bg-slate-900/50 p-2 text-center group-hover:bg-slate-900/80 transition-colors border-l border-white/5">
                            <div className="text-[9px] text-slate-500 uppercase mb-0.5">Temp</div>
                            <div className={`text-xs ${tempState === 'hot' ? 'text-orange-400' : tempState === 'cold' ? 'text-cyan-300' : 'text-emerald-400'}`}>
                               {p.temperature ? `${(p.temperature - 273.15).toFixed(0)}°C` : '-'}
                            </div>
                         </div>
                         <div className="bg-slate-900/50 p-2 text-center group-hover:bg-slate-900/80 transition-colors border-l border-white/5">
                            <div className="text-[9px] text-slate-500 uppercase mb-0.5">Grav</div>
                            <div className={`text-xs ${gravityWeight === 'heavy' ? 'text-purple-400' : gravityWeight === 'light' ? 'text-blue-300' : 'text-slate-300'}`}>
                               {p.gravity ? `${p.gravity}G` : '-'}
                            </div>
                         </div>
                      </div>
                      
                      <div className="mt-auto flex items-center justify-between opacity-60 group-hover:opacity-100 transition-opacity duration-300">
                         <span className="text-[10px] text-cyan-500/70 font-mono tracking-widest typing-cursor">:: ACCESS_DATA</span>
                         <span className="text-cyan-400 transform translate-x-[-10px] opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                         </span>
                      </div>
                    </div>
                  </a>
                );
              })
            )}
          </div>
        )}

        {!loading && !err && data && data.totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-16 pb-12">
            <button
               disabled={!canPrev}
               onClick={() => pushParams({ page: (data.page ?? 1) - 1 })}
               className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            
            <div className="flex items-center">
            {Array.from({ length: data.totalPages }, (_, i) => i + 1)
                    .filter((p) => {
                      if (data.totalPages <= 7) return true;
                      if (p === 1 || p === data.totalPages) return true;
                      if (Math.abs(p - data.page) <= 1) return true;
                      return false;
                    })
                    .reduce<(number | "dots")[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("dots");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((item, idx) =>
                      item === "dots" ? (
                        <span key={`dots-${idx}`} className="w-8 text-center text-slate-600">...</span>
                      ) : (
                        <button
                          key={item}
                          onClick={() => pushParams({ page: item })}
                          className={`w-10 h-10 flex items-center justify-center rounded-xl font-mono text-sm transition-all mx-1 border
                            ${item === data.page
                              ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400 font-bold shadow-[0_0_15px_-5px_rgba(6,182,212,0.4)]"
                              : "bg-transparent border-transparent text-slate-500 hover:bg-white/5 hover:text-slate-300"
                            }`}
                        >
                          {item}
                        </button>
                      ),
                    )}
            </div>

            <button
               disabled={!canNext}
               onClick={() => pushParams({ page: (data.page ?? 1) + 1 })}
               className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

