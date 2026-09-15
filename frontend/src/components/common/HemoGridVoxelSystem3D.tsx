import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight } from 'lucide-react';

interface StationData {
  id: string;
  name: string;
  color: string;
  crossColor: string;
  baseColor: string;
  pipeColor: string;
  pipeGlow: string;
  x: number; // percentage in container (0-100)
  y: number; // percentage in container (0-100)
  metrics: {
    label: string;
    value: string;
    dotColor: string;
    isBold?: boolean;
    valueColor?: string;
  }[];
  flowDirection: 'INTO_HUB' | 'FROM_HUB' | 'STEADY';
}

export const HemoGridVoxelSystem3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Mouse tilt / parallax state
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, mouseX: 0.5, mouseY: 0.5 });
  const [hoveredStation, setHoveredStation] = useState<string | null>(null);

  const stations: StationData[] = [
    {
      id: 'city-general',
      name: 'City General',
      color: '#10b981',
      crossColor: '#059669',
      baseColor: '#004F3B',
      pipeColor: '#34d399',
      pipeGlow: 'rgba(52, 211, 153, 0.6)',
      x: 14,
      y: 20,
      flowDirection: 'INTO_HUB',
      metrics: [
        { label: 'O+ RBC', value: '24u', dotColor: '#059669' },
        { label: 'Expiring', value: '6u', dotColor: '#f59e0b', valueColor: '#d97706' },
        { label: 'Status', value: 'Surplus', dotColor: '#10b981', isBold: true, valueColor: '#059669' }
      ]
    },
    {
      id: 'metro-hospital',
      name: 'Metro Hospital',
      color: '#f43f5e',
      crossColor: '#e11d48',
      baseColor: '#881337',
      pipeColor: '#fb7185',
      pipeGlow: 'rgba(251, 113, 133, 0.6)',
      x: 82,
      y: 18,
      flowDirection: 'FROM_HUB',
      metrics: [
        { label: 'O+ RBC', value: '6u', dotColor: '#e11d48' },
        { label: 'Forecast', value: '14u', dotColor: '#e11d48' },
        { label: 'Status', value: 'Shortage', dotColor: '#9f1239', isBold: true, valueColor: '#e11d48' }
      ]
    },
    {
      id: 'westgate',
      name: 'Westgate',
      color: '#38bdf8',
      crossColor: '#0284c7',
      baseColor: '#0f172a',
      pipeColor: '#67e8f9',
      pipeGlow: 'rgba(103, 232, 249, 0.5)',
      x: 16,
      y: 78,
      flowDirection: 'STEADY',
      metrics: [
        { label: 'B+ Plasma', value: '18u', dotColor: '#e11d48' },
        { label: 'Stable', value: '', dotColor: '#10b981' },
        { label: 'Status', value: 'Normal', dotColor: '#10b981', isBold: true, valueColor: '#059669' }
      ]
    },
    {
      id: 'central',
      name: 'Central',
      color: '#10b981',
      crossColor: '#059669',
      baseColor: '#004F3B',
      pipeColor: '#34d399',
      pipeGlow: 'rgba(52, 211, 153, 0.5)',
      x: 80,
      y: 76,
      flowDirection: 'STEADY',
      metrics: [
        { label: 'O- RBC', value: '12u', dotColor: '#059669' },
        { label: 'Expiring', value: '4u', dotColor: '#f59e0b', valueColor: '#d97706' },
        { label: 'Status', value: 'Watch', dotColor: '#10b981', isBold: true, valueColor: '#d97706' }
      ]
    }
  ];

  // Mouse move handler for smooth physical 3D perspective tilt
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width; // 0 to 1
    const y = (e.clientY - rect.top) / rect.height; // 0 to 1

    const rotX = (y - 0.5) * -14; // max 7 deg tilt
    const rotY = (x - 0.5) * 16;  // max 8 deg pan

    setTilt({ rotateX: rotX, rotateY: rotY, mouseX: x, mouseY: y });
  };

  const handleMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0, mouseX: 0.5, mouseY: 0.5 });
    setHoveredStation(null);
  };

  // Canvas Pipe Fluid Flow Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let offset = 0;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      offset = (offset + 0.65) % 100;

      // Hub Center coordinates
      const hubX = w * 0.5;
      const hubY = h * 0.52;

      // Draw concentric radar lines under hub
      ctx.save();
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.15)';
      ctx.lineWidth = 1;
      for (let r = 50; r <= 170; r += 35) {
        ctx.beginPath();
        ctx.ellipse(hubX, hubY + 15, r, r * 0.5, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // Render Pipes to each station
      stations.forEach((station) => {
        const targetX = (station.x / 100) * w;
        const targetY = (station.y / 100) * h;
        const isHovered = hoveredStation === station.id;

        // Curved organic path between Hub and Station
        const ctrlX = (hubX + targetX) / 2 + (station.x < 50 ? 25 : -25);
        const ctrlY = (hubY + targetY) / 2 + 15;

        // 1. Pipe Outer Glass Tube
        ctx.save();
        ctx.strokeStyle = 'rgba(203, 213, 225, 0.45)';
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(targetX, targetY);
        ctx.quadraticCurveTo(ctrlX, ctrlY, hubX, hubY);
        ctx.stroke();

        // 2. Pipe Inner Glow Core
        ctx.strokeStyle = station.pipeGlow;
        ctx.lineWidth = isHovered ? 8 : 6;
        ctx.beginPath();
        ctx.moveTo(targetX, targetY);
        ctx.quadraticCurveTo(ctrlX, ctrlY, hubX, hubY);
        ctx.stroke();

        // 3. Animated Fluid Flow Energy Pulses
        ctx.strokeStyle = station.pipeColor;
        ctx.lineWidth = isHovered ? 4 : 3;
        ctx.setLineDash([12, 18]);
        // Flow direction offset
        const dashOffset = station.flowDirection === 'INTO_HUB' ? -offset * 1.5 : offset * 1.5;
        ctx.lineDashOffset = dashOffset;
        ctx.beginPath();
        ctx.moveTo(targetX, targetY);
        ctx.quadraticCurveTo(ctrlX, ctrlY, hubX, hubY);
        ctx.stroke();

        // 4. Moving Fluid Droplets / Photons
        const numDrops = 3;
        for (let i = 0; i < numDrops; i++) {
          const tProgress = ((offset * 0.01 + i / numDrops) % 1);
          const t = station.flowDirection === 'INTO_HUB' ? 1 - tProgress : tProgress;
          
          // Quadratic Bezier interpolation
          const px = (1 - t) * (1 - t) * targetX + 2 * (1 - t) * t * ctrlX + t * t * hubX;
          const py = (1 - t) * (1 - t) * targetY + 2 * (1 - t) * t * ctrlY + t * t * hubY;

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(px, py, isHovered ? 3.5 : 2.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = station.pipeColor;
          ctx.beginPath();
          ctx.arc(px, py, isHovered ? 6 : 4.5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      // Render Floating Translucent Background Micro-Cubes
      const floatingCubes = [
        { x: w * 0.28, y: h * 0.35, size: 14, speed: 0.001, phase: 0 },
        { x: w * 0.72, y: h * 0.38, size: 12, speed: 0.0012, phase: 1.5 },
        { x: w * 0.34, y: h * 0.72, size: 16, speed: 0.0009, phase: 2.8 },
        { x: w * 0.66, y: h * 0.75, size: 13, speed: 0.0011, phase: 4.2 },
        { x: w * 0.50, y: h * 0.22, size: 11, speed: 0.0014, phase: 5.1 }
      ];

      ctx.save();
      const time = performance.now();
      floatingCubes.forEach((cube) => {
        const floatY = cube.y + Math.sin(time * cube.speed + cube.phase) * 6;
        ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
        ctx.lineWidth = 1;
        ctx.fillRect(cube.x - cube.size / 2, floatY - cube.size / 2, cube.size, cube.size);
        ctx.strokeRect(cube.x - cube.size / 2, floatY - cube.size / 2, cube.size, cube.size);
      });
      ctx.restore();

      animationId = requestAnimationFrame(render);
    };

    const handleResize = () => {
      if (!canvas || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, [hoveredStation]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-full min-h-[440px] max-h-[620px] flex items-center justify-center select-none overflow-hidden"
      style={{ perspective: '1200px' }}
    >
      {/* Dynamic 3D Perspective Canvas Container */}
      <div
        className="relative w-full h-full transition-transform duration-200 ease-out"
        style={{
          transform: `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
          transformStyle: 'preserve-3d'
        }}
      >
        {/* Canvas for Glowing Animated Flow Pipes */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
        />

        {/* ================================================== */}
        {/* 1. CENTRAL HEMOGRID HUB */}
        {/* ================================================== */}
        <div
          className="absolute left-1/2 top-[52%] -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center cursor-pointer group"
          style={{ transform: 'translate3d(-50%, -50%, 25px)' }}
        >
          {/* Stepped Pedestal Base */}
          <div className="relative flex flex-col items-center">
            
            {/* Glass Cube with Glossy Red Blood Drop Inside */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-b from-white/70 to-emerald-50/40 backdrop-blur-md border border-emerald-300/80 shadow-[0_12px_35px_rgba(16,185,129,0.25)] flex items-center justify-center relative overflow-hidden group-hover:shadow-[0_16px_45px_rgba(16,185,129,0.4)] transition-all duration-300">
              
              {/* Glass Bevel Highlights */}
              <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/80 to-transparent pointer-events-none" />
              <div className="absolute inset-0 border border-white/90 rounded-2xl pointer-events-none" />

              {/* 3D Glossy Red Blood Drop */}
              <div className="relative w-12 h-14 sm:w-14 sm:h-16 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-[0_8px_16px_rgba(225,29,72,0.45)]">
                  <defs>
                    <linearGradient id="dropGrad" x1="0.3" y1="0" x2="0.7" y2="1">
                      <stop offset="0%" stopColor="#ff4d6d" />
                      <stop offset="50%" stopColor="#e11d48" />
                      <stop offset="100%" stopColor="#881337" />
                    </linearGradient>
                    <radialGradient id="specular" cx="35%" cy="30%" r="25%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                  
                  {/* Blood Droplet Body */}
                  <path
                    d="M 50 5 C 48 10, 20 60, 20 85 C 20 105, 35 118, 50 118 C 65 118, 80 105, 80 85 C 80 60, 52 10, 50 5 Z"
                    fill="url(#dropGrad)"
                  />
                  {/* Specular Highlight Reflection */}
                  <ellipse cx="40" cy="70" rx="14" ry="24" fill="url(#specular)" transform="rotate(-15 40 70)" />
                  <ellipse cx="42" cy="50" rx="4" ry="8" fill="#ffffff" opacity="0.6" />
                </svg>

                {/* Subtle Floating Animation */}
                <span className="absolute -bottom-1 w-8 h-2 bg-emerald-950/20 rounded-full blur-xs pointer-events-none" />
              </div>
            </div>

            {/* Dark Forest Green Base with "HemoGrid" Brand */}
            <div className="w-28 sm:w-32 py-1.5 px-3 bg-[#004F3B] text-white rounded-xl shadow-lg border border-emerald-600/40 text-center -mt-2 relative z-30 group-hover:bg-[#003d2e] transition-colors">
              <span className="text-xs sm:text-sm font-black tracking-wider uppercase font-sans">
                HemoGrid
              </span>
              <span className="absolute -bottom-1 -right-1 w-1.5 h-1.5 bg-emerald-400 rounded-none" />
            </div>

            {/* Stepped Lower Glass Base Ring */}
            <div className="w-36 sm:w-40 h-3 bg-emerald-100/60 rounded-xl border border-emerald-200/50 -mt-1 shadow-xs" />
          </div>
        </div>

        {/* ================================================== */}
        {/* 2. FOUR SURROUNDING HOSPITAL STATIONS & CARDS */}
        {/* ================================================== */}
        {stations.map((station) => {
          const isHovered = hoveredStation === station.id;

          return (
            <React.Fragment key={station.id}>
              {/* Station Glass Voxel Cube + Pedestal */}
              <div
                onMouseEnter={() => setHoveredStation(station.id)}
                onMouseLeave={() => setHoveredStation(null)}
                className="absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform duration-300"
                style={{
                  left: `${station.x}%`,
                  top: `${station.y}%`,
                  transform: `translate3d(-50%, -50%, ${isHovered ? '40px' : '15px'}) scale(${isHovered ? 1.08 : 1})`
                }}
              >
                <div className="relative flex flex-col items-center">
                  
                  {/* Glass Voxel Cube with 3D Medical Cross */}
                  <div
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl backdrop-blur-md border shadow-md flex items-center justify-center relative transition-all duration-300 ${
                      station.id === 'metro-hospital'
                        ? 'bg-rose-50/60 border-rose-200/80 shadow-rose-200/50'
                        : station.id === 'westgate'
                        ? 'bg-sky-50/60 border-sky-200/80 shadow-sky-200/50'
                        : 'bg-emerald-50/60 border-emerald-200/80 shadow-emerald-200/50'
                    }`}
                  >
                    {/* Glass Bevel Overlay */}
                    <div className="absolute inset-0 border border-white/90 rounded-xl pointer-events-none" />

                    {/* 3D Medical Cross (+) */}
                    <div className="relative w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center">
                      <div
                        className="absolute w-2 h-6 sm:w-2.5 sm:h-7 rounded-xs shadow-xs"
                        style={{ backgroundColor: station.crossColor }}
                      />
                      <div
                        className="absolute w-6 h-2 sm:w-7 sm:h-2.5 rounded-xs shadow-xs"
                        style={{ backgroundColor: station.crossColor }}
                      />
                    </div>
                  </div>

                  {/* Colored Pedestal Base */}
                  <div
                    className="w-16 sm:w-18 py-1 rounded-lg text-white text-[9px] font-bold text-center -mt-1 shadow-md border border-white/20 transition-all duration-300"
                    style={{ backgroundColor: station.baseColor }}
                  >
                    <span className="w-1.5 h-1.5 rounded-none inline-block mr-1" style={{ backgroundColor: station.pipeColor }} />
                    {station.name.split(' ')[0]}
                  </div>
                </div>
              </div>

              {/* Floating Information Telemetry Card */}
              <div
                onMouseEnter={() => setHoveredStation(station.id)}
                onMouseLeave={() => setHoveredStation(null)}
                className={`absolute z-30 bg-white/95 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 shadow-xl border border-slate-200/90 text-xs transition-all duration-300 cursor-pointer ${
                  isHovered ? 'scale-105 shadow-2xl ring-2' : 'hover:scale-102'
                }`}
                style={{
                  // Position card cleanly adjacent to its station
                  left: station.x < 50 ? `${station.x + 6}%` : undefined,
                  right: station.x >= 50 ? `${100 - station.x + 5}%` : undefined,
                  top: `${station.y - 12}%`,
                  minWidth: '150px',
                  borderColor: isHovered ? station.color : undefined
                }}
              >
                {/* Card Title Header with Chevron */}
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100">
                  <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                    {station.name}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </div>

                {/* Metrics list */}
                <div className="space-y-1 text-[11px] font-medium">
                  {station.metrics.map((metric, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-1.5 text-slate-600">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: metric.dotColor }}
                        />
                        {metric.label}
                      </span>
                      <span
                        className={`${metric.isBold ? 'font-black' : 'font-bold'}`}
                        style={{ color: metric.valueColor || '#0f172a' }}
                      >
                        {metric.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
