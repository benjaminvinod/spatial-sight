import { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useVision } from '../hooks/useVision';
import { PathShader } from '../shaders/PathShader';
import { playSpatialAlert, initAudio } from '../hooks/SpatialAudio';
import { ESCAPE_GAME } from '../hooks/EscapeLogic';
import { PuzzleUI } from './PuzzleUI';

interface ARSceneProps {
  setStatus: (status: 'scanning' | 'active' | 'warning') => void;
}

const LABELS: Record<number, string> = { 9: "Chair", 15: "Person", 20: "Monitor" };

let lastSpoken = '';
let lastSpeechTime = 0;
const speak = (text: string, priority = false) => {
  const now = Date.now();
  if (!priority && lastSpoken === text && now - lastSpeechTime < 4000) return;
  lastSpoken = text; lastSpeechTime = now;
  const utterance = new SpeechSynthesisUtterance(text);
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }
};

const GlowingPath = ({ position, isDanger }: any) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = state.clock.elapsedTime;
      material.uniforms.uColor.value = isDanger ? new THREE.Color(0xff0000) : new THREE.Color(0x00ffff);
    }
  });
  return (
    <mesh ref={meshRef} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.6, 0.6]} />
      <shaderMaterial args={[PathShader]} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  );
};

const DangerZone = ({ position }: any) => {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.15;
    ref.current.scale.set(scale, scale, scale);
  });
  return (
    <mesh ref={ref} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.8, 32]} />
      <meshBasicMaterial color="red" transparent opacity={0.4} />
    </mesh>
  );
};

const Scene = ({ setStatus, setRiddlePanel, currentPuzzleIdx, viewMode }: any) => {
  const { camera, gl } = useThree();
  const { getObstacles, scanMarker, ready } = useVision();
  const [nodes, setNodes] = useState<any[]>([]);
  const [activeObstacles, setActiveObstacles] = useState<any[]>([]);
  const playerPos = useRef(new THREE.Vector3(0, 1.6, 0)); 
  const deviceRot = useRef(new THREE.Euler());
  const prevDist = useRef(0);

  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null && e.beta !== null && e.gamma !== null) {
        deviceRot.current.set(THREE.MathUtils.degToRad(e.beta), THREE.MathUtils.degToRad(e.alpha), -THREE.MathUtils.degToRad(e.gamma), 'YXZ');
      }
    };
    window.addEventListener('deviceorientation', handleOrientation);
    gl.setClearColor(0x000000, 0);
    const unlock = () => { initAudio(); speak("System online."); };
    window.addEventListener('click', unlock, { once: true });
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [gl]);

  useFrame((state) => {
    // 🔥 RESTORED: View Mode Logic
    if (viewMode === 'first-person') {
      camera.quaternion.setFromEuler(deviceRot.current);
      camera.position.copy(playerPos.current);
    } else {
      camera.position.set(0, 15, 0);
      camera.rotation.set(-Math.PI / 2, 0, 0);
    }

    const rawObstacles = getObstacles() || [];
    const obstacles = rawObstacles.map(o => ({ pos: new THREE.Vector3(o.x, 0, o.z), label: o.label }));
    setActiveObstacles(obstacles);

    const target = ESCAPE_GAME.puzzles[currentPuzzleIdx];
    const targetVec = new THREE.Vector3(target.targetPos.x, 0, target.targetPos.z);
    const dist = playerPos.current.distanceTo(targetVec);

    // Navigation Math
    const toTarget = targetVec.clone().sub(playerPos.current).normalize();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y = 0; forward.normalize();
    const angle = forward.angleTo(toTarget);
    const cross = new THREE.Vector3().crossVectors(forward, toTarget);
    let clock = Math.round((cross.y > 0 ? -angle : angle) * (6 / Math.PI)) + 12;
    if (clock > 12) clock -= 12; if (clock <= 0) clock += 12;

    const deltaDist = prevDist.current - dist;
    prevDist.current = dist;

    // Feedback Logic
    if (ready && state.clock.elapsedTime % 3.5 < 0.02) {
      if (dist < 1.5) {
        if (scanMarker()) { speak("Marker found.", true); setRiddlePanel(true); }
        else { speak(`Scan the ${target.marker} marker.`); }
      } else {
        if (deltaDist > 0.05) speak(`Warmer. ${clock} o'clock.`);
        else speak(`Target: ${clock} o'clock.`);
      }
    }

    // Path Logic
    const newNodes = [];
    let currentPathPos = new THREE.Vector3(0, 0, -1);
    let pathIsDanger = false;
    for (let i = 0; i < 10; i++) {
      const isDanger = obstacles.some(obs => currentPathPos.distanceTo(obs.pos) < 1.4);
      if (isDanger && i < 3) pathIsDanger = true;
      newNodes.push({ pos: currentPathPos.clone(), isDanger });
      currentPathPos.add(forward.clone().multiplyScalar(0.8));
    }
    setNodes(newNodes);
    setStatus(!ready ? 'scanning' : (pathIsDanger ? 'warning' : 'active'));
  });

  return (
    <>
      <ambientLight intensity={1.5} />
      <gridHelper args={[50, 50, 0x00ffff, 0x111111]} position={[0, -0.05, 0]} />
      {activeObstacles.map((obs, i) => <DangerZone key={i} position={obs.pos} />)}
      {nodes.map((n, i) => <GlowingPath key={i} position={n.pos} isDanger={n.isDanger} />)}
    </>
  );
};

export default function ARScene({ setStatus }: ARSceneProps) {
  const [currentPuzzleIdx, setCurrentPuzzleIdx] = useState(0);
  const [riddlePanel, setRiddlePanel] = useState(false);
  const [viewMode, setViewMode] = useState<'first-person' | 'top-down'>('first-person');

  const handleSolve = () => {
    setRiddlePanel(false);
    if (currentPuzzleIdx < ESCAPE_GAME.puzzles.length - 1) setCurrentPuzzleIdx(p => p + 1);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* View Toggle Buttons */}
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 6000, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button onClick={() => setViewMode('first-person')} style={{ padding: '12px 20px', background: 'rgba(0, 255, 255, 0.7)', border: 'none', borderRadius: '12px', fontWeight: 'bold' }}>Person View</button>
        <button onClick={() => setViewMode('top-down')} style={{ padding: '12px 20px', background: 'rgba(0, 255, 255, 0.7)', border: 'none', borderRadius: '12px', fontWeight: 'bold' }}>Top Map</button>
      </div>

      {riddlePanel && <PuzzleUI puzzle={ESCAPE_GAME.puzzles[currentPuzzleIdx]} onSolve={handleSolve} />}
      
      <Canvas camera={{ fov: 75 }} gl={{ alpha: true }}>
        <Scene 
          setStatus={setStatus} 
          setRiddlePanel={setRiddlePanel} 
          currentPuzzleIdx={currentPuzzleIdx} 
          viewMode={viewMode}
        />
      </Canvas>
    </div>
  );
}