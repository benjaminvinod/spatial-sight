import { useEffect, useRef, useState } from 'react';
import { ImageSegmenter, FilesetResolver } from '@mediapipe/tasks-vision';

export const useVision = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const segmenterRef = useRef<ImageSegmenter | null>(null);
  const [ready, setReady] = useState(false);

  const prevObstaclesRef = useRef<any[]>([]);
  const lastRunRef = useRef(0);
  const cachedObstaclesRef = useRef<any[]>([]);

  // 🔥 motion tracking
  const historyRef = useRef<Map<number, any[]>>(new Map());

  // 🔥 NEW: marker smoothing
  const markerHistoryRef = useRef<number[]>([]);

  // 🔥 NEW: constants
  const SMOOTHING_ALPHA = 0.35; // EMA smoothing
  const STABILITY_THRESHOLD = 0.015;

  useEffect(() => {
    const initVision = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        
        const video = document.createElement('video');
        video.srcObject = stream;
        video.setAttribute("playsinline", "true");
        video.style.position = 'fixed'; 
        video.style.top = '0'; video.style.left = '0';
        video.style.width = '100vw'; video.style.height = '100vh';
        video.style.objectFit = 'cover'; video.style.zIndex = '-1'; 
        
        document.body.appendChild(video); 
        video.play();
        videoRef.current = video;

        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        
        segmenterRef.current = await ImageSegmenter.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/image_segmenter/deeplab_v3/float32/latest/deeplab_v3.tflite",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          outputCategoryMask: true,
        });

        video.onloadeddata = () => setReady(true);
      } catch (err) {
        console.error('Vision initialization failed:', err);
      }
    };

    initVision();
    return () => { if (videoRef.current) document.body.removeChild(videoRef.current); };
  }, []);

  // 🔥 NEW: stable marker detection
  const scanMarker = () => {
    if (!videoRef.current || !ready) return false;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    canvas.width = 100; 
    canvas.height = 100;

    ctx.drawImage(
      videoRef.current,
      videoRef.current.videoWidth / 2 - 50,
      videoRef.current.videoHeight / 2 - 50,
      100, 100,
      0, 0,
      100, 100
    );

    const imageData = ctx.getImageData(0, 0, 100, 100).data;

    let dark = 0; 
    let bright = 0;

    for (let i = 0; i < imageData.length; i += 4) {
      const avg = (imageData[i] + imageData[i+1] + imageData[i+2]) / 3;
      if (avg < 60) dark++; 
      if (avg > 190) bright++;
    }

    const detected = dark > 2500 && bright > 800 ? 1 : 0;

    // 🔥 temporal smoothing (reduces flicker)
    markerHistoryRef.current.push(detected);
    if (markerHistoryRef.current.length > 5) {
      markerHistoryRef.current.shift();
    }

    const sum = markerHistoryRef.current.reduce((a, b) => a + b, 0);

    return sum >= 3; // majority vote
  };

  const getObstacles = () => {
    if (!videoRef.current || !segmenterRef.current || !ready) return [];

    const now = performance.now();
    if (now - lastRunRef.current < 100) {
      return cachedObstaclesRef.current;
    }
    lastRunRef.current = now;

    const result = segmenterRef.current.segmentForVideo(videoRef.current, now);
    const mask = result.categoryMask?.getAsUint8Array();
    if (!mask) return [];

    const { videoWidth: width, videoHeight: height } = videoRef.current;
    const obstacles: { x: number; z: number; label: number }[] = [];

    const step = 25; 
    const horizon = 0.35; 

    for (let y = Math.floor(height * horizon); y < height; y += step) {
      for (let x = Math.floor(width * 0.05); x < width * 0.95; x += step) {
        const index = y * width + x;
        const category = mask[index];

        if (category > 1) { 
          const normY = (y / height); 
          const depth = -3.0 / (normY - horizon + 0.05); 
          const lateral = ((x / width - 0.5) * 2.0) * Math.abs(depth) * 0.9;

          if (depth < -15 || depth > -0.2) continue;

          obstacles.push({ x: lateral, z: depth, label: category });
        }
      }
    }

    // 🔥 EMA smoothing + dead zone
    const smoothed = obstacles.map((o, i) => {
      const prev = prevObstaclesRef.current[i];
      if (!prev) return o;

      let dx = o.x - prev.x;
      let dz = o.z - prev.z;

      if (Math.abs(dx) < STABILITY_THRESHOLD) dx = 0;
      if (Math.abs(dz) < STABILITY_THRESHOLD) dz = 0;

      return {
        x: prev.x + dx * SMOOTHING_ALPHA,
        z: prev.z + dz * SMOOTHING_ALPHA,
        label: o.label
      };
    });

    prevObstaclesRef.current = smoothed;

    // 🔮 IMPROVED prediction (time-aware + decay)
    const predicted = smoothed.map((o, i) => {
      const key = i;

      if (!historyRef.current.has(key)) {
        historyRef.current.set(key, []);
      }

      const history = historyRef.current.get(key)!;
      history.push({ x: o.x, z: o.z, t: now });

      if (history.length > 4) history.shift();

      if (history.length < 2) return o;

      const a = history[0];
      const b = history[history.length - 1];

      const dt = b.t - a.t;
      if (dt === 0) return o;

      const vx = (b.x - a.x) / dt;
      const vz = (b.z - a.z) / dt;

      const predictionHorizon = 180; // ms
      const age = now - b.t;
      const confidence = Math.exp(-age / 300);

      return {
        x: b.x + vx * predictionHorizon * confidence,
        z: b.z + vz * predictionHorizon * confidence,
        label: o.label
      };
    });

    const finalObstacles = predicted
      .sort((a, b) => Math.abs(a.z) - Math.abs(b.z))
      .slice(0, 20);

    cachedObstaclesRef.current = finalObstacles;

    return finalObstacles;
  };

  const getObstacleZones = () => {
    const obstacles = cachedObstaclesRef.current;

    let left = 0, center = 0, right = 0;

    obstacles.forEach(o => {
      if (o.x < -0.5) left++;
      else if (o.x > 0.5) right++;
      else center++;
    });

    return { left, center, right };
  };

  const getObstacleDensity = () => {
    const obstacles = cachedObstaclesRef.current;

    const bins = new Array(9).fill(0);

    obstacles.forEach(o => {
      const angle = Math.atan2(o.x, -o.z);
      const index = Math.floor((angle + Math.PI/2) / (Math.PI/9));
      if (index >= 0 && index < bins.length) bins[index]++;
    });

    return bins;
  };

  return { 
    ready, 
    getObstacles, 
    scanMarker, 
    getObstacleZones,
    getObstacleDensity
  };
};