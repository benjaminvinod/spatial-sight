import { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useVision } from '../hooks/useVision';

interface PathNode {
  pos: THREE.Vector3;
  isDanger: boolean;
}

/* 🔊 VOICE ENGINE */
let lastSpoken = '';

const speak = (text: string) => {
  if (lastSpoken === text) return;
  lastSpoken = text;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
};

const GlowingPath = ({ position, isDanger }: any) => {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.8, 0.8]} />
      <meshBasicMaterial color={isDanger ? 'red' : 'cyan'} />
    </mesh>
  );
};

/* 🔥 Pulsing Danger Zone */
const DangerZone = ({ position }: any) => {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
    ref.current.scale.set(scale, scale, scale);
  });
  return (
    <mesh ref={ref} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.9, 32]} />
      <meshBasicMaterial color="red" transparent opacity={0.5} />
    </mesh>
  );
};

/* 🔥 Direction Arrow */
const DirectionArrow = ({ position, direction }: any) => {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(() => {
    if (!ref.current) return;
    const angle = Math.atan2(direction.x, direction.z);
    ref.current.rotation.y = angle;
  });
  return (
    <mesh ref={ref} position={[position.x, 0.15, position.z]}>
      <coneGeometry args={[0.25, 0.7, 3]} />
      <meshBasicMaterial color="yellow" />
    </mesh>
  );
};

const Scene = ({ setStatus, viewMode }: any) => {
  const { camera } = useThree();
  const { getObstacles, ready } = useVision();

  const [nodes, setNodes] = useState<PathNode[]>([]);
  const playerPos = useRef(new THREE.Vector3(0, 1.6, 0)); 
  const yaw = useRef(0);
  const keys = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => keys.current[e.key.toLowerCase()] = true;
    const handleUp = (e: KeyboardEvent) => keys.current[e.key.toLowerCase()] = false;
    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    
    let lastX = 0;
    const onTouchStart = (e: TouchEvent) => { lastX = e.touches[0].clientX; };
    const onTouchMove = (e: TouchEvent) => {
      const deltaX = e.touches[0].clientX - lastX;
      lastX = e.touches[0].clientX;
      yaw.current -= deltaX * 0.005;
    };
    window.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchmove', onTouchMove);

    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  useEffect(() => {
    const unlock = () => {
      speak('Navigation started');
      window.removeEventListener('click', unlock);
    };
    window.addEventListener('click', unlock);
  }, []);

  useFrame((_, delta) => {
    const moveSpeed = 5.0 * delta; 
    const rotationSpeed = 2.0 * delta;

    if (keys.current['a']) yaw.current += rotationSpeed;
    if (keys.current['d']) yaw.current -= rotationSpeed;

    // 🔥 FIXED FORWARD VECTOR: Ensure movement is always relative to view
    const forward = new THREE.Vector3(
      Math.sin(yaw.current),
      0,
      -Math.cos(yaw.current)
    ).normalize();

    if (keys.current['w']) {
      playerPos.current.add(forward.clone().multiplyScalar(moveSpeed));
    }
    if (keys.current['s']) {
      playerPos.current.sub(forward.clone().multiplyScalar(moveSpeed));
    }

    // 🔥 VIEW MODE LOGIC
    if (viewMode === 'first-person') {
      camera.position.copy(playerPos.current);
      camera.rotation.set(0, yaw.current, 0);
    } else if (viewMode === 'top-down') {
      camera.position.set(playerPos.current.x, 15, playerPos.current.z);
      camera.rotation.set(-Math.PI / 2, 0, 0);
    } else if (viewMode === 'side') {
      camera.position.set(playerPos.current.x + 8, 5, playerPos.current.z + 8);
      camera.lookAt(playerPos.current);
    }

    const obstacles = getObstacles().map(o =>
      new THREE.Vector3(playerPos.current.x + o.x, 0, playerPos.current.z + o.z)
    );

    const newNodes: PathNode[] = [];
    let current = playerPos.current.clone().add(forward.clone().multiplyScalar(1));
    const stepSize = 0.6;
    let hasDanger = false;

    for (let i = 0; i < 15; i++) {
      let direction = forward.clone();
      for (let obs of obstacles) {
        if (current.distanceTo(obs) < 2) {
          const toObs = obs.clone().sub(current).normalize();
          const cross = new THREE.Vector3().crossVectors(direction, toObs);
          const perp = cross.y > 0
              ? new THREE.Vector3(-direction.z, 0, direction.x)
              : new THREE.Vector3(direction.z, 0, -direction.x);
          direction = perp;
          hasDanger = true;
        }
      }
      const next = current.clone().add(direction.multiplyScalar(stepSize));
      let isDanger = false;
      for (let obs of obstacles) {
        if (next.distanceTo(obs) < 1) {
          isDanger = true;
          hasDanger = true;
        }
      }
      newNodes.push({ pos: next.clone(), isDanger });
      current = next;
    }
    setNodes(newNodes);

    if (newNodes.length > 2) {
      const p0 = newNodes[0].pos;
      const p1 = newNodes[1].pos;
      const dir = p1.clone().sub(p0).normalize();
      const forwardFlat = forward.clone().normalize();
      const cross = new THREE.Vector3().crossVectors(forwardFlat, dir);
      let instruction = '';
      if (Math.abs(cross.y) < 0.1) instruction = 'Go straight';
      else if (cross.y > 0) instruction = 'Turn left';
      else instruction = 'Turn right';
      speak(instruction);
    }

    if (!ready) setStatus('scanning');
    else if (hasDanger) setStatus('warning');
    else setStatus('active');
  });

  const obstaclesList = getObstacles().map(o => new THREE.Vector3(o.x, 0, o.z));

  return (
    <>
      <ambientLight intensity={2} />
      <pointLight position={[5, 10, 5]} intensity={4} />

      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        onPointerDown={() => {
          const forward = new THREE.Vector3(Math.sin(yaw.current), 0, -Math.cos(yaw.current));
          playerPos.current.add(forward.multiplyScalar(0.5));
        }}
      >
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#333" />
      </mesh>

      {obstaclesList.map((o, i) => (
        <DangerZone
          key={i}
          position={[playerPos.current.x + o.x, 0.02, playerPos.current.z + o.z]}
        />
      ))}

      {nodes.map((n, i) => {
        const next = nodes[i + 1];
        let direction = new THREE.Vector3(0, 0, 1);
        if (next) direction = next.pos.clone().sub(n.pos).normalize();
        return (
          <group key={i}>
            <GlowingPath position={n.pos} isDanger={n.isDanger} />
            {!n.isDanger && i % 2 === 0 && (
              <DirectionArrow position={n.pos} direction={direction} />
            )}
          </group>
        );
      })}
    </>
  );
};

export default function ARScene() {
  const [status, setStatus] = useState<'scanning' | 'active' | 'warning'>('scanning');
  const [viewMode, setViewMode] = useState<'first-person' | 'top-down' | 'side'>('first-person');

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative' }}>
      
      {/* HUD CONTROLS */}
      <div style={{ 
        position: 'absolute', top: '20px', right: '20px', zIndex: 2000, 
        display: 'flex', flexDirection: 'column', gap: '8px' 
      }}>
        <button onClick={() => setViewMode('first-person')} style={navBtnStyle}>Person View</button>
        <button onClick={() => setViewMode('top-down')} style={navBtnStyle}>Top Map</button>
        <button onClick={() => setViewMode('side')} style={navBtnStyle}>Side View</button>
      </div>

      <Canvas camera={{ fov: 75 }}>
        <Scene setStatus={setStatus} viewMode={viewMode} />
      </Canvas>
    </div>
  );
}

const navBtnStyle = {
  padding: '12px 16px',
  background: 'rgba(0, 255, 255, 0.8)',
  border: 'none',
  borderRadius: '8px',
  color: '#000',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: '14px',
  boxShadow: '0 4px 15px rgba(0, 255, 255, 0.3)'
};