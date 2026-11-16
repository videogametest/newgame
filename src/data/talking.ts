// Item 24. One written group by id; no dialogue is retyped in game code.
import { writtenGroup, type DialogueRef } from '../core/people/dialogue';
import type { ConversationPage, Answer } from '../core/speech/conversation';
import { wickHouses, bearingVector } from '../village/plan';
import { VALLEY_SEED } from '../core/world/valley';
import { TUNING } from '../config/tuning';
const house = wickHouses(VALLEY_SEED).find(h => h.id === 'hesper');
if (!house) throw new Error("Hesper's cottage is missing");
const out = bearingVector(house.facing);
export const HESPER = {
  id: 'hesper', name: house.who.split(',')[0], group: 'hesper.arrival',
  x: house.x + out.x * TUNING.talking.doorOffset,
  z: house.z + out.z * TUNING.talking.doorOffset,
  yaw: Math.atan2(out.x, out.z),
};
export function conversationPages(ref: DialogueRef, speaker: string, name: string): ConversationPage[] {
  return writtenGroup(ref).map((l, i) => ({
    id: `${ref.group}.${i}`, speaker: l.speaker?.toLowerCase() ?? speaker, name: l.speaker ?? name, text: l.text,
  }));
}
/** Optional authored answers, for tutorial/service actions. Not added to Hesper's arrival. */
export function writtenAnswers(ref: DialogueRef): Answer[] {
  const lines = writtenGroup(ref);
  if (lines.length > 3) throw new Error('At most three authored answers');
  return lines.map((l, i) => ({ id: `${ref.group}.${i}`, text: l.text }));
}
