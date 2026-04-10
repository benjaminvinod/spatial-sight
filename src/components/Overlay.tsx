import React from 'react';
import { Eye, MapPin, AlertTriangle, CheckCircle2, Loader2, Trophy } from 'lucide-react';
import { CenterGrid } from './CenterGrid'; // 🔥 UPDATED

interface OverlayProps {
  status: 'scanning' | 'active' | 'warning';
  gridObstacles: { x: number; z: number }[];
}

const Overlay: React.FC<OverlayProps> = ({ status, gridObstacles }) => {
  const getColorScheme = () => {
    switch (status) {
      case 'active':
        return {
          text: 'text-cyan-400',
          border: 'border-cyan-500/50',
          bg: 'bg-cyan-500/20',
          icon: <Trophy className="text-cyan-400" size={24} />
        };
      case 'warning':
        return {
          text: 'text-red-500',
          border: 'border-red-600',
          bg: 'bg-red-600/30',
          icon: <AlertTriangle className="text-red-500 animate-bounce" size={24} />
        };
      default:
        return {
          text: 'text-gray-400',
          border: 'border-gray-500/50',
          bg: 'bg-gray-500/20',
          icon: <Loader2 className="text-gray-400 animate-spin" size={24} />
        };
    }
  };

  const scheme = getColorScheme();

  const getDirectionIndicator = () => {
    if (status === 'warning') return "⚠️"
    if (status === 'active') return "⬆️"
    return "⏳"
  }

  const getDirectionLabel = () => {
    if (status === 'warning') return "Adjust Direction"
    if (status === 'active') return "Move Forward"
    return "Scanning"
  }

  const getAssistiveHint = () => {
    if (status === 'warning') return "Obstacle ahead. Adjust direction."
    if (status === 'active') return "Move forward. Stay centered."
    return "Initializing vision system..."
  }

  return (
    <div className="fixed inset-0 pointer-events-none flex flex-col justify-between p-6 z-[100]">
      
      {/* 🔝 HEADER */}
      <div className="flex justify-between items-center pointer-events-auto">
        <div className={`bg-black/80 backdrop-blur-md border-2 p-3 rounded-xl flex items-center gap-3 ${scheme.border} ${scheme.text}`}>
          <Eye size={28} />
          <h1 className="text-white font-bold text-xl tracking-tighter">
            SPATIAL <span className="text-cyan-400">ESCAPE</span>
          </h1>
        </div>

        <div className={`bg-black/80 border-2 px-4 py-2 rounded-xl text-xl font-bold ${scheme.border} ${scheme.text}`}>
          {getDirectionIndicator()}
        </div>
      </div>

      {/* 🔥 UPDATED: CENTER TOP-VIEW GRID (REPLACES RADAR) */}
      <CenterGrid obstacles={gridObstacles || []} />

      {/* 🔥 CENTER GUIDANCE */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative flex items-center justify-center">

          <div className={`w-40 h-40 rounded-full border-2 opacity-20 ${scheme.border}`} />
          <div className={`absolute w-20 h-20 rounded-full border ${scheme.border} opacity-40`} />
          <div className={`absolute w-3 h-3 rounded-full ${status === 'warning' ? 'bg-red-500' : 'bg-cyan-400'}`} />

        </div>
      </div>

      {/* 🔽 MAIN PANEL */}
      <div className="flex flex-col gap-4 items-center">
        <div className={`bg-black/90 backdrop-blur-lg border-t-4 p-6 rounded-2xl w-full max-w-sm pointer-events-auto shadow-2xl transition-all duration-300 ${scheme.border} ${status === 'warning' ? 'animate-pulse' : ''}`}>
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="text-gray-500" size={16} />
              <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest">
                Mission Objective
              </span>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-lg ${scheme.bg}`}>
              {scheme.icon}
            </div>

            <div>
              <p className="text-white text-lg font-bold leading-tight mb-1">
                {status === 'scanning' && "Calibrating..."}
                {status === 'active' && "Find the Fragment"}
                {status === 'warning' && "Collision Imminent"}
              </p>

              <p className="text-gray-400 text-sm leading-snug">
                {status === 'scanning' && "Scanning environment for spatial nodes."}
                {status === 'active' && "Avoid hazards. Search for the keys that open no locks."}
                {status === 'warning' && "Object detected in flight path. Reroute immediately."}
              </p>

              <p className="mt-2 text-sm text-white font-semibold">
                {getDirectionLabel()}
              </p>

              <p className="mt-2 text-xs text-cyan-300 font-medium">
                {getAssistiveHint()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overlay;