import * as THREE from 'three';

export const FloorShader = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0x004444) }, // Deep Teal
    uGridColor: { value: new THREE.Color(0x00ffff) }, // Neon Cyan
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    void main() {
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor;
    uniform vec3 uGridColor;
    varying vec2 vUv;
    varying vec3 vPosition;

    void main() {
      // Create a moving grid effect
      vec2 grid = abs(fract(vUv * 20.0 - 0.5) - 0.5) / fwidth(vUv * 20.0);
      float line = min(grid.x, grid.y);
      float gridLine = 1.0 - min(line, 1.0);

      // Add a subtle radial gradient so the floor fades out in the distance
      float dist = distance(vUv, vec2(0.5));
      float mask = smoothstep(0.5, 0.2, dist);

      // Add a pulsing wave effect
      float wave = sin(vPosition.x * 2.0 + uTime * 2.0) * 0.5 + 0.5;
      
      vec3 finalColor = mix(uColor, uGridColor, gridLine * 0.5);
      gl_FragColor = vec4(finalColor, mask * (0.2 + wave * 0.1));
    }
  `
};