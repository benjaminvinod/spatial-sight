import { useState, useRef, useEffect, type Dispatch, type SetStateAction } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useVision } from '../hooks/useVision';
import { PathShader } from '../shaders/PathShader';
import { FloorShader } from '../shaders/floorShader';
import { playSpatialAlert, initAudio } from '../hooks/SpatialAudio';
import { ESCAPE_GAME } from '../hooks/EscapeLogic';

interface PathNode {
  pos: THREE.Vector3;
  isDanger: boolean;
}

interface ARSceneProps {
  setStatus: Dispatch<SetStateAction<'scanning' | 'active' | 'warning'>>;
}

const LABELS: Record<number, string> = {
  1: "Aeroplane", 2: "Bicycle", 3: "Bird", 4: "Boat", 5: "Bottle", 
  6: "Bus", 7: "Car", 8: "Cat", 9: "Chair", 10: "Cow", 11: "Dining Table",
  12: "Dog", 13: "Horse", 14: "Motorbike", 15: "Person", 16: "Potted Plant", 
  17: "Sheep", 18: "Sofa", 19: "Train", 20: "Monitor"
};

let lastSpoken = '';
const speak = (text: string) => {
  if (lastSpoken === text) return;
  lastSpoken = text;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.1; 
  // Safety: Ensure window.speechSynthesis exists
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }
};

const GlowingPath = ({ position, isDanger }: { position: THREE.Vector3; isDanger: boolean }) => {
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

const DangerZone = ({ position }: { position: THREE.Vector3 }) => {
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

const DirectionArrow = ({ position, direction }: { position: THREE.Vector3; direction: THREE.Vector3 }) => {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(() => {
    if (!ref.current) return;
    ref.current.rotation.y = Math.atan2(direction.x, direction.z);
  });
  return (
    <mesh ref={ref} position={[position.x, 0.1, position.z]}>
      <coneGeometry args={[0.15, 0.4, 3]} />
      <meshStandardMaterial color="yellow" emissive="yellow" emissiveIntensity={2} />
    </mesh>
  );
};

const Scene = ({ setStatus, viewMode }: any) => {
  const { camera, gl } = useThree();
  const { getObstacles, ready } = useVision();
  const [nodes, setNodes] = useState<PathNode[]>([]);
  const [activeObstacles, setActiveObstacles] = useState<{pos: THREE.Vector3, label: number}[]>([]);
  const [currentPuzzleIdx] = useState(0); 
  const playerPos = useRef(new THREE.Vector3(0, 1.6, 0)); 
  const deviceRot = useRef(new THREE.Euler());

  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null && e.beta !== null && e.gamma !== null) {
        const alpha = THREE.MathUtils.degToRad(e.alpha); 
        const beta = THREE.MathUtils.degToRad(e.beta);   
        const gamma = THREE.MathUtils.degToRad(e.gamma); 
        deviceRot.current.set(beta, alpha, -gamma, 'YXZ');
      }
    };
    window.addEventListener('deviceorientation', handleOrientation);
    gl.setClearColor(0x000000, 0);
    
    const unlock = () => { 
      initAudio(); 
      speak("System unlocked. Scanning environment."); 
    };
    window.addEventListener('click', unlock);
    
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('click', unlock);
    };
  }, [gl]);

  useFrame((state) => {
    // 1. Position/Rotation Sync
    if (viewMode === 'first-person') {
      camera.quaternion.setFromEuler(deviceRot.current);
      camera.position.copy(playerPos.current);
    } else {
      camera.position.set(0, 15, 0);
      camera.rotation.set(-Math.PI / 2, 0, 0);
    }

    // 2. Obstacle Calculation
    const rawObstacles = getObstacles() || []; // Fallback to empty array
    const obstacles = rawObstacles.map(o => ({
      pos: new THREE.Vector3(o.x, 0, o.z),
      label: o.label
    }));
    setActiveObstacles(obstacles);

    // 3. Game/Riddle Proximity
    const target = ESCAPE_GAME.puzzles[currentPuzzleIdx];
    const targetVec = new THREE.Vector3(target.targetPos.x, 0, target.targetPos.z);
    const distToRiddle = playerPos.current.distanceTo(targetVec);

    if (distToRiddle < ESCAPE_GAME.pingRadius && state.clock.elapsedTime % 1.5 < 0.02) {
      playSpatialAlert(targetVec, 0.1, false); 
    }

    // 4. Path Generation
    const newNodes: PathNode[] = [];
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y = 0;
    forward.normalize();

    let currentPathPos = new THREE.Vector3(0, 0, -1);
    let hasImmediateDanger = false;
    let nearestObjectLabel = "";

    for (let i = 0; i < 12; i++) {
      let nodeIsDanger = false;
      for (let obs of obstacles) {
        if (currentPathPos.distanceTo(obs.pos) < 1.5) {
          nodeIsDanger = true;
          hasImmediateDanger = true;
          nearestObjectLabel = LABELS[obs.label] || "Object";
        }
      }
      newNodes.push({ pos: currentPathPos.clone(), isDanger: nodeIsDanger });
      currentPathPos.add(forward.clone().multiplyScalar(0.8));
    }
    setNodes(newNodes);

    // 5. Status & Voice Logic
    if (ready && state.clock.elapsedTime % 3.0 < 0.02) {
      if (hasImmediateDanger) {
        speak(`Hazard: ${nearestObjectLabel} ahead.`);
        if ("vibrate" in navigator) navigator.vibrate(200);
      } else {
        speak(target.hint);
      }
    }

    // 🔥 FORCE UI Update if ready
    setStatus(!ready ? 'scanning' : (hasImmediateDanger ? 'warning' : 'active'));
  });

  return (
    <>
      <ambientLight intensity={1.5} />
      <gridHelper args={[50, 50, 0x00ffff, 0x111111]} position={[0, -0.05, 0]} />
      
      {/* Red Obstacles */}
      {activeObstacles.map((obs, i) => (
        <DangerZone key={`obs-${i}`} position={obs.pos} />
      ))}

      {/* Cyan Path */}
      {nodes.map((n, i) => (
        <group key={i}>
          <GlowingPath position={n.pos} isDanger={n.isDanger} />
          {i % 3 === 0 && !n.isDanger && (
             <DirectionArrow position={n.pos} direction={new THREE.Vector3(0,0,-1)} />
          )}
        </group>
      ))}
    </>
  );
};

export default function ARScene({ setStatus }: ARSceneProps) {
  const [viewMode, setViewMode] = useState<'first-person' | 'top-down'>('first-person');

  return (
    <div style={{ width: '100vw', height: '100vh', background: 'transparent', position: 'relative' }}>
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 2000, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button onClick={() => setViewMode('first-person')} style={{ padding: '12px 20px', background: 'rgba(0, 255, 255, 0.7)', border: 'none', borderRadius: '12px', fontWeight: 'bold' }}>Person View</button>
        <button onClick={() => setViewMode('top-down')} style={{ padding: '12px 20px', background: 'rgba(0, 255, 255, 0.7)', border: 'none', borderRadius: '12px', fontWeight: 'bold' }}>Top Map</button>
      </div>

      <Canvas 
        camera={{ fov: 75 }} 
        gl={{ alpha: true, antialias: true }} 
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0); 
        }}
      >
        <Scene setStatus={setStatus} viewMode={viewMode} />
      </Canvas>
    </div>
  );
}