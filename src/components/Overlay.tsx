import React from 'react';
import { Eye, Settings, MapPin } from 'lucide-react';

interface OverlayProps {
  status: 'scanning' | 'active' | 'warning';
}

const Overlay: React.FC<OverlayProps> = ({ status }) => {
  return (
    <div className="fixed inset-0 pointer-events-none flex flex-col justify-between p-6">
      
      {/* Header */}
      <div className="flex justify-between items-center pointer-events-auto">
        <div className="bg-black/80 border-2 border-cyan-400 p-3 rounded-xl flex items-center gap-3">
          <Eye className="text-cyan-400 animate-pulse" size={28} />
          <h1 className="text-white font-bold text-xl">SPATIAL SIGHT</h1>
        </div>
        <button className="bg-black/80 p-3 rounded-full border border-white/20">
          <Settings className="text-white" size={24} />
        </button>
      </div>

      {/* Bottom Panel */}
      <div className="flex flex-col gap-4 items-center">
        <div className="bg-black/90 border-t-4 border-cyan-500 p-6 rounded-2xl w-full max-w-sm pointer-events-auto">
          
          <div className="flex items-center gap-4 mb-2">
            <MapPin className="text-cyan-400" />
            <span className="text-cyan-100 text-xs font-black tracking-widest">
              NAVIGATION STATUS
            </span>
          </div>

          <p className="text-white text-lg font-medium">
            {status === 'scanning' && "Scanning environment..."}
            {status === 'active' && "Safe path detected. Move forward."}
            {status === 'warning' && "Obstacle ahead. Adjust direction."}
          </p>

        </div>
      </div>
    </div>
  );
};

export default Overlay;