export interface PuzzleNode {
  id: number;
  name: string;
  marker: 'hiro' | 'kanji';
  hint: string;
  targetPos: { x: number; z: number };
  riddle: string;
  answer: string;
}

export const ESCAPE_GAME = {
  proximityThreshold: 1.5,
  pingRadius: 4.0,
  puzzles: [
    {
      id: 1,
      name: "The First Fragment",
      marker: "hiro",
      hint: "Find the HIRO marker 2 meters ahead.",
      targetPos: { x: 0, z: -2.0 }, 
      riddle: "Sum of 3 + 4 + 5",
      answer: "12"
    },
    {
      id: 2,
      name: "The Seated Sentinel",
      marker: "kanji",
      hint: "Find the KANJI marker near the chair.",
      targetPos: { x: 2.0, z: -3.0 }, 
      riddle: "I have cities but no houses. Mountains but no trees. What am I?",
      answer: "map"
    }
  ] as PuzzleNode[]
};