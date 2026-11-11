// Milestone 1 arena layout. Counts and positions are data; change them here.
export interface SpawnEntry {
  unitId: string;
  x: number;
}

export const ARENA = {
  hero: { unitId: 'hero', x: 300 },
  allies: [
    { unitId: 'soldier', x: 240 },
    { unitId: 'soldier', x: 380 },
  ] as SpawnEntry[],
  enemies: [
    { unitId: 'soldier', x: 1900 },
    { unitId: 'archer', x: 2250 },
  ] as SpawnEntry[],
};
