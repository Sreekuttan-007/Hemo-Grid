import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowRight,
  Globe
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { setActiveRoute } = useApp();

  // Interactive green background hover effect coordinates
  const [bgMousePos, setBgMousePos] = useState<{ x: number; y: number; active: boolean }>({
    x: -1000,
    y: -1000,
    active: false
  });

  return (
    <div
      onMouseMove={(e) => {
        setBgMousePos({
          x: e.clientX,
          y: e.clientY,
          active: true
        });
      }}
      onMouseLeave={() => {
        setBgMousePos((prev) => ({ ...prev, active: false }));
      }}
      className="h-screen max-h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans flex flex-col justify-between select-none relative"
    >
      {/* FULL SCREEN VIDEO BACKGROUND */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
      >
        <source src="/assets/hemogrid_video.mp4" type="video/mp4" />
        <source src="/hemogrid_video.mp4" type="video/mp4" />
        <source src="/assets/hemogird_video.mp4" type="video/mp4" />
        <source src="/hemogird_video.mp4" type="video/mp4" />
        <source src="./assets/hemogrid_video.mp4" type="video/mp4" />
        <source src="/src/assets/hemogrid_video.mp4" type="video/mp4" />
      </video>

      {/* Subtle Dark Vignette for Text Contrast */}
      <div className="absolute inset-0 bg-slate-950/25 pointer-events-none z-0" />

      {/* Subtle Voxel Grid Overlay Texture */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-15 z-0"
        style={{
          backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />

      {/* COOL INTERACTIVE GREEN HOVER EFFECT IN THE BACKGROUND */}
      <div
        className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-500 ease-out"
        style={{
          opacity: bgMousePos.active ? 1 : 0,
          background: `radial-gradient(850px circle at ${bgMousePos.x}px ${bgMousePos.y}px, rgba(16, 185, 129, 0.22), rgba(0, 79, 59, 0.1) 45%, transparent 75%)`
        }}
      />

      {/* Concentrated Vibrant Emerald Core Glow */}
      <div
        className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300 ease-out"
        style={{
          opacity: bgMousePos.active ? 1 : 0,
          background: `radial-gradient(360px circle at ${bgMousePos.x}px ${bgMousePos.y}px, rgba(52, 211, 153, 0.35), transparent 70%)`
        }}
      />

      {/* ================================================== */}
      {/* TOP GLASSMORPHISM HEADER */}
      {/* ================================================== */}
      <header className="px-8 py-5 flex items-center justify-between z-20 w-full shrink-0 border-b border-white/10 bg-slate-900/30 backdrop-blur-xl">
        
        {/* Logo Left */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <img src="/logo.png" alt="HemoGrid Logo" className="h-8 w-auto object-contain brightness-0 invert" />
            <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-none" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
              HEMOGRID
              <span className="w-1.5 h-1.5 bg-emerald-400" />
            </span>
            <span className="text-[9px] font-bold tracking-widest text-emerald-400 uppercase -mt-0.5">
              Predict • Connect • Rescue
            </span>
          </div>
        </div>

        {/* Explore HemoGrid Glassmorphic Button Right */}
        <button
          onClick={() => setActiveRoute('/dashboard')}
          className="px-6 py-2.5 bg-white/15 hover:bg-white/25 text-white border border-white/30 backdrop-blur-md rounded-full text-xs font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer select-none group"
        >
          Explore HemoGrid
          <ArrowRight className="w-3.5 h-3.5 text-emerald-300 group-hover:translate-x-1 transition-transform" />
        </button>

      </header>

      {/* ================================================== */}
      {/* MAIN VIEWPORT: TRANSPARENT GLASS HERO CARD & LIQUID GLASS BUTTONS */}
      {/* ================================================== */}
      <main className="flex-1 min-h-0 flex flex-col items-center justify-between px-6 pt-10 sm:pt-14 pb-16 z-20 w-full max-w-5xl mx-auto">
        
        {/* HERO TITLE INSIDE MORE TRANSPARENT SLEEK GLASS CARD */}
        <div className="flex flex-col items-center text-center max-w-3xl bg-white/5 backdrop-blur-md border border-white/15 px-8 sm:px-12 py-6 sm:py-8 rounded-3xl shadow-xl relative overflow-hidden transition-all">
          
          {/* Specular Top Edge Highlight */}
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.15] drop-shadow-md">
            Turn Blood Inventory <br />
            Into a{' '}
            <span className="text-emerald-400 relative inline-block">
              Connected Network.
              <span className="absolute -bottom-1 left-0 w-full h-1.5 bg-emerald-400/40 -z-10" />
            </span>
          </h1>
        </div>


        {/* ACTION PILL BUTTONS AT MID-BOTTOM WITH LIQUID GLASS STYLING */}
        <div className="flex flex-wrap items-center justify-center gap-6 pb-8 sm:pb-12 z-30">
          
          {/* Explore HemoGrid Liquid Glass Button */}
          <div className="button-wrap relative z-10 rounded-full bg-transparent">
            <button
              onClick={() => setActiveRoute('/dashboard')}
              className="glass-button cursor-pointer relative rounded-full pointer-events-auto z-30 outline-none focus:outline-none flex items-center"
            >
              <span className="button-text relative flex items-center gap-2.5 select-none font-bold text-sm sm:text-base text-white tracking-tight px-7 py-3.5">
                Explore HemoGrid
                <ArrowRight className="w-4 h-4 text-emerald-300" />
              </span>
              <div className="button-shine" />
            </button>
          </div>

          {/* View Full Topology Liquid Glass Button */}
          <div className="button-wrap relative z-10 rounded-full bg-transparent">
            <button
              onClick={() => setActiveRoute('/network')}
              className="glass-button cursor-pointer relative rounded-full pointer-events-auto z-30 outline-none focus:outline-none flex items-center"
            >
              <span className="button-text relative flex items-center gap-2.5 select-none font-bold text-sm sm:text-base text-white tracking-tight px-7 py-3.5">
                <Globe className="w-4 h-4 text-emerald-400" />
                View Full Topology
              </span>
              <div className="button-shine" />
            </button>
          </div>

        </div>

      </main>

    </div>
  );
};








