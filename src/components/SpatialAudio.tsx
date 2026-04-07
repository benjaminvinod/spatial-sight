import * as THREE from 'three';

// Global Audio Context (Singleton pattern)
let audioCtx: AudioContext | null = null;

export const playSpatialAlert = (position: THREE.Vector3, duration: number = 0.1) => {
  // Initialize context on first interaction (required by browsers)
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  const panner = audioCtx.createPanner();

  // Spatial Settings
  panner.panningModel = 'HRTF'; // High-Quality 3D Sound
  panner.distanceModel = 'inverse';
  panner.positionX.setValueAtTime(position.x, audioCtx.currentTime);
  panner.positionY.setValueAtTime(position.y, audioCtx.currentTime);
  panner.positionZ.setValueAtTime(position.z, audioCtx.currentTime);

  // Sound Quality (High-pitched 'ping' for floor, lower 'thud' for walls)
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5

  // Volume Envelope (prevents clicking sounds)
  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

  oscillator.connect(gainNode);
  gainNode.connect(panner);
  panner.connect(audioCtx.destination);

  oscillator.start();
  oscillator.stop(audioCtx.currentTime + duration);
};