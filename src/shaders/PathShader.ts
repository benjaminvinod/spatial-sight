import * as THREE from 'three';

export const PathShader = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0x00ffff) },
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
      // Distance from center
      float dist = distance(vUv, vec2(0.5));

      // 🔥 Stronger pulse (more visible)
      float pulse = 0.8 + 0.4 * sin(uTime * 8.0);

      // 🔥 Ring thickness (slightly thicker)
      float outer = smoothstep(0.5, 0.42, dist);
      float inner = smoothstep(0.22, 0.32, dist);
      float ring = outer * inner;

      // 🔥 Soft glow outside ring
      float glow = smoothstep(0.6, 0.3, dist) * 0.3;

      // 🔥 Subtle center fill (helps visibility)
      float fill = smoothstep(0.2, 0.0, dist) * 0.15;

      // Combine all
      float alpha = (ring + glow + fill) * pulse;

      // Clamp for safety
      alpha = clamp(alpha, 0.0, 1.0);

      gl_FragColor = vec4(uColor, alpha);
    }
  `
};