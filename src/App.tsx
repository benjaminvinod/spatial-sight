import { useState } from 'react';
import ARScene from './components/ARScene';
import Overlay from './components/Overlay';

function App() {
  // 🔥 STATE LIFTING: Capture AI status from ARScene to update the UI
  const [status, setStatus] = useState<'scanning' | 'active' | 'warning'>('scanning');

  return (
    <div className="app-container">
      {/* 1. THE UI OVERLAY: Now dynamically reacts to AI insights */}
      <Overlay status={status} />

      {/* 2. THE 3D SCENE: We pass the setStatus setter down */}
      <ARScene setStatus={setStatus} />
      
    </div>
  );
}

export default App;