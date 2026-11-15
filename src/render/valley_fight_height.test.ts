import { describe, expect, it, vi } from 'vitest';
import { createBattle } from '../core/battle';
import { PATROL_HUT_FIGHT } from '../data/patrol_hut_fight';
import { valleyBattleGround } from '../core/world/valley_battle';
import { ValleyFight } from './valley_fight';
vi.mock('./settings_store', () => ({ currentSettings: () => ({ play: { awarenessMarkers: true } }) }));
describe('world fighter drawing', () => {
  it('passes each real ground height to the character, rather than its flat-stage default', () => {
    const battle = createBattle(PATROL_HUT_FIGHT, valleyBattleGround());
    const updates = new Map(battle.fighters.slice(1).map(f => [f.id, { update: vi.fn(), fade: vi.fn(), setShown: vi.fn() }]));
    const fight = Object.create(ValleyFight.prototype);
    Object.assign(fight, { battle, views: updates, camera: { position: { x: 0, y: 5, z: 0 } },
      arrows: { sync: vi.fn() }, bursts: { update: vi.fn() }, hud: { frame: vi.fn() }, chromeShown: true });
    fight.sync(1 / 60, { locked: true, zooming: false });
    for (const f of battle.fighters.slice(1)) {
      expect(f.y).not.toBe(0);
      expect(updates.get(f.id)!.update).toHaveBeenCalledWith(f, f.y);
    }
  });
});
