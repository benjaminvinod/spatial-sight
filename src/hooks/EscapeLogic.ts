import * as THREE from 'three';

export interface PuzzleNode {
  id: number;
  name: string;
  hint: string;
  targetPos: { x: number; z: number };
  riddle: string;
  answer: string;
}

export const ESCAPE_GAME = {
  proximityThreshold: 0.8, // Distance to trigger riddle
  pingRadius: 3.5,          // Distance to start audio pings
  
  puzzles: [
    {
      id: 1,
      name: "The Entry Fragment",
      hint: "I have keys but no locks. Find me 2 meters ahead.",
      targetPos: { x: 0, z: -2.0 }, 
      riddle: "What has keys but can't open locks?",
      answer: "keyboard"
    },
    {
      id: 2,
      name: "The Cooling Core",
      hint: "I chill but never freeze. Search near the Voltas unit.",
      targetPos: { x: 1.5, z: -4.0 }, 
      riddle: "I speak without a mouth and hear without ears. What am I?",
      answer: "echo"
    }
  ] as PuzzleNode[]
};