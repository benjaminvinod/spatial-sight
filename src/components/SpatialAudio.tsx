import * as THREE from 'three';

let audioCtx: AudioContext | null = null;

export const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

export const playSpatialAlert = (
  position: THREE.Vector3,
  duration = 0.2,
  isDanger = false
) => {
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const panner = audioCtx.createPanner();

  panner.panningModel = 'HRTF';

  panner.positionX.value = position.x;
  panner.positionY.value = position.y;
  panner.positionZ.value = position.z;

  osc.type = isDanger ? 'square' : 'sine';
  osc.frequency.value = isDanger ? 220 : 880;

  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

  osc.connect(gain);
  gain.connect(panner);
  panner.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + duration);
};