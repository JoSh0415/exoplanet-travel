"use client";

import { useEffect, useState } from "react";
import { createBooking, fetchExoplanet, Exoplanet } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import Link from "next/link";
import Navbar from "../../components/Navbar";

const VIBE_CONFIG: Record<string, { emoji: string; color: string; bg: string; effect?: string; description: string }> = {
  "Mysterious": {
    emoji: "🌑",
    color: "text-purple-400",
    bg: "from-slate-900 via-purple-900/40 to-indigo-900",
    effect: "bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.15),transparent_50%)]",
    description: "Shrouded in enigma, this world defies conventional classification. Anomalous readings suggest phenomena beyond current scientific understanding.",
  },
  "Habitable Paradise": {
    emoji: "🌍",
    color: "text-emerald-400",
    bg: "from-sky-900/40 via-emerald-900/40 to-teal-900/60",
    effect: "bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30 mix-blend-overlay",
    description: "A rare jewel — temperate climate, breathable atmosphere probability, and conditions reminiscent of Earth. Perfect for extended stays.",
  },
  "Molten Rock": {
    emoji: "🌋",
    color: "text-red-400",
    bg: "from-red-950 via-orange-900/40 to-red-900",
    effect: "bg-[radial-gradient(circle_at_bottom,rgba(239,68,68,0.3),transparent_60%)] animate-pulse",
    description: "A violent world of magma oceans and volcanic tempests. Surface temperatures can melt most known alloys. Extreme-rated destination.",
  },
  "Sauna World": {
    emoji: "♨️",
    color: "text-orange-400",
    bg: "from-orange-950 via-amber-900/40 to-yellow-900/30",
    effect: "bg-[linear-gradient(to_top,rgba(251,191,36,0.1),transparent)]",
    description: "Dense, humid atmosphere with perpetual cloud cover. Surface conditions resemble a planetary-scale steam room. Pack light clothing.",
  },
  "Ice World": {
    emoji: "🧊",
    color: "text-cyan-400",
    bg: "from-cyan-950 via-sky-900/40 to-blue-900",
    effect: "bg-[linear-gradient(45deg,rgba(255,255,255,0.05)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.05)_75%,transparent_75%,transparent)] bg-[size:20px_20px]",
    description: "A frozen wonderland of crystalline landscapes and sub-zero beauty. Cryogenic suit required. Aurora displays are breathtaking.",
  },
  "Gas Giant": {
    emoji: "🪐",
    color: "text-fuchsia-400",
    bg: "from-indigo-950 via-purple-900/40 to-fuchsia-900",
    effect: "bg-[repeating-linear-gradient(0deg,transparent,transparent_10px,rgba(192,132,252,0.05)_10px,rgba(192,132,252,0.05)_20px)]",
    description: "Massive atmospheric world with swirling bands of exotic gases. Orbital viewing platforms offer unparalleled panoramas. No landing possible.",
  },
  "Hot Jupiter": {
    emoji: "🔥",
    color: "text-amber-500",
    bg: "from-orange-950 via-red-900/40 to-amber-900",
    effect: "bg-[conic-gradient(from_0deg,transparent,rgba(245,158,11,0.1),transparent)] animate-[spin_10s_linear_infinite]",
    description: "A scorching gas giant locked in a tight orbit around its star. Extreme radiation and magnetic storms make this a flyby-only destination.",
  },
  "Literal Hellscape": {
    emoji: "💀",
    color: "text-rose-600",
    bg: "from-black via-red-950/60 to-black",
    effect: "bg-[radial-gradient(circle_at_center,rgba(225,29,72,0.2),transparent_70%)] animate-pulse",
    description: "The most hostile environment catalogued. Acidic atmosphere, crushing pressure, and temperatures that vaporize on contact. For the truly fearless.",
  },
  "Barren Wasteland": {
    emoji: "🏜️",
    color: "text-stone-400",
    bg: "from-stone-950 via-stone-900/40 to-neutral-900",
    effect: "bg-[radial-gradient(circle,rgba(168,162,158,0.1)_1px,transparent_1px)] bg-[size:16px_16px]",
    description: "Desolate but hauntingly beautiful. Wind-carved formations and endless plains under an alien sky. Ideal for solitude seekers.",
  },
};

const DEFAULT_VIBE = {
  emoji: "✨",
  color: "text-blue-400",
  bg: "from-slate-900 via-blue-900/20 to-slate-900",
  effect: "",
  description: "An unclassified world waiting to be explored. Limited data available — expect the unexpected.",
};

const TRAVEL_CLASSES = [
  {
    id: "Economy (Cryo-Sleep)",
    name: "Economy",
    subtitle: "Cryo-Sleep",
    icon: "❄️",
    price: "From $2,400",
    perks: ["Cryo-pod cabin", "Basic nutrition IV", "Arrival shuttle"],
    color: "border-slate-500/30 hover:border-slate-400/50",
    selected: "border-cyan-500/60 bg-cyan-500/5 shadow-[0_0_20px_-5px_rgba(6,182,212,0.3)]",
  },
  {
    id: "Business (Ion Cabin)",
    name: "Business",
    subtitle: "Ion Cabin",
    icon: "⚡",
    price: "From $18,000",
    perks: ["Private ion cabin", "Zero-G lounge access", "Gourmet synthesizer", "Priority landing"],
    color: "border-indigo-500/30 hover:border-indigo-400/50",
    selected: "border-indigo-500/60 bg-indigo-500/5 shadow-[0_0_20px_-5px_rgba(99,102,241,0.3)]",
  },
  {
    id: "First Class (Warp Drive)",
    name: "First Class",
    subtitle: "Warp Drive",
    icon: "🚀",
    price: "From $120,000",
    perks: ["Warp-speed suite", "Panoramic viewport", "Personal AI steward", "Chromatic dining", "Direct orbital insertion"],
    color: "border-amber-500/30 hover:border-amber-400/50",
    selected: "border-amber-500/60 bg-amber-500/5 shadow-[0_0_20px_-5px_rgba(245,158,11,0.3)]",
  },
] as const;

function kelvinToCelsius(k: number | null | undefined) {
  if (k == null) return null;
  return Math.round(k - 273.15);
}

function tempCategory(k: number | null | undefined) {
  if (k == null) return { label: "Unknown", color: "text-slate-400" };
  if (k < 200) return { label: "Freezing", color: "text-cyan-300" };
  if (k < 280) return { label: "Cold", color: "text-blue-300" };
  if (k < 310) return { label: "Mild", color: "text-emerald-400" };
  if (k < 400) return { label: "Warm", color: "text-amber-300" };
  if (k < 700) return { label: "Hot", color: "text-orange-400" };
  return { label: "Extreme", color: "text-red-400" };
}

function gravCategory(g: number | null | undefined) {
  if (g == null) return { label: "Unknown", color: "text-slate-400" };
  if (g < 0.5) return { label: "Micro-G", color: "text-blue-300" };
  if (g < 0.9) return { label: "Low", color: "text-sky-300" };
  if (g < 1.2) return { label: "Earth-like", color: "text-emerald-400" };
  if (g < 2) return { label: "Strong", color: "text-amber-400" };
  if (g < 5) return { label: "Intense", color: "text-orange-400" };
  return { label: "Crushing", color: "text-red-400" };
}

function travelTime(distance: number, travelClass: string) {
  const speedFactor = travelClass.includes("Warp") ? 100 : travelClass.includes("Ion") ? 10 : 1;
  const years = distance / speedFactor;
  if (years < 1) return `${Math.round(years * 12)} months`;
  if (years < 100) return `${years.toFixed(1)} years`;
  return `${Math.round(years).toLocaleString()} years`;
}

function habitabilityScore(planet: Exoplanet) {
  let score = 50;
  if (planet.temperature != null) {
    if (planet.temperature >= 260 && planet.temperature <= 320) score += 30;
    else if (planet.temperature >= 200 && planet.temperature <= 400) score += 15;
    else score -= 10;
  }
  if (planet.gravity != null) {
    if (planet.gravity >= 0.7 && planet.gravity <= 1.5) score += 20;
    else if (planet.gravity >= 0.3 && planet.gravity <= 3) score += 5;
    else score -= 15;
  }
  if (planet.vibe === "Habitable Paradise") score += 20;
  if (planet.vibe === "Literal Hellscape") score -= 30;
  if (planet.vibe === "Molten Rock") score -= 20;
  return Math.max(0, Math.min(100, score));
}

export default function ExoplanetDetailsClient({ id }: { id: string }) {
  const { user } = useAuth();
  const [planet, setPlanet] = useState<Exoplanet | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [step, setStep] = useState(0);
  const [travelClass, setTravelClass] = useState<string>(TRAVEL_CLASSES[0].id);
  const [departureDate, setDepartureDate] = useState("");
  const [passengers, setPassengers] = useState(1);
  const [bookingStatus, setBookingStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [bookingMsg, setBookingMsg] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);

  // Step validation: determine which steps are completed
  const step0Complete = !!travelClass;
  const step1Complete = !!departureDate && passengers >= 1;

  function goToStep(target: number) {
    // Can only go forward if previous steps are complete
    if (target === 0) { setStep(0); return; }
    if (target === 1 && step0Complete) { setStep(1); return; }
    if (target === 2 && step0Complete && step1Complete) { setStep(2); return; }
    // Can always go backward
    if (target < step) { setStep(target); return; }
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setErr(null);
      try {
        const p = await fetchExoplanet(id);
        if (!cancelled) setPlanet(p);
      } catch (e: unknown) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load exoplanet");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [id]);

  async function onBook() {
    if (!planet || !user) return;
    setBookingMsg(null);

    setBookingStatus("submitting");
    try {
      const booking = await createBooking({ userId: user.id, planetId: planet.id, travelClass });
      setBookingStatus("success");
      setBookingId(booking.id);
      setBookingMsg("Voyage confirmed!");
    } catch (e: unknown) {
      setBookingStatus("idle");
      setBookingMsg(e instanceof Error ? e.message : "Booking failed");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050510] text-slate-200 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin"></div>
          <div className="text-sm text-slate-500 font-mono animate-pulse">ACQUIRING SIGNAL...</div>
        </div>
      </div>
    );
  }

  if (err || !planet) {
    return (
      <div className="min-h-screen bg-[#050510] text-slate-200 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl bg-red-500/10 border border-red-500/20 p-8 text-center backdrop-blur-sm">
          <div className="text-5xl mb-4">🛸</div>
          <div className="text-red-400 font-mono font-bold text-lg mb-2">SIGNAL LOST</div>
          <div className="text-red-200/60 text-sm mb-6">{err ?? "Destination not found in our star charts."}</div>
          <Link href="/exoplanets" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-sm font-medium">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back to catalogue
          </Link>
        </div>
      </div>
    );
  }

  const vc = VIBE_CONFIG[planet.vibe ?? ""] ?? DEFAULT_VIBE;
  const tempC = kelvinToCelsius(planet.temperature);
  const tempCat = tempCategory(planet.temperature);
  const gravCat = gravCategory(planet.gravity);
  const habScore = habitabilityScore(planet);
  const selectedClass = TRAVEL_CLASSES.find(c => c.id === travelClass) ?? TRAVEL_CLASSES[0];
  const estimatedTravel = travelTime(planet.distance, travelClass);

  return (
    <div className="min-h-screen bg-[#050510] text-slate-200 font-sans selection:bg-cyan-500/30 overflow-x-hidden relative">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(17,24,39,1),rgba(5,5,16,1))]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_70%)]"></div>
      </div>

      <div className={`fixed inset-0 z-0 pointer-events-none opacity-30 bg-gradient-to-br ${vc.bg}`}></div>

      <Navbar />

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pb-24 pt-6 md:pt-10">
        <nav className="flex items-center justify-between mb-8 animate-fade-in-up">
          <Link href="/exoplanets" className="inline-flex items-center gap-2 text-sm font-mono text-slate-400 hover:text-cyan-400 transition-colors group">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            CATALOGUE
          </Link>
          <div className="flex items-center gap-3 text-xs font-mono text-slate-600">
            <span className="hidden sm:inline">NAV // {planet.name.toUpperCase()}</span>
            <span className="px-2 py-0.5 rounded-full border border-white/10 bg-white/5">{planet.id.slice(0, 8)}...</span>
          </div>
        </nav>

        <div className={`relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-br ${vc.bg} mb-8 animate-fade-in-up [animation-delay:100ms]`}>
          <div className={`absolute inset-0 ${vc.effect || ''} opacity-50`}></div>
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 bg-repeat bg-[length:100px] mix-blend-overlay"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 p-8 md:p-12">
            <div className="relative flex-shrink-0">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center text-7xl md:text-8xl relative">
                {vc.emoji}
                <div className="absolute inset-0 rounded-full shadow-[inset_0_0_30px_rgba(0,0,0,0.3)]"></div>
                <div className={`absolute -inset-6 rounded-full blur-2xl opacity-30 ${vc.color.replace('text', 'bg').replace('400', '500')}`}></div>
              </div>
              <div className="absolute -inset-8 border border-white/5 rounded-full animate-[spin_20s_linear_infinite]"></div>
              <div className="absolute -inset-14 border border-white/[0.03] rounded-full animate-[spin_30s_linear_infinite_reverse]"></div>
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start mb-3">
                <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${vc.color} ${vc.color.replace('text', 'border').replace('400', '500')}/30 bg-black/20 backdrop-blur-sm`}>
                  {planet.vibe || "UNCLASSIFIED"}
                </span>
                {planet.discoveryYear && (
                  <span className="text-xs font-mono text-slate-500 px-2 py-0.5 rounded-full border border-white/10">
                    Discovered {planet.discoveryYear}
                  </span>
                )}
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 bg-gradient-to-r from-white via-white to-slate-400 bg-clip-text text-transparent">
                {planet.name}
              </h1>

              <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-xl">
                {vc.description}
              </p>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 animate-fade-in-up [animation-delay:200ms]">
          <StatCard
            label="Distance"
            value={`${planet.distance.toFixed(1)} ly`}
            sub="Light years from Earth"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>}
          />
          <StatCard
            label="Temperature"
            value={tempC != null ? `${tempC}°C` : "—"}
            sub={tempCat.label}
            valueColor={tempCat.color}
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/></svg>}
          />
          <StatCard
            label="Gravity"
            value={planet.gravity != null ? `${planet.gravity}G` : "—"}
            sub={gravCat.label}
            valueColor={gravCat.color}
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 2 6 6"/><circle cx="12" cy="12" r="2"/><path d="m6 18-4 4"/><path d="M15.5 8.5 18 6"/></svg>}
          />
          <div className="rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-sm p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Habitability</span>
              <span className="text-xs font-mono text-slate-500">{habScore}/100</span>
            </div>
            <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  habScore >= 70 ? 'bg-gradient-to-r from-emerald-500 to-green-400' :
                  habScore >= 40 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' :
                  'bg-gradient-to-r from-red-500 to-orange-400'
                }`}
                style={{ width: `${habScore}%` }}
              ></div>
            </div>
            <div className={`text-lg font-bold ${
              habScore >= 70 ? 'text-emerald-400' :
              habScore >= 40 ? 'text-amber-400' :
              'text-red-400'
            }`}>
              {habScore >= 70 ? 'Viable' : habScore >= 40 ? 'Survivable' : 'Hostile'}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/40 backdrop-blur-xl overflow-hidden animate-fade-in-up [animation-delay:300ms]">
          <div className="border-b border-white/10 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
              <h2 className="text-xl md:text-2xl font-bold">Book Your Voyage</h2>
            </div>
            <p className="text-sm text-slate-500 ml-5">Select your travel class and confirm your reservation</p>
          </div>

          <div className="flex border-b border-white/10">
            {["Travel Class", "Details", "Confirm"].map((label, i) => {
              const canAccess = i === 0 || (i === 1 && step0Complete) || (i === 2 && step0Complete && step1Complete);
              const isLocked = !canAccess && i > step;
              return (
                <button
                  key={label}
                  onClick={() => goToStep(i)}
                  disabled={isLocked}
                  className={`flex-1 py-3 text-xs font-mono uppercase tracking-wider transition-all relative
                    ${step === i ? 'text-cyan-400' : step > i ? 'text-emerald-400/60' : isLocked ? 'text-slate-700 cursor-not-allowed' : 'text-slate-600 hover:text-slate-400'}
                  `}
                >
                  <span className="flex items-center justify-center gap-2">
                    <span className={`w-5 h-5 rounded-full border text-[10px] flex items-center justify-center font-bold
                      ${step === i ? 'border-cyan-500 bg-cyan-500/20 text-cyan-400' :
                        step > i ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-400' :
                        isLocked ? 'border-slate-800 text-slate-700' :
                        'border-slate-700 text-slate-600'}
                    `}>
                      {step > i ? '✓' : isLocked ? (
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      ) : i + 1}
                    </span>
                    <span className="hidden sm:inline">{label}</span>
                  </span>
                  {step === i && <div className="absolute bottom-0 left-0 right-0 h-px bg-cyan-500"></div>}
                </button>
              );
            })}
          </div>

          <div className="p-6 md:p-8">
            {step === 0 && (
              <div className="animate-fade-in-up">
                <h3 className="text-sm font-mono text-slate-500 uppercase tracking-wider mb-4">Choose Your Experience</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {TRAVEL_CLASSES.map((tc) => (
                    <button
                      key={tc.id}
                      onClick={() => setTravelClass(tc.id)}
                      className={`relative text-left rounded-2xl border p-5 transition-all duration-300 group
                        ${travelClass === tc.id ? tc.selected : `${tc.color} bg-black/20 hover:bg-white/5`}
                      `}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-3xl">{tc.icon}</span>
                        {travelClass === tc.id && (
                          <span className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500 flex items-center justify-center text-cyan-400 text-[10px]">✓</span>
                        )}
                      </div>
                      <div className="font-bold text-lg mb-0.5">{tc.name}</div>
                      <div className="text-xs text-slate-500 font-mono mb-3">{tc.subtitle}</div>
                      <div className={`text-sm font-bold mb-3 ${travelClass === tc.id ? 'text-white' : 'text-slate-300'}`}>{tc.price}</div>
                      <ul className="space-y-1.5">
                        {tc.perks.map((perk) => (
                          <li key={perk} className="flex items-center gap-2 text-xs text-slate-400">
                            <span className="w-1 h-1 rounded-full bg-slate-600 flex-shrink-0"></span>
                            {perk}
                          </li>
                        ))}
                      </ul>
                    </button>
                  ))}
                </div>

                <div className="mt-6 flex justify-between items-center">
                  <div className="text-xs font-mono text-slate-600">
                    Est. travel time: <span className="text-slate-300">{estimatedTravel}</span>
                  </div>
                  <button
                    onClick={() => goToStep(1)}
                    disabled={!step0Complete}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-medium shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="animate-fade-in-up">
                <h3 className="text-sm font-mono text-slate-500 uppercase tracking-wider mb-4">Traveler Information</h3>

                {!user ? (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 text-center mb-6">
                    <div className="text-3xl mb-3">🔐</div>
                    <h4 className="text-lg font-bold text-amber-300 mb-2">Sign In Required</h4>
                    <p className="text-sm text-slate-400 mb-4 max-w-sm mx-auto">
                      You need an account to book interstellar voyages. Sign in or create an account to continue.
                    </p>
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-medium shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all hover:-translate-y-0.5"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                        <polyline points="10 17 15 12 10 7"/>
                        <line x1="15" x2="3" y1="12" y2="12"/>
                      </svg>
                      Sign In / Register
                    </Link>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-sm font-bold">
                        {(user.name || user.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-emerald-300">{user.name || "Traveler"}</div>
                        <div className="text-xs text-slate-500 font-mono">{user.email}</div>
                      </div>
                      <div className="ml-auto flex items-center gap-1.5 text-[10px] font-mono text-emerald-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        VERIFIED
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1.5">Departure Date</label>
                    <input
                      type="date"
                      value={departureDate}
                      onChange={(e) => setDepartureDate(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1.5">Passengers</label>
                    <div className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-xl px-4 py-2">
                      <button
                        onClick={() => setPassengers(Math.max(1, passengers - 1))}
                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 transition-colors"
                      >−</button>
                      <span className="flex-1 text-center font-mono text-sm">{passengers}</span>
                      <button
                        onClick={() => setPassengers(Math.min(8, passengers + 1))}
                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 transition-colors"
                      >+</button>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-between items-center">
                  <button onClick={() => goToStep(0)} className="px-4 py-2 text-sm text-slate-500 hover:text-white transition-colors">← Back</button>
                  <button
                    onClick={() => goToStep(2)}
                    disabled={!step1Complete || !user}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-medium shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  >
                    Review Booking
                  </button>
                </div>
              </div>
            )}

            {step === 2 && bookingStatus !== "success" && (
              <div className="animate-fade-in-up">
                <h3 className="text-sm font-mono text-slate-500 uppercase tracking-wider mb-6">Review & Confirm</h3>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-5 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Destination</div>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{vc.emoji}</span>
                        <div>
                          <div className="font-bold">{planet.name}</div>
                          <div className="text-xs text-slate-500">{planet.distance.toFixed(1)} light years · {planet.vibe || "Unclassified"}</div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Travel Class</div>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{selectedClass.icon}</span>
                        <div>
                          <div className="font-bold">{selectedClass.name}</div>
                          <div className="text-xs text-slate-500">{selectedClass.subtitle} · {selectedClass.price}</div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Traveler</div>
                      <div className="text-sm">{user?.name || "—"}</div>
                      <div className="text-xs text-slate-500">{user?.email || "—"}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Details</div>
                      <div className="text-sm">{passengers} passenger{passengers > 1 ? 's' : ''} · {departureDate || 'Flexible date'}</div>
                      <div className="text-xs text-slate-500">Est. travel: {estimatedTravel}</div>
                    </div>
                  </div>
                </div>

                {bookingMsg && (
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 mb-4 text-sm text-rose-300">
                    {bookingMsg}
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <button onClick={() => goToStep(1)} className="px-4 py-2 text-sm text-slate-500 hover:text-white transition-colors">← Back</button>
                  <button
                    onClick={onBook}
                    disabled={bookingStatus === "submitting"}
                    className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-bold shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    {bookingStatus === "submitting" ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        Processing...
                      </span>
                    ) : (
                      "Confirm Booking"
                    )}
                  </button>
                </div>
              </div>
            )}

            {bookingStatus === "success" && (
              <div className="animate-fade-in-up text-center py-8">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-6">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
                <h3 className="text-2xl font-bold text-emerald-400 mb-2">Voyage Confirmed!</h3>
                <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
                  Your reservation to <span className="text-white font-medium">{planet.name}</span> has been secured. Prepare for departure.
                </p>
                {bookingId && (
                  <div className="inline-block bg-black/30 border border-white/10 rounded-xl px-4 py-2 mb-6">
                    <span className="text-[10px] font-mono text-slate-500 block mb-0.5">CONFIRMATION ID</span>
                    <span className="text-sm font-mono text-cyan-400">{bookingId}</span>
                  </div>
                )}
                <div className="flex items-center justify-center gap-3 mt-4">
                  <Link href="/exoplanets" className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm text-slate-300 transition-all">
                    Explore More
                  </Link>
                  <button
                    onClick={() => {
                      setBookingStatus("idle");
                      setBookingMsg(null);
                      setBookingId(null);
                      setStep(0);
                      setDepartureDate("");
                      setPassengers(1);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-medium shadow-lg shadow-cyan-500/20 transition-all"
                  >
                    Book Another
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  valueColor = "text-white",
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  valueColor?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-sm p-4 flex flex-col justify-between group hover:border-white/20 transition-all">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">{label}</span>
        <span className="text-slate-600 group-hover:text-slate-400 transition-colors">{icon}</span>
      </div>
      <div className={`text-xl md:text-2xl font-bold tracking-tight ${valueColor}`}>{value}</div>
      <div className="text-[11px] text-slate-500 mt-1">{sub}</div>
    </div>
  );
}
