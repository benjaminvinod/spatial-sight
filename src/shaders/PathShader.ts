import * as THREE from 'three';

export const PathShader = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0x00ffff) }, // Bright Cyan
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor;
    varying vec2 vUv;

    void main() {
      // Calculate distance from the center of the plane (0.5, 0.5)
      float dist = distance(vUv, vec2(0.5));
      
      // Create a pulsing ring effect
      float pulse = 0.7 + 0.3 * sin(uTime * 5.0);
      
      // The "Glow" logic: Soft edges that fade out
      float ring = smoothstep(0.5, 0.4, dist);
      float innerHole = smoothstep(0.2, 0.3, dist);
      
      float alpha = ring * innerHole * pulse;
      
      // Final neon output
      gl_FragColor = vec4(uColor, alpha);
    }
  `
};