import React from 'react';
import { Eye, Settings, MapPin, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

interface OverlayProps {
  status: 'scanning' | 'active' | 'warning';
}

const Overlay: React.FC<OverlayProps> = ({ status }) => {

  // ✨ Dynamic Styling based on AI Insights
  const getColorScheme = () => {
    switch (status) {
      case 'active':
        return {
          text: 'text-green-400',
          border: 'border-green-500/50',
          bg: 'bg-green-500/20',
          icon: <CheckCircle2 className="text-green-400" size={24} />
        };
      case 'warning':
        return {
          text: 'text-red-500', // Changed to Red for immediate danger
          border: 'border-red-600',
          bg: 'bg-red-600/30',
          icon: <AlertTriangle className="text-red-500 animate-bounce" size={24} />
        };
      default: // scanning
        return {
          text: 'text-cyan-400',
          border: 'border-cyan-500/50',
          bg: 'bg-cyan-500/20',
          icon: <Loader2 className="text-cyan-400 animate-spin" size={24} />
        };
    }
  };

  const scheme = getColorScheme();

  return (
    <div className="fixed inset-0 pointer-events-none flex flex-col justify-between p-6 z-[100]">

      {/* 🛰️ HEADER: Branding & Control */}
      <div className="flex justify-between items-center pointer-events-auto">
        <div className={`bg-black/80 backdrop-blur-md border-2 p-3 rounded-xl flex items-center gap-3 ${scheme.border} ${scheme.text}`}>
          <Eye className={status === 'scanning' ? 'animate-pulse' : ''} size={28} />
          <h1 className="text-white font-bold text-xl tracking-tighter">
            SPATIAL <span className={scheme.text}>SIGHT</span>
          </h1>
        </div>

        <button className="bg-black/80 p-3 rounded-full border border-white/10 hover:bg-white/10 transition-colors">
          <Settings className="text-white" size={24} />
        </button>
      </div>

      {/* 🚨 NAVIGATION PANEL: Real-time Feedback */}
      <div className="flex flex-col gap-4 items-center">
        <div className={`bg-black/90 backdrop-blur-lg border-t-4 p-6 rounded-2xl w-full max-w-sm pointer-events-auto shadow-2xl transition-all duration-300 ${scheme.border}`}>
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="text-gray-400" size={16} />
              <span className="text-gray-400 text-[10px] font-black tracking-[0.2em] uppercase">
                System Status
              </span>
            </div>
            {/* Status Indicator Dot */}
            <div className={`w-3 h-3 rounded-full ${status === 'warning' ? 'bg-red-500' : 'bg-current'} animate-pulse`} />
          </div>

          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-lg ${scheme.bg}`}>
              {scheme.icon}
            </div>
            <div>
              <p className="text-white text-lg font-bold leading-tight mb-1">
                {status === 'scanning' && "Initializing AI..."}
                {status === 'active' && "Path Optimized"}
                {status === 'warning' && "Hazard Detected"}
              </p>
              <p className="text-gray-400 text-sm leading-snug">
                {status === 'scanning' && "Analyzing floor geometry and obstacles."}
                {status === 'active' && "The environment is clear. Follow the cyan markers."}
                {status === 'warning' && "Obstacle ahead. Stop or navigate around the red zone."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overlay;