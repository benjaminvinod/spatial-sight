import { useEffect, useRef, useState } from 'react';
import { ImageSegmenter, FilesetResolver } from '@mediapipe/tasks-vision';

export const useVision = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const segmenterRef = useRef<ImageSegmenter | null>(null);
  const [ready, setReady] = useState(false);

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

  const scanMarker = () => {
    if (!videoRef.current || !ready) return false;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    canvas.width = 100; canvas.height = 100;
    ctx.drawImage(videoRef.current, videoRef.current.videoWidth/2 - 50, videoRef.current.videoHeight/2 - 50, 100, 100, 0, 0, 100, 100);
    const imageData = ctx.getImageData(0, 0, 100, 100).data;
    let dark = 0; let bright = 0;
    for (let i = 0; i < imageData.length; i += 4) {
      const avg = (imageData[i] + imageData[i+1] + imageData[i+2]) / 3;
      if (avg < 60) dark++; 
      if (avg > 190) bright++;
    }
    return dark > 2500 && bright > 800;
  };

  const getObstacles = () => {
    if (!videoRef.current || !segmenterRef.current || !ready) return [];
    const result = segmenterRef.current.segmentForVideo(videoRef.current, performance.now());
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
        if (category > 0) { 
          const normY = (y / height); 
          const depth = -3.0 / (normY - horizon + 0.05); 
          const lateral = ((x / width - 0.5) * 2.0) * Math.abs(depth) * 0.9;
          if (depth < -15 || depth > -0.2) continue;
          obstacles.push({ x: lateral, z: depth, label: category });
        }
      }
    }
    return obstacles.sort((a, b) => Math.abs(a.z) - Math.abs(b.z)).slice(0, 20);
  };

  return { ready, getObstacles, scanMarker };
};