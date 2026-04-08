import { useEffect, useRef, useState } from 'react';
import { ImageSegmenter, FilesetResolver } from '@mediapipe/tasks-vision';

export const useVision = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const segmenterRef = useRef<ImageSegmenter | null>(null);
  const [ready, setReady] = useState(false);
  
  const prevObstaclesRef = useRef<{ x: number; z: number; label: number }[]>([]);

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
        video.style.top = '0';
        video.style.left = '0';
        video.style.width = '100vw';
        video.style.height = '100vh';
        video.style.objectFit = 'cover';
        video.style.zIndex = '-1'; 
        
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

        video.onloadeddata = () => {
          setReady(true);
        };
      } catch (err) {
        console.error('Vision initialization failed:', err);
      }
    };

    initVision();

    return () => {
      if (videoRef.current) {
        document.body.removeChild(videoRef.current);
      }
    };
  }, []);

  const getObstacles = () => {
    if (!videoRef.current || !segmenterRef.current || !ready) return [];

    const result = segmenterRef.current.segmentForVideo(videoRef.current, performance.now());
    const mask = result.categoryMask?.getAsUint8Array();
    
    if (!mask) return [];

    const { videoWidth: width, videoHeight: height } = videoRef.current;
    const obstacles: { x: number; z: number; label: number }[] = [];

    // 🔥 OPTIMIZED SCANNING: Smaller step = more detail
    const step = 25; 
    const horizon = 0.35; // Look higher up to see walls and coolers

    for (let y = Math.floor(height * horizon); y < height; y += step) {
      for (let x = Math.floor(width * 0.05); x < width * 0.95; x += step) {
        const index = y * width + x;
        const category = mask[index];

        // DeepLab V3: anything > 0 is a detected object/obstacle
        if (category > 0) { 
          const normX = (x / width - 0.5) * 2.0;
          const normY = (y / height); 

          // 🔥 PERSPECTIVE CORRECTION: Ensure objects close to the phone register
          const depth = -3.0 / (normY - horizon + 0.05); 
          const lateral = normX * Math.abs(depth) * 0.9;

          if (depth < -15 || depth > -0.2) continue;

          obstacles.push({ x: lateral, z: depth, label: category });
        }
      }
    }

    // Sort by proximity (closest first)
    const limited = obstacles.sort((a, b) => Math.abs(a.z) - Math.abs(b.z)).slice(0, 20);
    prevObstaclesRef.current = limited;
    return limited;
  };

  return { ready, getObstacles };
};