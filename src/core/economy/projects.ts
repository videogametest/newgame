// Rebuilding Wick (GAME_DESIGN.md section 6). Each project is paid for once and is then visible in the world.
// Names and lines are from docs/writing/interface.md, used exactly as written. Costs are untuned placeholders.
import { spend, type Purse } from './purse';

export interface ProjectDef {
  id: string;
  name: string;
  line: string;
  cost: number;
  /** What it changes, read by the system that owns the effect. */
  effect: string;
  /** Projects that must be built first. */
  needs?: string[];
}

export const PROJECTS: readonly ProjectDef[] = [
  { id: 'east_road_lanterns', name: 'Lanterns on the east road', line: "Wolves won't cross a lit road.", cost: 60, effect: 'road_safe_east' },
  { id: 'mill_road_lanterns', name: 'Lanterns on the mill road', line: 'So the Marrins can get home after dark.', cost: 60, effect: 'road_safe_mill' },
  { id: 'well', name: 'The well', line: 'It has had a dead tree across it for nine years.', cost: 40, effect: 'well_gathering' },
  { id: 'forge_bridge', name: 'The bridge to the Forge', line: 'Two planks left. Aldric uses the ford and complains.', cost: 90, effect: 'bridge_open' },
  { id: 'market_stalls', name: 'The market stalls', line: 'Somewhere for people to stand and argue about prices.', cost: 120, effect: 'market_open', needs: ['well'] },
  { id: 'inn', name: 'The inn', line: 'Bess Hollin will tell you what it needs. At length.', cost: 200, effect: 'inn_open', needs: ['market_stalls'] },
  { id: 'village_bell', name: 'The village bell', line: 'Amos Rudd has kept the rope.', cost: 150, effect: 'dusk_bell' },
];

export type BuildRefusal = 'unknown_project' | 'already_built' | 'needs_another_first' | 'not_enough_crowns';

/** Pay for a project. Returns the new purse and the list to store in GameState.projectsBuilt. */
export function build(purse: Purse, built: readonly string[], projectId: string, projects: readonly ProjectDef[] = PROJECTS):
  { purse: Purse; built: string[]; effect: string } | BuildRefusal {
  const project = projects.find(p => p.id === projectId);
  if (!project) return 'unknown_project';
  if (built.includes(projectId)) return 'already_built';
  if ((project.needs ?? []).some(n => !built.includes(n))) return 'needs_another_first';
  const paid = spend(purse, project.cost);
  if (!paid) return 'not_enough_crowns';
  return { purse: paid, built: [...built, projectId], effect: project.effect };
}

/** Projects the hero could pay for now, for the rebuilding screen. */
export function available(built: readonly string[], projects: readonly ProjectDef[] = PROJECTS): ProjectDef[] {
  return projects.filter(p => !built.includes(p.id) && (p.needs ?? []).every(n => built.includes(n)));
}

export function totalCost(projects: readonly ProjectDef[] = PROJECTS): number {
  return projects.reduce((sum, p) => sum + p.cost, 0);
}
