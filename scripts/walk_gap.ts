// Something-at-every-stop check (GAME_DESIGN v30, review 015). Reads the placed valley data and measures the
// longest walk from any walkable point to something worth stopping for. Fails over 100 m.
// Usage: npx vite-node scripts/walk_gap.ts
import { VALLEY_HALF_EXTENT, VALLEY_PLACES, VALLEY_STOPS, isWalkableGround } from '../src/core/world/valley';
import { longestStopGap } from '../src/core/world/walk_gap';

const LIMIT_M = 100;
const CELL_M = 2;

function main(): void {
  const start = VALLEY_PLACES.start;
  if (!isWalkableGround(start.x, start.z)) {
    console.error(`FAIL: the hero's start (${start.x}, ${start.z}) is not walkable ground.`);
    process.exit(1);
  }
  const report = longestStopGap({
    cell: CELL_M,
    halfExtent: VALLEY_HALF_EXTENT,
    walkable: isWalkableGround,
    stops: VALLEY_STOPS,
    start,
  });
  const at = report.at;
  const nearest = at
    ? VALLEY_STOPS.map((s) => ({ name: s.name, d: Math.hypot(s.x - at.x, s.z - at.z) })).sort((a, b) => a.d - b.d)[0]
    : null;
  console.log(JSON.stringify({
    limit_m: LIMIT_M,
    cell_m: CELL_M,
    stops: VALLEY_STOPS.map((s) => s.name),
    reachable_cells: report.reachableCells,
    stranded_cells: report.stranded,
    longest_m: Math.round(report.longest * 10) / 10,
    longest_at: at ? { x: at.x, z: at.z } : null,
    nearest_stop_to_longest: nearest,
  }, null, 2));
  if (report.stranded > 0) {
    console.error(`FAIL: ${report.stranded} reachable cells cannot walk to any stop.`);
    process.exit(1);
  }
  if (report.longest > LIMIT_M) {
    console.error(`FAIL: longest walk to something worth stopping for is ${report.longest.toFixed(1)} m (limit ${LIMIT_M} m). `
      + `Place a stop near (${at?.x}, ${at?.z}), or a signpost at a road junction.`);
    process.exit(1);
  }
  console.log(`PASS: longest walk ${report.longest.toFixed(1)} m (limit ${LIMIT_M} m).`);
}

main();
