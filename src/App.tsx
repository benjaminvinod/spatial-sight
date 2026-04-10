import { useState } from 'react';
import ARScene from './components/ARScene';
import Overlay from './components/Overlay';

// 🔥 NEW: type safety (no behavior change)
type Obstacle = {
  x: number;
  z: number;
};

function App() {
  // 🔥 EXISTING
  const [status, setStatus] = useState<'scanning' | 'active' | 'warning'>('scanning');

  // 🔥 UPDATED: typed instead of any
  const [gridObstacles, setGridObstacles] = useState<Obstacle[]>([]);

  return (
    <div className="app-container">
      {/* 1. UI OVERLAY */}
      <Overlay 
        status={status} 
        gridObstacles={gridObstacles} 
      />

      {/* 2. 3D SCENE */}
      <ARScene 
        setStatus={setStatus} 
        setGridObstacles={setGridObstacles} 
      />
      
    </div>
  );
}

export default App;