import * as THREE from 'three';

export const FloorShader = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0x050505) },
    uGridColor: { value: new THREE.Color(0x00ffff) },
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
      // 🔲 Grid pattern (existing)
      vec2 grid = abs(fract(vUv * 40.0 - 0.5) - 0.5);
      float line = min(grid.x, grid.y);
      float gridLine = smoothstep(0.04, 0.0, line);

      // 🔥 Glow around lines (existing)
      float glow = smoothstep(0.1, 0.0, line) * 0.3;

      // 🌌 ORIGINAL distance mask
      float dist = distance(vUv, vec2(0.5));
      float mask = smoothstep(0.7, 0.1, dist);

      // 🔥 NEW: perspective fade (top fades out → depth illusion)
      float perspectiveFade = smoothstep(1.0, 0.2, vUv.y);

      // 🔥 NEW: center intensity boost (feels projected from user)
      float centerBoost = 1.0 - smoothstep(0.0, 0.5, dist);

      // 🔥 Existing pulse
      float pulse = 0.15 + 0.08 * sin(uTime * 1.5);

      // 🔥 NEW: scanning line effect (AR sweep)
      float scan = sin((vUv.y + uTime * 0.5) * 20.0) * 0.5 + 0.5;
      float scanline = smoothstep(0.45, 0.55, scan) * 0.2;

      // 🎨 Combine colors
      vec3 gridColor = uGridColor * (gridLine * 0.8 + glow + scanline);

      // 🔥 Slight boost for visibility
      gridColor *= (1.0 + centerBoost * 0.5);

      vec3 finalColor = mix(uColor, gridColor, gridLine + glow + scanline);

      // 🔥 Final alpha (combined effects)
      float alpha = mask * perspectiveFade * pulse * 1.4;

      gl_FragColor = vec4(finalColor, alpha);
    }
  `
};