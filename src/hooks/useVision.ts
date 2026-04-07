import { useEffect, useRef, useState } from 'react';
import { ImageSegmenter, FilesetResolver, ImageSegmenterResult } from '@mediapipe/tasks-vision';

/**
 * useVision Hook
 * Manages the lifecycle of the MediaPipe Image Segmenter.
 * It identifies the 'floor' (Category 3 in DeepLab V3) to help guide the user.
 */
export const useVision = () => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const segmenterRef = useRef<ImageSegmenter | null>(null);

  useEffect(() => {
    const initVision = async () => {
      try {
        // 1. Load the WASM files from the MediaPipe CDN
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        // 2. Create the segmenter with GPU delegation for real-time mobile performance
        segmenterRef.current = await ImageSegmenter.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/image_segmenter/deeplab_v3/float32/latest/deeplab_v3.tflite",
            delegate: "CPU"
          },
          runningMode: "VIDEO",
          outputCategoryMask: true,
          outputConfidenceMasks: false,
        });

        setIsReady(true);
      } catch (err) {
        console.error("Failed to initialize MediaPipe:", err);
        setError("Could not load vision engine. Check internet connection.");
      }
    };

    initVision();

    // Cleanup when the component unmounts
    return () => {
      segmenterRef.current?.close();
    };
  }, []);

  /**
   * processFrame
   * Takes a video element (from the AR camera) and returns a segmentation mask.
   * @param video - The HTMLVideoElement containing the camera feed
   */
  const processFrame = (video: HTMLVideoElement): ImageSegmenterResult | null => {
    if (!segmenterRef.current || !isReady) return null;

    try {
      const startTimeMs = performance.now();
      return segmenterRef.current.segmentForVideo(video, startTimeMs);
    } catch (err) {
      console.warn("Segmentation frame dropped:", err);
      return null;
    }
  };

  return {
    segmenter: segmenterRef.current,
    isReady,
    error,
    processFrame
  };
};