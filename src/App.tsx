import ARScene from './components/ARScene';
import Overlay from './components/Overlay';

function App() {
  return (
    <div>
      {/* Always show overlay (set to active for now) */}
      <Overlay status="active" />

      {/* 3D Simulation Scene */}
      <ARScene />
    </div>
  );
}

export default App;