import React from 'react';
import { Eye, Settings, MapPin } from 'lucide-react';

interface OverlayProps {
  status: 'scanning' | 'active' | 'warning';
}

const Overlay: React.FC<OverlayProps> = ({ status }) => {

  // 🔥 Dynamic Colors
  const getColor = () => {
    if (status === 'active') return 'text-green-400 border-green-500';
    if (status === 'warning') return 'text-yellow-400 border-yellow-500';
    return 'text-cyan-400 border-cyan-500';
  };

  const getDotColor = () => {
    if (status === 'active') return 'bg-green-400';
    if (status === 'warning') return 'bg-yellow-400';
    return 'bg-cyan-400';
  };

  return (
    <div className="fixed inset-0 pointer-events-none flex flex-col justify-between p-6">

      {/* 🔥 HEADER */}
      <div className="flex justify-between items-center pointer-events-auto">
        <div className={`bg-black/80 border-2 p-3 rounded-xl flex items-center gap-3 ${getColor()}`}>
          <Eye className="animate-pulse" size={28} />
          <h1 className="text-white font-bold text-xl tracking-wide">
            SPATIAL SIGHT
          </h1>
        </div>

        <button className="bg-black/80 p-3 rounded-full border border-white/20">
          <Settings className="text-white" size={24} />
        </button>
      </div>

      {/* 🔥 STATUS PANEL */}
      <div className="flex flex-col gap-4 items-center">
        <div className={`bg-black/90 border-t-4 p-6 rounded-2xl w-full max-w-sm pointer-events-auto shadow-2xl ${getColor()}`}>
          
          {/* 🔥 TITLE ROW */}
          <div className="flex items-center justify-between mb-3">

            <div className="flex items-center gap-3">
              <MapPin className="text-white" />
              <span className="text-white text-xs font-black tracking-widest">
                NAVIGATION STATUS
              </span>
            </div>

            {/* 🔥 STATUS DOT */}
            <div className={`w-3 h-3 rounded-full animate-pulse ${getDotColor()}`} />
          </div>

          {/* 🔥 MESSAGE */}
          <p className="text-white text-lg font-medium leading-snug">
            {status === 'scanning' && "Scanning surroundings. Hold device steady."}
            {status === 'active' && "Path is clear. Proceed forward safely."}
            {status === 'warning' && "Obstacle detected ahead. Adjust direction."}
          </p>

        </div>
      </div>
    </div>
  );
};

export default Overlay;