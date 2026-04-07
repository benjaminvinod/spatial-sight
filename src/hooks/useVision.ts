import { useEffect, useRef, useState } from 'react';

export const useVision = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [ready, setReady] = useState(false);

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

  // 🔥 SIMPLE OBSTACLE DETECTION
  const getObstacles = () => {
    if (!videoRef.current || !canvasRef.current || !ready) return [];

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return [];

    ctx.drawImage(videoRef.current, 0, 0);

    const imageData = ctx.getImageData(
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );

    const data = imageData.data;

    const obstacles = [];

    // 🔥 SAMPLE PIXELS (LIGHTWEIGHT)
    for (let i = 0; i < data.length; i += 5000) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const brightness = (r + g + b) / 3;

      // Dark = obstacle
      if (brightness < 60) {
        const index = i / 4;
        const x = index % canvasRef.current.width;
        const y = Math.floor(index / canvasRef.current.width);

        // Convert to world space (approx)
        const worldX = (x / canvasRef.current.width - 0.5) * 10;
        const worldZ = (y / canvasRef.current.height - 0.5) * -10;

        obstacles.push({ x: worldX, z: worldZ });
      }
    }

    return obstacles.slice(0, 10); // limit
  };

  return {
    ready,
    getObstacles,
  };
};