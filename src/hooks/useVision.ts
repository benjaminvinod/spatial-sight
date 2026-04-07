import { useState } from 'react';

export const useVision = () => {
  const [isReady] = useState(true);
  const [error] = useState<string | null>(null);

  const processFrame = () => {
    return null;
  };

  return {
    segmenter: null,
    isReady,
    error,
    processFrame,
  };
};