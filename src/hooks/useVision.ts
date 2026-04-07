import { useEffect, useRef, useState } from 'react';

export const useVision = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [ready, setReady] = useState(false);

  // 🔥 STORE PREVIOUS FRAME FOR SMOOTHING
  const prevObstaclesRef = useRef<{ x: number; z: number }[]>([]);

  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });

        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();

        const canvas = document.createElement('canvas');

        videoRef.current = video;
        canvasRef.current = canvas;

        video.onloadeddata = () => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          setReady(true);
        };
      } catch (err) {
        console.error('Camera error:', err);
      }
    };

    initCamera();
  }, []);

  // 🔥 IMPROVED OBSTACLE DETECTION WITH SMOOTHING
  const getObstacles = () => {
    if (!videoRef.current || !canvasRef.current || !ready) return [];

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return [];

    ctx.drawImage(videoRef.current, 0, 0);

    const { width, height } = canvasRef.current;

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const newObstacles: { x: number; z: number }[] = [];

    // 🔥 BETTER SAMPLING (LESS NOISE)
    for (let i = 0; i < data.length; i += 20000) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const brightness = (r + g + b) / 3;

      if (brightness < 60) {
        const index = i / 4;
        const x = index % width;
        const y = Math.floor(index / width);

        // 🔥 FOCUS: CENTER + LOWER HALF (WHERE FLOOR IS)
        if (
          x > width * 0.3 &&
          x < width * 0.7 &&
          y > height * 0.4
        ) {
          const worldX = (x / width - 0.5) * 5;
          const worldZ = (y / height) * -6;

          newObstacles.push({ x: worldX, z: worldZ });
        }
      }
    }

    // 🔥 LIMIT COUNT
    const limited = newObstacles.slice(0, 5);

    // 🔥 TEMPORAL SMOOTHING
    const smoothed = limited.map((obs, i) => {
      const prev = prevObstaclesRef.current[i];

      if (!prev) return obs;

      return {
        x: prev.x * 0.7 + obs.x * 0.3,
        z: prev.z * 0.7 + obs.z * 0.3,
      };
    });

    prevObstaclesRef.current = smoothed;

    return smoothed;
  };

  return {
    ready,
    getObstacles,
  };
};