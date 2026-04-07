import ARScene from './components/ARScene';
import Overlay from './components/Overlay';
import { useVision } from './hooks/useVision';
import './App.css';

function App() {
  // Pulling state from our MediaPipe hook
  const { isReady, error } = useVision();

  // Determine status for the Overlay UI
  const getStatus = () => {
    if (error) return 'error';
    if (isReady) return 'active';
    return 'scanning';
  };

  return (
    <div className="app-container">
      <Overlay status={getStatus()} />
      
      {/* Only load the ARScene AFTER MediaPipe is 100% ready */}
      {isReady ? (
        <ARScene />
      ) : (
        <div className="fixed inset-0 flex items-center justify-center bg-black z-[2000]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-cyan-400 font-bold uppercase">Waking up Vision Engine...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;