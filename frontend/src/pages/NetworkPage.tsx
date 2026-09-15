import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Building2, ArrowRight, Sparkles, Eye, RefreshCcw } from 'lucide-react';
import { DisclaimerFooter } from '../components/common/DisclaimerFooter';
import { formatBloodGroup, formatComponent, formatFacilityTier, priorityTier } from '../format';
import type { Facility, RecommendationItem } from '../types';

export const NetworkPage: React.FC = () => {
  const {
    facilities,
    recommendations,
    setSelectedRecommendation,
    setSelectedFacility,
    selectedFacility
  } = useApp();

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'HIGH_PRIORITY' | 'O_POS'>('ALL');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Optimized coordinates for 800x480 viewBox canvas
  const FACILITY_COORDINATES: Record<string, { x: number; y: number }> = {
    'fac-001': { x: 220, y: 150 }, // Greenfield Medical Center (Top Left Source)
    'fac-002': { x: 500, y: 310 }, // City General Hospital (Mid Right Destination)
    'fac-003': { x: 620, y: 240 }, // Central Trauma Centre (Right Destination)
    'fac-004': { x: 440, y: 60 },  // Northside Medical Clinic (Top Center)
    'fac-005': { x: 670, y: 110 }, // Metro Children's Hospital (Top Far Right)
    'fac-006': { x: 720, y: 200 }, // Sunrise Provincial Hospital (Far Right)
    'fac-007': { x: 120, y: 250 }, // Westgate General Hospital (Far Left Source)
    'fac-008': { x: 280, y: 350 }, // St. Raphael's Hospital (Bottom Left Source)
    'fac-009': { x: 380, y: 420 }, // Lakeside Recovery Centre (Bottom Center)
    'fac-010': { x: 580, y: 400 }, // Eastview Medical Complex (Bottom Right)
  };

  // Compute status for each facility node from its data
  const getFacilityState = (fac: Facility) => {
    if (fac.worst_tier === 'CRITICAL') return { state: 'SHORTAGE_RISK', color: '#ef4444', label: `Critical Deficit (${fac.gap_units}u)` };
    if (fac.worst_tier === 'HIGH') return { state: 'EXPIRY_RISK', color: '#f59e0b', label: `At Risk (${fac.at_risk_units}u)` };
    if (fac.worst_tier === 'WATCH') return { state: 'WATCH', color: '#eab308', label: 'Watch' };
    return { state: 'STABLE', color: '#10b981', label: 'Stable' };
  };

  // Process nodes with projected layout
  const nodes = useMemo(() => {
    return facilities.map((fac) => {
      const customLoc = FACILITY_COORDINATES[fac.facility_id];
      const x = customLoc ? customLoc.x : fac.lng * 800;
      const y = customLoc ? customLoc.y : fac.lat * 480;
      const { state, color, label } = getFacilityState(fac);
      return {
        ...fac,
        x,
        y,
        state,
        color,
        statusLabel: label
      };
    });
  }, [facilities]);

  // Filter recommendations based on active tab
  const filteredRecs = useMemo(() => {
    return recommendations.filter((rec) => {
      if (activeFilter === 'HIGH_PRIORITY') return priorityTier(rec.rescue_score) === 'HIGH';
      if (activeFilter === 'O_POS') return rec.blood_group === 'O_POS';
      return true;
    });
  }, [recommendations, activeFilter]);

  // Curved Bezier edges calculation to avoid overlapping lines
  const edges = useMemo(() => {
    return filteredRecs.map((rec: RecommendationItem, index: number) => {
      const srcNode = nodes.find((n) => n.facility_id === rec.source_facility_id);
      const dstNode = nodes.find((n) => n.facility_id === rec.dest_facility_id);

      const x1 = srcNode?.x ?? 200;
      const y1 = srcNode?.y ?? 150;
      const x2 = dstNode?.x ?? 500;
      const y2 = dstNode?.y ?? 300;

      const dx = x2 - x1;
      const dy = y2 - y1;
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;

      // Curve perpendicular offset based on index to separate parallel lines
      const curveFactor = index % 2 === 0 ? 35 : -35;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const cx = mx - (dy / dist) * curveFactor;
      const cy = my + (dx / dist) * curveFactor;

      const pathD = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;

      const lx = 0.25 * x1 + 0.5 * cx + 0.25 * x2;
      const ly = 0.25 * y1 + 0.5 * cy + 0.25 * y2;

      return {
        ...rec,
        x1, y1, x2, y2, cx, cy, pathD, lx, ly
      };
    });
  }, [filteredRecs, nodes]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            Topology & Flow Visualization
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">HemoGrid Network Topology</h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Streamlined regional view connecting surplus supply nodes with predicted demand loci.
          </p>
        </div>

        {/* View Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-full border border-slate-200/80 shadow-sm">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeFilter === 'ALL'
                ? 'bg-emerald-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            All Bridges ({recommendations.length})
          </button>
          <button
            onClick={() => setActiveFilter('HIGH_PRIORITY')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeFilter === 'HIGH_PRIORITY'
                ? 'bg-emerald-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            High Priority Only
          </button>
          <button
            onClick={() => setActiveFilter('O_POS')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeFilter === 'O_POS'
                ? 'bg-emerald-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            O+ Matches
          </button>
        </div>
      </div>

      {/* GRAPH CANVAS & RIGHT SIDE PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Main Graph Card */}
        <div className="lg:col-span-3 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-3xl p-6 shadow-2xl relative min-h-[540px] flex items-center justify-center overflow-hidden border border-slate-800">
          
          {/* Background Grid Pattern */}
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px]"></div>

          {/* SVG Layer for Curved Arcs and Flow Particles */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 800 480" preserveAspectRatio="none">
            <defs>
              <marker
                id="arrowhead-active"
                markerWidth="10"
                markerHeight="8"
                refX="16"
                refY="4"
                orient="auto"
              >
                <polygon points="0 0, 10 4, 0 8" fill="#10b981" />
              </marker>
              <marker
                id="arrowhead-rejected"
                markerWidth="10"
                markerHeight="8"
                refX="16"
                refY="4"
                orient="auto"
              >
                <polygon points="0 0, 10 4, 0 8" fill="#f43f5e" />
              </marker>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Render Curved Bezier Edges */}
            {edges.map((edge) => {
              const isGolden = edge.id === 'rec-001' || edge.id === 'HG-REC-001';
              const isRejected = edge.status === 'REJECTED' || edge.status === 'CLOSED';
              const isHighlighted = hoveredNodeId === edge.source_facility_id || hoveredNodeId === edge.dest_facility_id;
              const isDimmed = hoveredNodeId && !isHighlighted;

              return (
                <g
                  key={edge.id}
                  className={`pointer-events-auto cursor-pointer transition-opacity duration-300 ${
                    isDimmed ? 'opacity-20' : 'opacity-100'
                  }`}
                  onClick={() => setSelectedRecommendation(edge)}
                >
                  {/* Glowing background arc for Golden Match */}
                  {isGolden && (
                    <path
                      d={edge.pathD}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="8"
                      strokeOpacity="0.25"
                      filter="url(#glow)"
                    />
                  )}

                  {/* Main Bezier Curve */}
                  <path
                    d={edge.pathD}
                    fill="none"
                    stroke={isRejected ? '#f43f5e' : isGolden ? '#10b981' : '#38bdf8'}
                    strokeWidth={isGolden ? 4 : 2.5}
                    strokeDasharray={isRejected ? '6 6' : 'none'}
                    markerEnd={isRejected ? 'url(#arrowhead-rejected)' : 'url(#arrowhead-active)'}
                    className="transition-all duration-300 hover:stroke-emerald-300"
                  />

                  {/* Animated Flow Dot along Arc for Active Match */}
                  {!isRejected && (
                    <circle r={isGolden ? "5" : "3.5"} fill={isGolden ? "#34d399" : "#38bdf8"}>
                      <animateMotion
                        path={edge.pathD}
                        dur={isGolden ? "2.2s" : "3.2s"}
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}

                  {/* Clean Non-Overlapping Label Badge along Arc */}
                  <foreignObject
                    x={edge.lx - 55}
                    y={edge.ly - 14}
                    width="110"
                    height="28"
                  >
                    <div className="flex items-center justify-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold whitespace-nowrap shadow-lg backdrop-blur border transition-all ${
                          isRejected
                            ? 'bg-rose-950/90 border-rose-500/50 text-rose-300'
                            : isGolden
                            ? 'bg-emerald-950/95 border-emerald-400 text-emerald-200 ring-2 ring-emerald-500/30'
                            : 'bg-slate-900/90 border-sky-500/40 text-sky-200'
                        }`}
                      >
                        {formatBloodGroup(edge.blood_group)} {formatComponent(edge.component)} • {edge.units}u
                      </span>
                    </div>
                  </foreignObject>
                </g>
              );
            })}
          </svg>

          {/* HTML Overlay for Nodes */}
          <div className="absolute inset-0 w-full h-full pointer-events-none">
            {nodes.map((node) => {
              const isSelected = selectedFacility?.facility_id === node.facility_id;

              return (
                <div
                  key={node.facility_id}
                  onClick={() => setSelectedFacility(node)}
                  onMouseEnter={() => setHoveredNodeId(node.facility_id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  style={{
                    left: `${(node.x / 800) * 100}%`,
                    top: `${(node.y / 480) * 100}%`,
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer group z-10"
                >
                  <div className="flex flex-col items-center transition-transform duration-200 group-hover:scale-105">
                    
                    {/* Node Ring Icon */}
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs shadow-2xl border-2 transition-all ${
                        node.state === 'SHORTAGE_RISK'
                          ? 'bg-rose-600 border-rose-400 text-white ring-4 ring-rose-500/20 animate-pulse'
                          : node.state === 'EXPIRY_RISK'
                          ? 'bg-amber-600 border-amber-400 text-white ring-4 ring-amber-500/20'
                          : node.state === 'WATCH'
                          ? 'bg-yellow-600 border-yellow-300 text-white'
                          : 'bg-emerald-700 border-emerald-400 text-white'
                      } ${isSelected ? 'ring-4 ring-white scale-110' : ''}`}
                    >
                      <Building2 className="w-5 h-5 text-white" />
                    </div>

                    {/* Node Label Badge */}
                    <div className="mt-1.5 px-3 py-1 rounded-xl bg-slate-950/90 border border-slate-700/80 text-[11px] font-bold text-slate-200 shadow-xl text-center backdrop-blur whitespace-nowrap min-w-[120px]">
                      <span className="block text-slate-100 font-extrabold text-[11px] leading-tight">
                        {node.name}
                      </span>
                      <div className="flex items-center justify-center gap-1.5 mt-0.5">
                        <span className="text-[9px] font-semibold text-slate-400">
                          {node.total_units} units
                        </span>
                        <span className="text-[8px] font-bold px-1.5 py-0.2 rounded" style={{ backgroundColor: `${node.color}25`, color: node.color }}>
                          {node.statusLabel}
                        </span>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Controls Info Bar */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-[11px] text-slate-400 bg-slate-950/90 px-4 py-2 rounded-2xl border border-slate-800 backdrop-blur">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <strong>Active Flow View:</strong> West (Surplus Supply Nodes) → East (Demand Loci)
            </span>
            <span className="text-slate-400">
              💡 Hover node to isolate routes • Click arc for recommendation details
            </span>
          </div>
        </div>

        {/* Right Info Drawer Panel */}
        <div className="bg-white rounded-3xl p-6 shadow-card border border-slate-100 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-800" />
                Active Route Spotlight
              </h3>
              <button
                onClick={() => setActiveFilter('ALL')}
                className="text-[10px] font-semibold text-slate-400 hover:text-slate-700 flex items-center gap-1"
              >
                <RefreshCcw className="w-3 h-3" /> Reset View
              </button>
            </div>

            {/* Golden Scenario Match Spotlight */}
            <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200/80 space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase text-emerald-800 tracking-wider">
                  Match #rec-001
                </span>
                <span className="px-2.5 py-0.5 bg-emerald-900 text-white text-[10px] font-black rounded-full">
                  Score 94/100
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-bold text-slate-900">Greenfield Medical Center</div>
                <div className="text-xs text-emerald-900 font-extrabold flex items-center gap-1 bg-emerald-100/80 px-2.5 py-1 rounded-lg w-fit">
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-700" /> 5 Units O+ RBC
                </div>
                <div className="text-xs font-bold text-slate-900">City General Hospital</div>
              </div>

              <button
                onClick={() => {
                  const rec = recommendations.find((r) => r.id === 'rec-001' || r.id === 'HG-REC-001');
                  if (rec) setSelectedRecommendation(rec);
                }}
                className="w-full py-2.5 bg-emerald-900 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" /> Inspect Match Details
              </button>
            </div>

            {/* Selected Facility Info */}
            {selectedFacility ? (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Inspected Node</span>
                <h4 className="font-extrabold text-sm text-slate-900">{selectedFacility.name}</h4>
                <p className="text-xs text-slate-500">{formatFacilityTier(selectedFacility.tier)} • {selectedFacility.code}</p>
                <div className="pt-2 flex items-center justify-between text-xs font-semibold border-t border-slate-200/60">
                  <span className="text-slate-600">Total Stock:</span>
                  <span className="text-slate-900 font-bold">{selectedFacility.total_units} Units</span>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-500 text-center">
                Click any hospital node on the map to view facility metrics.
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100">
            <DisclaimerFooter compact />
          </div>
        </div>

      </div>
    </div>
  );
};
