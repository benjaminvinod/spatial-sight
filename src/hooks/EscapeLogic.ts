export interface PuzzleNode {
  id: number;
  name: string;
  marker: 'hiro' | 'kanji';
  hint: string;
  targetPos: { x: number; z: number };
  riddle: string;
  answer: string;

  // 🔥 NEW: assistive + future extensions
  requiresScan?: boolean;
  audioHint?: string;
  difficulty?: 'easy' | 'medium' | 'hard';

  // 🔥 NEW: future-safe marker matching
  markerId?: string;
}

export const ESCAPE_GAME = {
  proximityThreshold: 1.5,
  pingRadius: 4.0,

  puzzles: [
    {
      id: 1,
      name: "The First Fragment",
      marker: "hiro",
      markerId: "hiro", // 🔥 NEW
      hint: "Find the HIRO marker 2 meters ahead.",
      targetPos: { x: 0, z: -2.0 },
      riddle: "Sum of 3 + 4 + 5",
      answer: "12",

      // 🔥 ensured defaults
      requiresScan: true,
      audioHint: "Marker directly ahead",
      difficulty: "easy"
    },
    {
      id: 2,
      name: "The Seated Sentinel",
      marker: "kanji",
      markerId: "kanji", // 🔥 NEW
      hint: "Find the KANJI marker near the chair.",
      targetPos: { x: 2.0, z: -3.0 },
      riddle: "I have cities but no houses. Mountains but no trees. What am I?",
      answer: "map",

      // 🔥 ensured defaults
      requiresScan: true,
      audioHint: "Marker slightly to the right",
      difficulty: "medium"
    }
  ] as PuzzleNode[]
};

// 🔥 NEW: helper – safe access
export const getCurrentPuzzle = (index: number): PuzzleNode | null => {
  if (index < 0 || index >= ESCAPE_GAME.puzzles.length) return null;
  return ESCAPE_GAME.puzzles[index];
};

// 🔥 NEW: helper – check if scan required
export const requiresMarkerScan = (puzzle: PuzzleNode): boolean => {
  return puzzle.requiresScan !== false; // default true
};

// 🔥 NEW: helper – proximity check (optional use in ARScene)
export const isWithinProximity = (
  playerPos: { x: number; z: number },
  targetPos: { x: number; z: number }
): boolean => {
  const dx = playerPos.x - targetPos.x;
  const dz = playerPos.z - targetPos.z;
  return Math.sqrt(dx * dx + dz * dz) <= ESCAPE_GAME.proximityThreshold;
};