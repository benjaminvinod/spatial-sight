import { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface PathNode {
  pos: THREE.Vector3;
  isDanger: boolean;
}

const GlowingPath = ({ position, isDanger }: any) => {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial color={isDanger ? 'red' : 'cyan'} />
    </mesh>
  );
};

const DestinationMarker = ({ position }: any) => {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshStandardMaterial color="lime" emissive="green" />
    </mesh>
  );
};

const Scene = ({ setDirection }: any) => {
  const [nodes, setNodes] = useState<PathNode[]>([]);
  const [destination, setDestination] = useState<THREE.Vector3 | null>(null);

  const { camera, gl } = useThree();

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

    if (destination) {
      const toTarget = destination.clone().sub(playerPos.current);
      const cross = new THREE.Vector3().crossVectors(forward, toTarget);

      if (toTarget.length() < 0.5) {
        setDirection('Destination Reached');
        setNodes([]);
      } else if (cross.y > 0.2) {
        setDirection('Turn Left');
      } else if (cross.y < -0.2) {
        setDirection('Turn Right');
      } else {
        setDirection('Move Forward');
      }
    }
  });

  const obstacles = [
    new THREE.Vector3(2, 0, -2),
    new THREE.Vector3(-2, 0, -3),
    new THREE.Vector3(1, 0, -5),
  ];

  const generatePath = (target: THREE.Vector3) => {
    setDestination(target);

    const newNodes: PathNode[] = [];
    let current = playerPos.current.clone();
    const stepSize = 0.5;

    for (let i = 0; i < 100; i++) {
      const toTarget = target.clone().sub(current);
      if (toTarget.length() < 0.5) break;

      let direction = toTarget.normalize();

      for (let obs of obstacles) {
        if (current.distanceTo(obs) < 2) {
          const perp = new THREE.Vector3(-direction.z, 0, direction.x);

          const left = current.clone().add(perp);
          const right = current.clone().sub(perp);

          const leftDist = obstacles.reduce(
            (min, o) => Math.min(min, left.distanceTo(o)),
            Infinity
          );

          const rightDist = obstacles.reduce(
            (min, o) => Math.min(min, right.distanceTo(o)),
            Infinity
          );

          direction = leftDist > rightDist ? perp : perp.negate();
        }
      }

      const next = current.clone().add(direction.multiplyScalar(stepSize));

      let isDanger = false;
      for (let obs of obstacles) {
        if (next.distanceTo(obs) < 1) isDanger = true;
      }

      newNodes.push({ pos: next.clone(), isDanger });
      current = next;
    }

    setNodes(newNodes);
  };

  // 🔥 FIXED POINTER HANDLER
  const handlePointer = (e: any) => {
    e.stopPropagation();

    const rect = gl.domElement.getBoundingClientRect();

    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const point = new THREE.Vector3();

    const hit = raycaster.ray.intersectPlane(plane, point);
    if (!hit) return;

    generatePath(point);
  };

  return (
    <>
      <ambientLight intensity={2} />
      <pointLight position={[5, 10, 5]} intensity={4} />

      <mesh
        position={[0, -0.01, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={handlePointer}
      >
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#555" />
      </mesh>

      {obstacles.map((pos, i) => (
        <mesh key={i} position={pos}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="red" />
        </mesh>
      ))}

      {nodes.map((n, i) => (
        <GlowingPath key={i} position={n.pos} isDanger={n.isDanger} />
      ))}

      {destination && <DestinationMarker position={destination} />}
    </>
  );
};

export default function ARScene() {
  const [direction, setDirection] = useState('Click to set destination');

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'white',
          fontSize: '20px',
          fontWeight: 'bold',
          zIndex: 1000,
        }}
      >
        {direction}
      </div>

      <Canvas camera={{ position: [0, 3, 5], fov: 60 }}>
        <OrbitControls enablePan={false} enableZoom={false} />
        <Scene setDirection={setDirection} />
      </Canvas>
    </div>
  );
}