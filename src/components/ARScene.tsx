import { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useVision } from '../hooks/useVision';

interface PathNode {
  pos: THREE.Vector3;
  isDanger: boolean;
}

const GlowingPath = ({ position, isDanger }: any) => {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.8, 0.8]} />
      <meshBasicMaterial color={isDanger ? 'red' : 'cyan'} />
    </mesh>
  );
};

const Scene = ({ setStatus }: any) => {
  const { camera } = useThree();
  const { getObstacles, ready } = useVision();

  const [nodes, setNodes] = useState<PathNode[]>([]);

  const playerPos = useRef(new THREE.Vector3(0, 0, 0));
  const keys = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const down = (e: KeyboardEvent) => (keys.current[e.key.toLowerCase()] = true);
    const up = (e: KeyboardEvent) => (keys.current[e.key.toLowerCase()] = false);

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);

    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  useFrame(() => {
    const speed = 0.08;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    if (keys.current['w']) playerPos.current.add(forward.clone().multiplyScalar(speed));
    if (keys.current['s']) playerPos.current.add(forward.clone().multiplyScalar(-speed));
    if (keys.current['a']) playerPos.current.add(right.clone().multiplyScalar(-speed));
    if (keys.current['d']) playerPos.current.add(right.clone().multiplyScalar(speed));

    camera.position.x = playerPos.current.x;
    camera.position.z = playerPos.current.z;

    // 🔥 REAL-TIME PATH GENERATION
    const obstacles = getObstacles().map(o => new THREE.Vector3(o.x, 0, o.z));

    const newNodes: PathNode[] = [];
    let current = playerPos.current.clone();
    const stepSize = 0.6;

    let hasDanger = false;

    for (let i = 0; i < 15; i++) {
      let direction = forward.clone();

      for (let obs of obstacles) {
        if (current.distanceTo(obs) < 2) {
          const perp = new THREE.Vector3(-direction.z, 0, direction.x);
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

    // 🔥 STATUS UPDATE
    if (!ready) {
      setStatus('scanning');
    } else if (hasDanger) {
      setStatus('warning');
    } else {
      setStatus('active');
    }
  });

  const obstacles = getObstacles();

  return (
    <>
      <ambientLight intensity={2} />
      <pointLight position={[5, 10, 5]} intensity={4} />

      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#555" />
      </mesh>

      {obstacles.map((o, i) => (
        <mesh key={i} position={[o.x, 0, o.z]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="red" />
        </mesh>
      ))}

      {nodes.map((n, i) => (
        <GlowingPath key={i} position={n.pos} isDanger={n.isDanger} />
      ))}
    </>
  );
};

export default function ARScene() {
  const [status, setStatus] = useState<'scanning' | 'active' | 'warning'>('scanning');

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      <Canvas camera={{ position: [0, 3, 5], fov: 60 }}>
        <OrbitControls enablePan={false} enableZoom={false} />
        <Scene setStatus={setStatus} />
      </Canvas>
    </div>
  );
}