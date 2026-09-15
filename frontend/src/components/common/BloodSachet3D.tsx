import React, { useState, useEffect, useRef } from 'react';
import { Droplet, Sparkles, Heart, ShieldCheck, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface BloodSachet3DProps {
  targetUnits?: number; // Target saved units (default: 184)
}

export const BloodSachet3D: React.FC<BloodSachet3DProps> = ({ targetUnits = 184 }) => {
  const { activeRoute } = useApp();
  const [fillPercent, setFillPercent] = useState<number>(0);
  const [currentUnits, setCurrentUnits] = useState<number>(0);
  const [isFilling, setIsFilling] = useState<boolean>(false);
  const animationFrameRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasTriggeredRef = useRef<boolean>(false);

  const maxCapacity = 250; // Sachet total capacity scale in units

  const startFillingAnimation = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    setIsFilling(true);
    setFillPercent(0);
    setCurrentUnits(0);

    const targetPct = Math.min(100, (targetUnits / maxCapacity) * 100);
    const duration = 2600; // 2.6s natural fluid filling velocity
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      
      // Fluid ease-out damping
      const easeProgress = 1 - Math.pow(1 - progress, 3.5);

      const nextPct = targetPct * easeProgress;
      const nextUnits = Math.round(targetUnits * easeProgress);

      setFillPercent(nextPct);
      setCurrentUnits(nextUnits);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsFilling(false);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  // Trigger refill when user scrolls down to that sachet card instead of on initial page open
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.25) {
            if (!hasTriggeredRef.current) {
              hasTriggeredRef.current = true;
              startFillingAnimation();
            }
          } else if (!entry.isIntersecting && entry.intersectionRatio === 0) {
            // Reset trigger flag when scrolled completely out of view
            hasTriggeredRef.current = false;
          }
        });
      },
      {
        threshold: [0, 0.25, 0.5]
      }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [activeRoute]);

  const livesImpacted = currentUnits * 3;
  const currentMl = Math.round(currentUnits * 1.38);

  return (
    <div
      ref={containerRef}
      className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-emerald-900/40 relative overflow-hidden my-6"
    >
      {/* Ambient background glow */}
      <div
        className="absolute -right-16 -bottom-16 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-opacity duration-500"
        style={{
          backgroundColor: '#be123c',
          opacity: 0.12 + (fillPercent / 100) * 0.35
        }}
      />
      <div className="absolute -left-20 -top-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
        
        {/* Left Column: Metrics, Description & Refill Button */}
        <div className="space-y-5 max-w-xl text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Live Network Biological Preservation Pouch
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Cumulative Blood Units Preserved
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed mt-2">
              Visualizes the real-time volume of donor red blood cells rescued from potential expiration across regional network loci through predictive rebalancing.
            </p>
          </div>

          {/* Key Metric Displays */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur text-left">
              <span className="text-[10px] uppercase font-bold text-rose-300 tracking-wider flex items-center gap-1.5">
                <Droplet className="w-3.5 h-3.5 text-rose-400 fill-rose-400" /> Units Rescued
              </span>
              <div className="text-3xl font-black text-white mt-1.5">
                {currentUnits} <span className="text-xs font-semibold text-slate-400">/ {maxCapacity}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur text-left">
              <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" /> Lives Impacted
              </span>
              <div className="text-3xl font-black text-emerald-400 mt-1.5">
                ~{livesImpacted} <span className="text-xs font-semibold text-emerald-200/60">pts</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur text-left col-span-2 sm:col-span-1">
              <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Sachet Volume
              </span>
              <div className="text-3xl font-black text-amber-300 mt-1.5">
                {Math.round(fillPercent)}%
              </div>
            </div>
          </div>

          {/* Refill Button + Telemetry Status */}
          <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-3">
            <button
              onClick={startFillingAnimation}
              disabled={isFilling}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 text-white font-bold text-xs rounded-full transition-all shadow-md shadow-emerald-950/40 flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFilling ? 'animate-spin' : ''}`} />
              <span>{isFilling ? 'Filling Sachet...' : 'Refill Sachet'}</span>
            </button>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-700/60 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Auto-refills when scrolled into view</span>
            </div>
          </div>
        </div>

        {/* Right Column: Realistic 3D Medical Blood Sachet Pouch */}
        <div className="relative flex flex-col items-center justify-center p-2 sm:p-4 select-none">
          
          {/* Medical Sachet Container */}
          <div className="relative w-64 sm:w-72 h-[380px] sm:h-[420px] flex flex-col items-center">
            
            {/* TOP INFUSION TUBING (Curves from left into the top central port) */}
            <svg
              className="absolute -top-12 left-2 w-36 h-28 z-30 pointer-events-none overflow-visible"
              viewBox="0 0 140 100"
            >
              {/* Clear outer silicone tube casing */}
              <path
                d="M 15 90 C 5 20, 60 -10, 105 50 L 105 85"
                fill="none"
                stroke="rgba(255, 255, 255, 0.45)"
                strokeWidth="10"
                strokeLinecap="round"
              />
              {/* Inner red blood fluid stream flowing through tubing */}
              <path
                d="M 15 90 C 5 20, 60 -10, 105 50 L 105 85"
                fill="none"
                stroke="#be123c"
                strokeWidth="6"
                strokeLinecap="round"
                className={isFilling ? 'animate-pulse' : ''}
              />
              {/* Plastic white clamp on tube */}
              <rect x="98" y="55" width="14" height="8" rx="2" fill="#ffffff" stroke="#94a3b8" strokeWidth="1" />
              {/* White numeric printing on tube */}
              <text x="18" y="70" fill="white" fontSize="5" fontFamily="monospace" transform="rotate(-75 18 70)">B 40277291</text>
            </svg>

            {/* TOP INFUSION PORTS (3 distinct heat-sealed PVC ports) */}
            <div className="relative w-48 h-8 flex items-end justify-between px-6 z-25">
              {/* Port 1 (Left tubing junction) */}
              <div className="w-6 h-7 bg-gradient-to-b from-slate-200/90 to-slate-300/80 rounded-t-md border border-white/60 shadow-sm flex items-center justify-center">
                <div className="w-2.5 h-full bg-rose-800 rounded-t-sm" />
              </div>

              {/* Port 2 (Middle Spike port with rubber membrane) */}
              <div className="w-6 h-6 bg-gradient-to-b from-slate-200/90 to-slate-300/80 rounded-t-md border border-white/60 shadow-sm flex items-center justify-center">
                <div className="w-3 h-2 bg-rose-900 rounded-sm" />
              </div>

              {/* Port 3 (Right Infusion spike port) */}
              <div className="w-6 h-6 bg-gradient-to-b from-slate-200/90 to-slate-300/80 rounded-t-md border border-white/60 shadow-sm flex items-center justify-center">
                <div className="w-3 h-2 bg-rose-900 rounded-sm" />
              </div>
            </div>

            {/* MAIN PVC BLOOD BAG BODY */}
            <div
              className="relative w-full flex-1 rounded-[2.8rem] border-[10px] border-white/40 bg-slate-950/30 backdrop-blur-md shadow-2xl overflow-hidden flex flex-col justify-end"
              style={{
                boxShadow: '0 25px 50px -10px rgba(0,0,0,0.8), inset 0 0 20px rgba(255,255,255,0.4)'
              }}
            >
              {/* Welded Edge Seam Texture */}
              <div className="absolute inset-0 rounded-[2.2rem] border border-white/30 pointer-events-none z-40" />
              
              {/* DYNAMIC RED BLOOD FLUID FILLING RESERVOIR */}
              <div
                className="w-full relative rounded-b-[2.2rem]"
                style={{
                  height: `${fillPercent}%`,
                  transition: 'none', // Direct continuous 60fps filling
                  background: 'linear-gradient(180deg, #be123c 0%, #9f1239 30%, #881337 70%, #4c0519 100%)',
                  boxShadow: '0 0 30px rgba(190, 18, 60, 0.6), inset 0 0 20px rgba(255, 255, 255, 0.2)'
                }}
              >
                {/* Fluid Meniscus (Top surface curve with ripple) */}
                {fillPercent > 0 && (
                  <div
                    className="absolute -top-3 left-0 right-0 h-6 rounded-[50%] z-20"
                    style={{
                      background: 'radial-gradient(ellipse at center, #fb7185 0%, #e11d48 60%, #881337 100%)',
                      borderTop: '1.5px solid rgba(255, 220, 230, 0.85)',
                      boxShadow: '0 0 12px rgba(244, 63, 94, 0.8)'
                    }}
                  />
                )}

                {/* Floating Micro-bubbles inside blood */}
                {fillPercent > 10 && (
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="w-2 h-2 rounded-full bg-rose-300/40 absolute left-1/4 bottom-8 animate-pulse duration-1000" />
                    <div className="w-1.5 h-1.5 rounded-full bg-white/50 absolute left-3/4 bottom-14 animate-ping duration-1000" />
                    <div className="w-2.5 h-2 rounded-full bg-rose-300/30 absolute left-1/2 bottom-4 animate-bounce duration-1000" />
                  </div>
                )}
              </div>

              {/* AUTHENTIC HOSPITAL BLOOD BANK LABEL (Placed directly on front of sachet) */}
              <div className="absolute inset-x-6 top-10 h-52 bg-white rounded-lg shadow-md border border-slate-300/80 p-3 text-slate-900 font-sans z-30 pointer-events-none flex flex-col justify-between select-none">
                
                {/* Label Top Barcode & Lot code */}
                <div>
                  <div className="flex items-center justify-between text-[8px] font-mono text-slate-500 font-bold border-b border-slate-200 pb-1">
                    <span>G101 604 745 014 9</span>
                    <span>HG-RESCUE-LOT</span>
                  </div>

                  {/* Barcode Lines Graphic */}
                  <div className="w-full h-5 flex items-stretch gap-[1.5px] py-1 opacity-90 overflow-hidden">
                    {[3,1,2,1,4,2,1,3,1,2,3,1,4,1,2,3,2,1,3,1,4,2,1,2,3,1,2,4,1,3,1,2,3,1,4,2,1,3].map((w, i) => (
                      <div key={i} className="bg-slate-950 h-full" style={{ width: `${w}px` }} />
                    ))}
                  </div>

                  <h3 className="text-[10px] font-black tracking-tight text-slate-950 uppercase leading-none mt-1">
                    Red Cells in Additive Solution
                  </h3>
                  <div className="text-[8px] font-medium text-slate-600 flex items-center justify-between mt-0.5">
                    <span>STORE AT 4°C ± 2°C (SAGM)</span>
                    <span className="font-bold text-slate-900 font-mono">
                      Vol: {currentMl} ml
                    </span>
                  </div>
                </div>

                {/* Center Blood Group & Volume Display */}
                <div className="flex items-center justify-between border-y border-slate-200 py-1.5 my-1">
                  <div className="space-y-0.5">
                    <span className="text-[7px] text-slate-500 font-bold uppercase tracking-wider block">Network Rescue Pool</span>
                    <span className="text-sm font-black font-mono text-rose-950 leading-none block">
                      {currentUnits} <span className="text-[10px] font-bold text-slate-600">UNITS</span>
                    </span>
                    <span className="text-[7px] text-emerald-800 font-bold block">✓ Safe for Transfusion</span>
                  </div>

                  {/* Prominent Blood Group Badge */}
                  <div className="text-right">
                    <span className="text-3xl font-black text-slate-950 leading-none block font-mono">A</span>
                    <span className="text-[8px] font-bold text-slate-700 block uppercase">Rh D POSITIVE</span>
                  </div>
                </div>

                {/* Bottom Barcode, Lot, Ref & Date */}
                <div className="text-[7px] font-mono text-slate-500 flex items-center justify-between">
                  <div>
                    <span>LOT: b1054083100x6b</span>
                    <div className="text-[6px] text-slate-400">REF: HG-BIOPRESERVE</div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-700">HEMOGRID S.N.B.T.S.</span>
                    <div className="text-[6px] text-slate-400">EXP: 35 DAYS (VALID)</div>
                  </div>
                </div>

              </div>

              {/* Specular Plastic Wrinkles & Gloss Overlays */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/20 pointer-events-none z-35" />
              <div className="absolute top-0 right-4 bottom-0 w-3 bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none z-35" />
              <div className="absolute top-0 left-6 bottom-0 w-2 bg-white/10 pointer-events-none z-35" />

            </div>

            {/* Sachet Floor Drop Shadow */}
            <div className="w-48 h-5 bg-black/60 rounded-[50%] blur-md -mt-2 pointer-events-none" />

          </div>

        </div>

      </div>
    </div>
  );
};
