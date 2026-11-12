// Shared types for every stream (docs/PARALLEL.md rule 1). Import from '../core/types' or '../types'.
// Battle types are in battle.ts; world, save, and item shapes are in shared.ts.
// Nothing here may import Babylon or any render code. Ground plane is (x, z); y is height.

export * from './battle';
export * from './shared';
