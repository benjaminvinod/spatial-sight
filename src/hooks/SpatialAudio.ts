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

// Resume AudioContext when tab becomes visible again (handles iOS backgrounding)
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && audioCtx?.state === 'suspended') {
      audioCtx.resume();
    }
  });
}

export const updateListenerOrientation = (camera: THREE.Camera) => {
  if (!audioCtx) return;
  const listener = audioCtx.listener;
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

  if (listener.forwardX) {
    // Modern Web Audio API
    listener.forwardX.value = forward.x;
    listener.forwardY.value = forward.y;
    listener.forwardZ.value = forward.z;
    listener.upX.value = up.x;
    listener.upY.value = up.y;
    listener.upZ.value = up.z;
    listener.positionX.value = 0;
    listener.positionY.value = 1.6;
    listener.positionZ.value = 0;
  } else {
    // Safari fallback
    (listener as any).setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
    (listener as any).setPosition(0, 1.6, 0);
  }
};

export const playSpatialAlert = (
  position: THREE.Vector3,
  duration = 0.25,
  isDanger = false
) => {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();

  if (isDanger && "vibrate" in navigator) {
    navigator.vibrate([100, 50, 200, 50, 100]);
  }

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const panner = audioCtx.createPanner();

  panner.panningModel = 'HRTF';
  panner.distanceModel = 'exponential';

  panner.positionX.setTargetAtTime(position.x, audioCtx.currentTime, 0.05);
  panner.positionY.setTargetAtTime(position.y, audioCtx.currentTime, 0.05);
  panner.positionZ.setTargetAtTime(position.z, audioCtx.currentTime, 0.05);

  osc.type = isDanger ? 'square' : 'sine';
  osc.frequency.setTargetAtTime(isDanger ? 220 : 880, audioCtx.currentTime, 0.01);

  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(isDanger ? 0.5 : 0.2, audioCtx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

  osc.connect(gain);
  gain.connect(panner);
  panner.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + duration);
};

export const playScanProgressTone = (progress: number) => {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  // Frequency sweeps from 440Hz → 880Hz as progress goes 0 → 1
  const freq = 440 + progress * 440;
  osc.type = 'sine';
  osc.frequency.setTargetAtTime(freq, audioCtx.currentTime, 0.01);

  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + 0.12);
};