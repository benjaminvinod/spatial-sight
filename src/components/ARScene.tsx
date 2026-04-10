import { useState, useRef, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useVision } from '../hooks/useVision';
import { initAudio } from '../hooks/SpatialAudio';
import { PUZZLES, ScanType } from '../hooks/EscapeLogic';
import { PuzzleUI } from './PuzzleUI';
import { PathShader } from '../shaders/PathShader';

// 🔊 Voice system (ADDED)
let lastSpoken = '';
let lastSpeechTime = 0;

const speak = (text: string, priority = false) => {
  const now = Date.now();

  if (!priority && lastSpoken === text && now - lastSpeechTime < 3000) return;

  lastSpoken = text;
  lastSpeechTime = now;

  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }
};

// ── Pulsing red circle for detected obstacles ─────────────────────────────────
const DangerZone = ({ position }: { position: THREE.Vector3 }) => {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.15;
    ref.current.scale.set(scale, scale, scale);
  });
  return (
    <mesh ref={ref} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.8, 32]} />
      <meshBasicMaterial color="red" transparent opacity={0.3} />
    </mesh>
  );
};

// ── Glowing path (safe = cyan, danger = red) ───────────────────────────────────
const GlowingPath = ({ position, isDanger }: { position: THREE.Vector3; isDanger: boolean }) => {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    if (ref.current) {
      const mat = ref.current.material as THREE.ShaderMaterial;
      mat.uniforms.uTime.value = state.clock.elapsedTime;
      mat.uniforms.uColor.value = isDanger
        ? new THREE.Color(0xff0000)
        : new THREE.Color(0x00ffff);
    }
  });

  return (
    <mesh ref={ref} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.6, 0.6]} />
      <shaderMaterial
        args={[PathShader]}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
};

// ── Scene ─────────────────────────────────────────────────────────────────────
interface SceneProps {
  getObstacles: () => { x: number; z: number; label: number }[];
  checkScanTarget: (type: ScanType) => boolean;
  scanType: ScanType;
  riddleOpen: boolean;
  ready: boolean;
  scanProgressRef: React.MutableRefObject<number>;
  onFound: () => void;
  setStatus: (s: 'scanning' | 'active' | 'warning') => void;
}

const Scene = ({
  getObstacles,
  checkScanTarget,
  scanType,
  riddleOpen,
  ready,
  scanProgressRef,
  onFound,
  setStatus
}: SceneProps) => {
  const { camera, gl } = useThree();

  const deviceRot = useRef(new THREE.Euler());
  const [obstacles, setObstacles] = useState<THREE.Vector3[]>([]);
  const lastObstacleScan = useRef(0);
  const lastScanCheck = useRef(0);
  const foundRef = useRef(false);

  const nodesRef = useRef<{ pos: THREE.Vector3; isDanger: boolean }[]>([]);

  useEffect(() => {
    foundRef.current = false;
    scanProgressRef.current = 0;
  }, [scanType, scanProgressRef]);

  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null && e.beta !== null && e.gamma !== null) {
        deviceRot.current.set(
          THREE.MathUtils.degToRad(e.beta),
          THREE.MathUtils.degToRad(e.alpha),
          -THREE.MathUtils.degToRad(e.gamma),
          'YXZ'
        );
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    gl.setClearColor(0x000000, 0);

    const unlock = () => initAudio();
    window.addEventListener('click', unlock, { once: true });

    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [gl]);

  useFrame(() => {
    camera.quaternion.setFromEuler(deviceRot.current);
    camera.position.set(0, 1.6, 0);

    const now = performance.now();

    // Faster obstacle updates
    if (now - lastObstacleScan.current > 200) {
      lastObstacleScan.current = now;
      const raw = getObstacles();
      setObstacles(raw.map(o => new THREE.Vector3(o.x, 0, o.z)));
    }

    // 🔥 DIRECT obstacle detection (FIXED)
    const closeObstacle = obstacles.find(o => o.z > -2 && o.z < -0.3);

    if (closeObstacle) {
      const side =
        closeObstacle.x < -0.3 ? 'left' :
        closeObstacle.x > 0.3 ? 'right' :
        'ahead';

      speak(`Obstacle ${side}`, true);
    }

    // Path + danger detection (FIXED LOGIC)
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y = 0;
    if (forward.length() > 0) forward.normalize();

    let pathPos = new THREE.Vector3(0, 0, -1);
    const newNodes: { pos: THREE.Vector3; isDanger: boolean }[] = [];
    let pathIsDanger = false;

    for (let i = 0; i < 12; i++) {
      const isDanger = obstacles.some(o => {
        return Math.abs(o.z - pathPos.z) < 1.2 && Math.abs(o.x - pathPos.x) < 1.2;
      });

      if (isDanger && i < 3) pathIsDanger = true;

      newNodes.push({
        pos: pathPos.clone(),
        isDanger,
      });

      pathPos.add(forward.clone().multiplyScalar(0.8));
    }

    nodesRef.current = newNodes;

    // Status update
    if (!ready) {
      setStatus('scanning');
    } else if (pathIsDanger) {
      setStatus('warning');
    } else {
      setStatus('active');
    }

    // Scan logic (UNCHANGED)
    if (!riddleOpen && !foundRef.current && ready && now - lastScanCheck.current > 500) {
      lastScanCheck.current = now;

      const detected = checkScanTarget(scanType);

      if (detected) {
        scanProgressRef.current = Math.min(1, scanProgressRef.current + 0.38);
      } else {
        scanProgressRef.current = Math.max(0, scanProgressRef.current - 0.22);
      }

      if (scanProgressRef.current >= 1) {
        foundRef.current = true;
        onFound();
      }
    }
  });

  return (
    <>
      <ambientLight intensity={1.5} />

      {obstacles.map((pos, i) => (
        <DangerZone key={i} position={pos} />
      ))}

      {nodesRef.current.map((n, i) => (
        <GlowingPath key={i} position={n.pos} isDanger={n.isDanger} />
      ))}
    </>
  );
};

// ── Scan reticle ──────────────────────────────────────────────────────────────
const ScanReticle = ({ progress }: { progress: number }) => {
  const radius = 46;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - progress);

  const color =
    progress > 0.7 ? '#00ff88' :
    progress > 0.05 ? '#00e5ff' :
    'rgba(255,255,255,0.55)';

  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
      zIndex: 500,
    }}>
      <svg width="130" height="130" viewBox="0 0 130 130">
        <circle cx="65" cy="65" r={radius} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
        <circle
          cx="65" cy="65" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 65 65)"
        />
      </svg>
    </div>
  );
};

// ── Flash ─────────────────────────────────────────────────────────────────────
const FoundFlash = () => (
  <div style={{
    position: 'absolute',
    inset: 0,
    zIndex: 1000,
    background: 'rgba(0,255,136,0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }}>
    <div style={{ color: '#00ff88', fontWeight: 900 }}>
      TARGET ACQUIRED
    </div>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
interface ARSceneProps {
  puzzleIdx: number;
  onPuzzleSolved: () => void;
  setStatus: (s: 'scanning' | 'active' | 'warning') => void;
}

export default function ARScene({ puzzleIdx, onPuzzleSolved, setStatus }: ARSceneProps) {
  const { ready, getObstacles, checkScanTarget } = useVision();

  const [displayProgress, setDisplayProgress] = useState(0);
  const [riddleOpen, setRiddleOpen] = useState(false);
  const [foundFlash, setFoundFlash] = useState(false);

  const scanProgressRef = useRef(0);
  const puzzle = PUZZLES[puzzleIdx];

  useEffect(() => {
    const id = setInterval(() => {
      setDisplayProgress(scanProgressRef.current);
    }, 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setRiddleOpen(false);
    setFoundFlash(false);
    setDisplayProgress(0);
    scanProgressRef.current = 0;
  }, [puzzleIdx]);

  useEffect(() => {
    if (!ready) setStatus('scanning');
    else if (displayProgress > 0.15) setStatus('warning');
    else setStatus('active');
  }, [ready, displayProgress, setStatus]);

  const handleFound = useCallback(() => {
    setFoundFlash(true);

    setTimeout(() => {
      setFoundFlash(false);
      setRiddleOpen(true);
    }, 900);
  }, []);

  const handleSolve = useCallback(() => {
    setRiddleOpen(false);
    onPuzzleSolved();
  }, [onPuzzleSolved]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {foundFlash && <FoundFlash />}

      <Canvas
        camera={{ fov: 75, position: [0, 1.6, 0] }}
        gl={{ alpha: true }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <Scene
          getObstacles={getObstacles}
          checkScanTarget={checkScanTarget}
          scanType={puzzle.scanType}
          riddleOpen={riddleOpen}
          ready={ready}
          scanProgressRef={scanProgressRef}
          onFound={handleFound}
          setStatus={setStatus}
        />
      </Canvas>

      {!riddleOpen && !foundFlash && (
        <ScanReticle progress={displayProgress} />
      )}

      {riddleOpen && (
        <PuzzleUI puzzle={puzzle} onSolve={handleSolve} />
      )}
    </div>
  );
}