// The 24 perks of Tallowmere. Owned by Claude's stream (docs/PARALLEL.md).
//
// The rule (GAME_DESIGN.md section 6): every perk changes how the hero plays. It gives a new
// action or changes a rule. Plain number increases belong to skill levels.
//
// Each perk declares its effect as data. The stream that owns the named system implements it
// when its task comes up; if an effect cannot be built as written, say so in docs/status.md.
//
// Sources: 7 from levels, 6 from Hesper's trials, 6 from people, 3 from story moments,
// 2 from secrets. Only people can be lost, and each of those has a fallback.

import type { PerkDef } from '../../core/progression/types';

/** What Hesper charges, in crowns, to teach a perk in place of someone who is gone. */
const HESPER_COST = 120;
const hesper = { kind: 'hesper', cost: HESPER_COST } as const;

export const TALLOWMERE_PERKS: readonly PerkDef[] = [
  // ---------- Archery ----------
  {
    id: 'pinning_shot',
    name: 'Pinning Shot',
    skill: 'archery',
    summary: 'An arrow to the leg pins a moving enemy where they stand for a moment.',
    ranks: [
      'Hitting a moving enemy in the leg stops them in place for two seconds.',
      'The pin lasts four seconds, and always stops a runner before the bell.',
      'A pinned enemy cannot cry out, so being pinned does not alert anyone.',
    ],
    source: { kind: 'trial', trial: 'long_shot' },
    fallback: null,
    hint: 'Hesper has a target she wants hit from a long way off.',
    effect: { system: 'combat', key: 'pinning_shot' },
  },
  {
    id: 'held_breath',
    name: 'Held Breath',
    skill: 'archery',
    summary: 'Standing still at full draw, the world slows for a breath.',
    ranks: [
      'While at full draw and not moving, time slows for one and a half seconds.',
      'The slowed moment lasts two and a half seconds.',
      'Any arrow loosed during the slowed moment counts as a perfect draw.',
    ],
    source: { kind: 'level', skill: 'archery', level: 8 },
    fallback: null,
    hint: 'Comes with practice at the bow.',
    effect: { system: 'combat', key: 'held_breath' },
  },
  {
    id: 'arc_reader',
    name: 'Arc Reader',
    skill: 'archery',
    summary: 'At full draw, a faint line shows where the arrow will fall.',
    ranks: [
      'At full draw a faint arc shows the arrow\'s path and where it lands.',
      'The arc shows which enemies stand along it, lighting each one it will reach.',
      'A perfect-draw arrow passes through the first enemy and hits a second on the arc.',
    ],
    source: { kind: 'person', person: 'fisher' },
    fallback: hesper,
    hint: 'Someone by the lake knows more about patience.',
    effect: { system: 'combat', key: 'arc_reader' },
  },
  {
    id: 'two_in_hand',
    name: 'Two in Hand',
    skill: 'archery',
    summary: 'A second arrow, held ready, follows the first at once.',
    ranks: [
      'After loosing an arrow, a second can be loosed within a second with no draw, at half strength.',
      'The second arrow strikes at full strength.',
      'A third arrow can follow the second.',
    ],
    source: { kind: 'story', moment: 'the_turn_survived' },
    fallback: null,
    hint: 'Learned the hard way, on a bad night.',
    effect: { system: 'combat', key: 'two_in_hand' },
  },

  // ---------- Stealth ----------
  {
    id: 'grass_ghost',
    name: 'Grass Ghost',
    skill: 'stealth',
    summary: 'Tall grass hides the sound of running.',
    ranks: [
      'Sprinting through tall grass makes no sound.',
      'Moving crouched through tall grass is as fast as walking.',
      'An enemy who loses sight of the hero in tall grass gives up the search twice as fast.',
    ],
    source: { kind: 'level', skill: 'stealth', level: 6 },
    fallback: null,
    hint: 'Comes with practice at going unseen.',
    effect: { system: 'stealth', key: 'grass_ghost' },
  },
  {
    id: 'long_memory',
    name: 'Long Memory',
    skill: 'stealth',
    summary: 'A marked enemy stays marked, and gives away more.',
    ranks: [
      'Marks last three times as long, and show whether the enemy is unaware, suspicious, or alert.',
      'A marked enemy\'s patrol route is drawn on the ground.',
      'Marks last until the place is freed or the hero leaves it.',
    ],
    source: { kind: 'trial', trial: 'the_count' },
    fallback: null,
    hint: 'Hesper wants a place counted from the signal hill.',
    effect: { system: 'stealth', key: 'long_memory' },
  },
  {
    id: 'dusk_cloak',
    name: 'Dusk Cloak',
    skill: 'stealth',
    summary: 'Standing still in the dark, the hero cannot be seen beyond a few paces.',
    ranks: [
      'At night, a hero who is not moving is unseen from more than a few paces away.',
      'The same holds at dusk and dawn, and in deep shade by day.',
      'Moving at a slow crouch no longer breaks it.',
    ],
    source: { kind: 'trial', trial: 'night_road' },
    fallback: null,
    hint: 'Hesper wants the valley crossed at night with nobody the wiser.',
    effect: { system: 'stealth', key: 'dusk_cloak' },
  },
  {
    id: 'light_fingers',
    name: 'Light Fingers',
    skill: 'stealth',
    summary: 'What an unaware enemy carries can be taken from them.',
    ranks: [
      'From behind an unaware enemy, take what is on their belt: keys, arrows, a purse.',
      'The clapper can be lifted from an unguarded alarm bell, so that it cannot be rung.',
      'An unaware enemy\'s weapon can be taken. When they notice, they surrender.',
    ],
    source: { kind: 'trial', trial: 'hespers_shoulder' },
    fallback: null,
    hint: 'Hesper has one last thing to ask, and it will take a while.',
    effect: { system: 'stealth', key: 'light_fingers' },
  },

  // ---------- Melee ----------
  {
    id: 'riposte',
    name: 'Riposte',
    skill: 'melee',
    summary: 'After a perfect dodge, the answering strike closes the distance by itself.',
    ranks: [
      'The strike after a perfect dodge is a lunge that reaches an enemy several paces away.',
      'The lunge also strikes a second enemy standing beside the first.',
      'The lunge knocks a light enemy off their feet.',
    ],
    source: { kind: 'level', skill: 'melee', level: 8 },
    fallback: null,
    hint: 'Comes with practice at close quarters.',
    effect: { system: 'combat', key: 'riposte' },
  },
  {
    id: 'knife_work',
    name: 'Knife Work',
    skill: 'melee',
    summary: 'Holding the throw sends a knife at each marked enemy.',
    ranks: [
      'Holding the throw sends two knives, one at each of two marked enemies.',
      'Three knives at three marked enemies.',
      'A thrown knife interrupts a heavy enemy\'s wind-up.',
    ],
    source: { kind: 'secret', place: 'waterfall_cave' },
    fallback: null,
    hint: 'Somebody behind the waterfall wrote down how it is done.',
    effect: { system: 'combat', key: 'knife_work' },
  },
  {
    id: 'flat_of_the_blade',
    name: 'Flat of the Blade',
    skill: 'melee',
    summary: 'The last blow of the combo can be turned, to knock out instead of kill.',
    ranks: [
      'Holding the attack on the third hit of the combo strikes with the pommel: an enemy it would have killed is knocked out.',
      'A pommel strike knocks out an enemy already below half health.',
      'When an enemy is knocked out this way, one enemy who saw it loses their nerve.',
    ],
    source: { kind: 'story', moment: 'first_lantern' },
    fallback: null,
    hint: 'Hesper shows it to you the day the first lantern is lit.',
    effect: { system: 'combat', key: 'flat_of_the_blade' },
  },

  // ---------- Toughness ----------
  {
    id: 'roll_with_it',
    name: 'Roll With It',
    skill: 'toughness',
    summary: 'A blow that lands no longer roots the hero to the spot.',
    ranks: [
      'The hero can dodge out of being struck, cutting a stagger short.',
      'Two dodges can be made back to back before the cooldown.',
      'The dodge carries the hero through enemies instead of stopping against them.',
    ],
    source: { kind: 'person', person: 'oona' },
    fallback: hesper,
    hint: 'The herbwife has patched up enough fighters to know how they fall.',
    effect: { system: 'combat', key: 'roll_with_it' },
  },

  // ---------- Leadership ----------
  {
    id: 'whistle',
    name: 'Whistle',
    skill: 'leadership',
    summary: 'A whistle brings the company to the hero at a run.',
    ranks: [
      'A whistle calls every companion to the hero at once, wherever they were holding.',
      'A second, lower whistle draws the nearest unaware enemy toward the sound.',
      'Companions arriving on the whistle strike the first enemy they reach with a charge.',
    ],
    source: { kind: 'level', skill: 'leadership', level: 5 },
    fallback: null,
    hint: 'Comes with practice at leading.',
    effect: { system: 'squad', key: 'whistle' },
  },
  {
    id: 'send',
    name: 'Send',
    skill: 'leadership',
    summary: 'A companion can be sent to a marked spot or a marked enemy.',
    ranks: [
      'One companion can be sent to a spot the hero is looking at, or at a marked enemy.',
      'Two companions can be sent at once, to different places.',
      'A sent companion waits hidden and strikes when the hero looses the first arrow.',
    ],
    source: { kind: 'trial', trial: 'quiet_lantern' },
    fallback: null,
    hint: 'Hesper wants a place taken without the bell being rung.',
    effect: { system: 'squad', key: 'send' },
  },
  {
    id: 'stand_down',
    name: 'Stand Down',
    skill: 'leadership',
    summary: 'A wavering enemy can be called on to give up.',
    ranks: [
      'Calling on an enemy whose leader has fallen makes them throw down their weapon.',
      'The call reaches two enemies at once.',
      'The call works on any enemy whose place has low morale, leader or no.',
    ],
    source: { kind: 'person', person: 'tobin' },
    fallback: hesper,
    hint: 'One of Stane\'s men knows what it takes to make the others stop.',
    effect: { system: 'combat', key: 'stand_down' },
  },
  {
    id: 'hold_the_line',
    name: 'Hold the Line',
    skill: 'leadership',
    summary: 'On the hero\'s word, the company closes up and will not be moved.',
    ranks: [
      'For a few seconds companions cannot be staggered, and every enemy near them turns on them.',
      'It lasts twice as long.',
      'Companions who are down get back up when it is called.',
    ],
    source: { kind: 'story', moment: 'stane_yields' },
    fallback: null,
    hint: 'A captain\'s trick. You will know it when you have seen it done.',
    effect: { system: 'squad', key: 'hold_the_line' },
  },

  // ---------- Gathering ----------
  {
    id: 'foxs_eye',
    name: 'Fox\'s Eye',
    skill: 'gathering',
    summary: 'Crouched and still, the hero sees what the ground is holding.',
    ranks: [
      'While crouched and still, nearby things worth gathering and fresh tracks stand out.',
      'The tracks of people who passed in the last day show too, and which way they went.',
      'Buried and hidden caches show.',
    ],
    source: { kind: 'trial', trial: 'the_trail' },
    fallback: null,
    hint: 'Hesper is going for a walk, and wants to be found.',
    effect: { system: 'world', key: 'foxs_eye' },
  },
  {
    id: 'quiet_hands',
    name: 'Quiet Hands',
    skill: 'gathering',
    summary: 'Gathering no longer means stopping, or being heard.',
    ranks: [
      'The hero gathers without stopping, at a walk.',
      'Gathering makes no sound, even beside an enemy.',
      'Animals do not flee until the hero draws a bow.',
    ],
    source: { kind: 'level', skill: 'gathering', level: 8 },
    fallback: null,
    hint: 'Comes with practice at living off the valley.',
    effect: { system: 'world', key: 'quiet_hands' },
  },

  // ---------- Fletching ----------
  {
    id: 'field_fletcher',
    name: 'Field Fletcher',
    skill: 'fletching',
    summary: 'Arrows can be made anywhere there is a moment\'s peace.',
    ranks: [
      'Standard arrows can be made anywhere out of a fight, a few at a time, with no campfire.',
      'Blunt, fire, and whistling arrows can be made this way too.',
      'One arrow can be made in the middle of a fight, in two seconds.',
    ],
    source: { kind: 'level', skill: 'fletching', level: 5 },
    fallback: null,
    hint: 'Comes with practice at making arrows.',
    effect: { system: 'items', key: 'field_fletcher' },
  },
  {
    id: 'sound_shafts',
    name: 'Sound Shafts',
    skill: 'fletching',
    summary: 'The hero\'s arrows come back whole, and other people\'s can be kept.',
    ranks: [
      'Arrows recovered from the ground or from a fallen enemy are never broken.',
      'Arrows that enemy archers loosed and missed with can be picked up and used.',
      'Special arrows are recovered whole as well.',
    ],
    source: { kind: 'secret', place: 'practice_ground' },
    fallback: null,
    hint: 'Somebody practised in the forest for years, and wasted nothing.',
    effect: { system: 'items', key: 'sound_shafts' },
  },
  {
    id: 'second_quiver',
    name: 'Second Quiver',
    skill: 'fletching',
    summary: 'A small second quiver holds one kind of special arrow, ready at a touch.',
    ranks: [
      'A second quiver holds one special arrow type, swapped to with a single key.',
      'It holds two types.',
      'Swapping to it takes no time: a special arrow can follow a standard one in the same draw.',
    ],
    source: { kind: 'person', person: 'garrick' },
    fallback: hesper,
    hint: 'The smith\'s apprentice makes more than hammers.',
    effect: { system: 'items', key: 'second_quiver' },
  },

  // ---------- Cooking ----------
  {
    id: 'trail_food',
    name: 'Trail Food',
    skill: 'cooking',
    summary: 'A meal is no longer lost to the first blow that lands.',
    ranks: [
      'Being hit while eating no longer stops the food from healing.',
      'Half of whatever the hero eats is shared with every companion nearby.',
      'A cooked meal\'s bonus lasts until the hero next rests.',
    ],
    source: { kind: 'level', skill: 'cooking', level: 5 },
    fallback: null,
    hint: 'Comes with practice at a cookfire.',
    effect: { system: 'items', key: 'trail_food' },
  },
  {
    id: 'night_stew',
    name: 'Night Stew',
    skill: 'cooking',
    summary: 'The right supper changes what the night is like.',
    ranks: [
      'Three new meals can be cooked, each lending one thing until dawn: quieter steps, sharper eyes in the dark, or a scent wolves avoid.',
      'A meal can carry two of the three at once.',
      'Companions who eat with the hero get the same.',
    ],
    source: { kind: 'person', person: 'marrins' },
    fallback: hesper,
    hint: 'The millers always did feed half the valley.',
    effect: { system: 'items', key: 'night_stew' },
  },

  // ---------- Smithing ----------
  {
    id: 'makers_mark',
    name: 'Maker\'s Mark',
    skill: 'smithing',
    summary: 'A thing the hero has made can be given a quality learned from another.',
    ranks: [
      'At the Forge, the special property of a unique item the hero has found can be worked into one item of the hero\'s own making. The unique item is not used up.',
      'An item can carry two such properties.',
      'A marked item can be reworked at any time, exchanging one property for another.',
    ],
    source: { kind: 'person', person: 'old_aldric' },
    fallback: hesper,
    hint: 'The old smith will not come home without his hammer.',
    effect: { system: 'items', key: 'makers_mark' },
  },
];
