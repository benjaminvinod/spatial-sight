import * as THREE from 'three';

let audioCtx: AudioContext | null = null;

// 🔥 NEW: cooldown tracking
let lastAlertTime = 0;
const ALERT_COOLDOWN = 250; // ms

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
  duration = 0.25,
  isDanger = false
) => {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const now = performance.now();

  // 🔥 NEW: prevent spam
  if (now - lastAlertTime < ALERT_COOLDOWN) return;
  lastAlertTime = now;

  // 🔥 Improved vibration patterns
  if (isDanger && "vibrate" in navigator) {
    navigator.vibrate([200, 100, 200]); 
  }

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const panner = audioCtx.createPanner();

  panner.panningModel = 'HRTF';
  panner.distanceModel = 'inverse';

  panner.refDistance = 1;
  panner.maxDistance = 10;
  panner.rolloffFactor = 1.5;

  panner.positionX.setTargetAtTime(position.x, audioCtx.currentTime, 0.05);
  panner.positionY.setTargetAtTime(position.y, audioCtx.currentTime, 0.05);
  panner.positionZ.setTargetAtTime(position.z, audioCtx.currentTime, 0.05);

  // 🔥 NEW: distance-based intensity
  const distance = Math.sqrt(position.x ** 2 + position.z ** 2);
  const normalized = Math.max(0, Math.min(1, 1 - distance / 5));

  const intensity = isDanger ? normalized * normalized : normalized;

  osc.type = isDanger ? 'square' : 'sine';
  osc.frequency.setTargetAtTime(isDanger ? 220 : 880, audioCtx.currentTime, 0.01);

  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(intensity * (isDanger ? 0.8 : 0.3), audioCtx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

  osc.connect(gain);
  gain.connect(panner);
  panner.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + duration);

  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
    panner.disconnect();
  };
};


// 🔥 Directional Navigation Audio
export const playNavigationCue = (
  direction: 'left' | 'right' | 'forward'
) => {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const panner = audioCtx.createStereoPanner();

  let pan = 0;
  if (direction === 'left') pan = -1;
  if (direction === 'right') pan = 1;

  panner.pan.setValueAtTime(pan, audioCtx.currentTime);

  let freq = 600;
  if (direction === 'left') freq = 500;
  if (direction === 'right') freq = 900;
  if (direction === 'forward') freq = 700;

  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

  // 🔥 smoother + less harsh
  gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.2, audioCtx.currentTime + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);

  osc.connect(gain);
  gain.connect(panner);
  panner.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + 0.3);

  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
    panner.disconnect();
  };
};


// 🔥 Continuous Guidance Tone
let navOsc: OscillatorNode | null = null;
let navGain: GainNode | null = null;
let navPanner: StereoPannerNode | null = null;

export const startNavigationTone = (direction: 'left' | 'right' | 'forward') => {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();

  stopNavigationTone();

  navOsc = audioCtx.createOscillator();
  navGain = audioCtx.createGain();
  navPanner = audioCtx.createStereoPanner();

  let pan = 0;
  if (direction === 'left') pan = -0.8;
  if (direction === 'right') pan = 0.8;

  navPanner.pan.setValueAtTime(pan, audioCtx.currentTime);

  let freq = 400;
  if (direction === 'left') freq = 350;
  if (direction === 'right') freq = 900;
  if (direction === 'forward') freq = 600;

  navOsc.type = 'sine';

  // 🔥 NEW: smooth frequency transition
  navOsc.frequency.setValueAtTime(freq * 0.8, audioCtx.currentTime);
  navOsc.frequency.linearRampToValueAtTime(freq, audioCtx.currentTime + 0.1);

  navGain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
  navGain.gain.exponentialRampToValueAtTime(0.08, audioCtx.currentTime + 0.15);

  navOsc.connect(navGain);
  navGain.connect(navPanner);
  navPanner.connect(audioCtx.destination);

  navOsc.start();
};

export const stopNavigationTone = () => {
  if (navOsc) {
    try {
      navOsc.stop();
    } catch {}
    navOsc.disconnect();
    navOsc = null;
  }
  if (navGain) {
    navGain.disconnect();
    navGain = null;
  }
  if (navPanner) {
    navPanner.disconnect();
    navPanner = null;
  }
};