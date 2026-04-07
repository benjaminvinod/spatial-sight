import { useState, useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { createXRStore, XR, XROrigin, useXRHitTest } from '@react-three/xr';
import * as THREE from 'three';
import { PathShader } from '../shaders/PathShader';
import { playSpatialAlert } from './SpatialAudio';

// 1. Setup the XR Store
const store = createXRStore({
  hitTest: {
    space: 'viewer',
  },
});

const GlowingPath = ({ position }: { position: THREE.Vector3 }) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  
  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      if (material.uniforms?.uTime) {
        material.uniforms.uTime.value = state.clock.getElapsedTime();
      }
    }
  });

  return (
    <mesh ref={meshRef} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.4, 0.4]} />
      <shaderMaterial 
        args={[PathShader]} 
        transparent={true} 
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
};

const SceneContent = () => {
  const [nodes, setNodes] = useState<THREE.Vector3[]>([]);
  const lastPathPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const matrix = useMemo(() => new THREE.Matrix4(), []);

  // Correct implementation for v6 hit testing
  useXRHitTest((results, getWorldMatrix) => {
    if (results.length > 0) {
      const hit = results[0];
      getWorldMatrix(matrix, hit);

      const currentPos = new THREE.Vector3();
      currentPos.setFromMatrixPosition(matrix);

      if (currentPos.distanceTo(lastPathPos.current) > 0.5) {
        setNodes((prev) => [...prev.slice(-14), currentPos.clone()]);
        lastPathPos.current.copy(currentPos);
        playSpatialAlert(currentPos, 0.1); 
      }
    }
  }, 'viewer');

  return (
    <>
      <ambientLight intensity={1.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <XROrigin />
      
      {/* Debug Cube for Emulator Visibility */}
      <mesh position={[0, 0, -2]}>
        <boxGeometry args={[0.2, 0.2, 0.2]} />
        <meshStandardMaterial color="cyan" emissive="cyan" emissiveIntensity={2} />
      </mesh>

      {nodes.map((pos, i) => (
        <GlowingPath key={`path-${i}`} position={pos} />
      ))}
    </>
  );
};

export default function ARScene() {
  // Use a state listener to track the session status outside the Canvas
  const [isPresenting, setIsPresenting] = useState(false);

  useEffect(() => {
    // Listen to store changes to toggle UI
    const unsub = store.subscribe((state) => {
      setIsPresenting(!!state.session);
    });
    return unsub;
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'fixed', top: 0, left: 0 }}>
      {/* START Button moved OUTSIDE Canvas for stability */}
      {!isPresenting && (
        <button 
          style={{
            position: 'absolute',
            bottom: '40px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            padding: '16px 32px',
            background: '#00ffff',
            color: '#000',
            border: 'none',
            borderRadius: '50px',
            fontWeight: '900',
            fontSize: '1rem',
            boxShadow: '0 0 20px rgba(0, 255, 255, 0.5)',
            cursor: 'pointer',
            pointerEvents: 'auto'
          }}
          onClick={() => store.enterAR()}
        >
          START SPATIAL SIGHT
        </button>
      )}

      <Canvas 
        shadows={false} 
        camera={{ fov: 75 }}
        gl={{ 
          antialias: false, 
          alpha: true,
          stencil: true, // Enabled for better AR compositing
          depth: true,
          powerPreference: "high-performance",
          preserveDrawingBuffer: false 
        }}
      >
        <XR store={store}>
          <SceneContent />
        </XR>
      </Canvas>
    </div>
  );
}