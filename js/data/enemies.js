/* PAPERWEIGHT — the things in the house.
 *
 * None of them are evil. They are objects that were loved and then misplaced,
 * and they have opinions about that. Most can be beaten. Several can instead be
 * HELD until they settle, which ends the fight without a fight — the game never
 * says so out loud, but it always notices.
 */
'use strict';

PW.enemies = (function () {

  var E = {

    /* ------------------------------------------------------- chapter 1 -- */
    dustling: {
      name: 'Dustling', sprite: 'en_dustling', scale: 0.21, xp: 7, gold: 0,
      hp: 26, atk: 8, def: 4, spd: 7, lean: null,
      desc: 'A soft grey ball of everything the house stopped noticing. It is ' +
            'mostly asleep.',
      actions: [
        { w: 3, name: 'bumps into you', power: 0.9 },
        { w: 2, name: 'kicks up a cloud', power: 0.5, debuff: { acc: 0.75, turns: 2 } },
        { w: 2, name: 'yawns enormously', power: 0, line: '{e} yawns. It is contagious.',
          moodTarget: { id: 'steady', amt: 1 } }
      ],
      soothe: { turns: 1, drop: 'sock',
        text: 'It goes limp in your hands like a warm loaf and stops being a problem.' },
      drops: [{ id: 'sock', chance: 0.3 }, { id: 'sweet', chance: 0.25 }]
    },

    chippedcup: {
      name: 'Chipped Cup', sprite: 'en_chippedcup', scale: 0.24, xp: 11,
      hp: 34, atk: 10, def: 6, spd: 11, lean: 'tender',
      desc: 'It has a piece missing and would like you to know exactly where and ' +
            'exactly when.',
      actions: [
        { w: 3, name: 'slops cold tea', power: 1.0 },
        { w: 3, name: 'shows you the chip', power: 0, line: '{e} shows you the chip. Again.',
          moodTarget: { id: 'tender', amt: 1, force: true } },
        { w: 2, name: 'rattles on its saucer', power: 0.7, hits: 2 }
      ],
      soothe: { turns: 2, drop: 'jam',
        text: 'You hold it the way you hold a cup that matters. It stops rattling.' },
      drops: [{ id: 'jam', chance: 0.3 }, { id: 'plaster', chance: 0.25 }]
    },

    hourmoth: {
      name: 'Hour Moth', sprite: 'en_hourmoth', scale: 0.25, xp: 14,
      hp: 38, atk: 11, def: 7, spd: 15, lean: null,
      desc: 'Its wings are two clocks that disagree. Being near it makes it hard ' +
            'to remember how long you have been here.',
      actions: [
        { w: 3, name: 'beats its wings', power: 1.0 },
        { w: 3, name: 'loses an hour', power: 0.3, drainBp: 10,
          line: '{e} loses an hour somewhere. You feel it go.' },
        { w: 1, name: 'goes very still', power: 0, heal: 0.2 }
      ],
      drops: [{ id: 'sweet', chance: 0.35 }, { id: 'crane', chance: 0.2 }]
    },

    /* ------------------------------------------------------- chapter 2 -- */
    mitten: {
      name: 'Mitten', sprite: 'en_mitten', scale: 0.23, xp: 18,
      hp: 44, atk: 15, def: 8, spd: 12, lean: 'frayed',
      desc: 'Someone knitted this with love and it grew teeth anyway. That happens.',
      actions: [
        { w: 4, name: 'nips', power: 1.15, dot: { dmg: 0.3, turns: 2 } },
        { w: 2, name: 'unravels a little', power: 0.8, selfMood: { id: 'frayed', amt: 1 } },
        { w: 2, name: 'chatters its teeth', power: 0, moodTarget: { id: 'frayed', amt: 1 } }
      ],
      drops: [{ id: 'sock', chance: 0.35 }, { id: 'jam', chance: 0.2 }]
    },

    emptycoat: {
      name: 'Empty Coat', sprite: 'en_emptycoat', scale: 0.3, xp: 22,
      hp: 56, atk: 14, def: 13, spd: 8, lean: 'distant',
      desc: 'It is holding its arms out. There is nobody in it. It has been ' +
            'holding its arms out for a while.',
      actions: [
        { w: 3, name: 'reaches for you', power: 1.1, moodTarget: { id: 'distant', amt: 1 } },
        { w: 2, name: 'falls closed', power: 0, buff: { def: 1.5, turns: 2 },
          line: '{e} folds itself shut.' },
        { w: 3, name: 'sleeves you across the room', power: 1.35 }
      ],
      soothe: { turns: 3, drop: 'thimble',
        text: 'You put your arms into the sleeves. The coat sags, satisfied, and ' +
              'becomes a coat.' },
      drops: [{ id: 'thimble', chance: 0.3 }, { id: 'plaster', chance: 0.3 }]
    },

    /* ------------------------------------------------------- chapter 3 -- */
    sorrowvine: {
      name: 'Sorrowvine', sprite: 'en_sorrowvine', scale: 0.3, xp: 26,
      hp: 62, atk: 14, def: 11, spd: 9, lean: 'tender',
      desc: 'A flower with its head bowed. The water underneath it is not ' +
            'rainwater.',
      actions: [
        { w: 3, name: 'weeps openly', power: 0, all: true,
          moodTargetAll: { id: 'tender', amt: 1, force: true },
          line: '{e} weeps, and it is very hard not to join in.' },
        { w: 3, name: 'lashes with a wet stem', power: 1.2 },
        { w: 2, name: 'drinks deep', power: 0.6, drain: 0.6 }
      ],
      soothe: { turns: 2, drop: 'crane',
        text: 'You hold the bloom up so it is not looking at the floor. It stays up.' },
      drops: [{ id: 'jam', chance: 0.3 }, { id: 'crane', chance: 0.3 }]
    },

    staticchild: {
      name: 'Static Child', sprite: 'en_staticchild', scale: 0.3, xp: 34,
      hp: 78, atk: 19, def: 14, spd: 13, lean: 'distant',
      desc: 'It is the right size and it is standing in the right place and there ' +
            'is no face on it at all. Do not look for one.',
      actions: [
        { w: 3, name: "won't answer", power: 1.25, moodTarget: { id: 'distant', amt: 1 } },
        { w: 2, name: 'is suddenly closer', power: 1.5 },
        { w: 2, name: 'goes to noise', power: 0.9, all: true },
        { w: 1, name: 'stands very still', power: 0, buff: { def: 1.6, turns: 2 } }
      ],
      drops: [{ id: 'pencil', chance: 0.35 }, { id: 'sweet', chance: 0.3 }]
    },

    /* ---------------------------------------------------------- bosses -- */
    pilotlight: {
      name: 'PILOT LIGHT', sprite: 'en_pilotlight', scale: 0.42, xp: 90, boss: true,
      hp: 240, atk: 18, def: 14, spd: 8, lean: 'frayed',
      desc: 'The stove she cooked on for forty years. It has been kept lit this ' +
            'whole time and nobody has come to use it.',
      music: 'boss',
      actions: [
        { w: 3, name: 'flares up', power: 1.2 },
        { w: 3, name: 'roars in its grate', power: 0.8, all: true,
          moodTargetAll: { id: 'frayed', amt: 1 } },
        { w: 2, name: 'slams its door', power: 1.5 },
        { w: 1, name: 'bangs the kettle', power: 0, buff: { atk: 1.3, turns: 3 },
          line: '{e} bangs the kettle on its own head. It is furious and it is ' +
                'also cooking.' }
      ],
      phases: [{
        at: 0.45, line: 'PILOT LIGHT burns low, and the kitchen goes orange and quiet.',
        set: { lean: 'steady' },
        actions: [
          { w: 3, name: 'burns steadily', power: 1.35 },
          { w: 3, name: 'offers you the warm side', power: 0.6,
            moodTargetAll: { id: 'tender', amt: 1, force: true }, all: true,
            line: '{e} turns its warm side toward you. That is somehow worse.' },
          { w: 2, name: 'settles into embers', power: 0, heal: 0.08 }
        ]
      }],
      soothe: { turns: 4, drop: null, xpMult: 1.0,
        text: 'You put both hands flat on the warm iron and just stand there, the ' +
              'way you used to while she cooked. The fire goes down to a hum.' }
    },

    drownedlily: {
      name: 'THE DROWNED LILY', sprite: 'en_drownedlily', scale: 0.41, xp: 140, boss: true,
      hp: 330, atk: 21, def: 17, spd: 11, lean: 'tender',
      desc: 'It has her face, if her face were made of water and asleep. It is ' +
            'not her. You keep having to decide that again.',
      music: 'boss',
      actions: [
        { w: 3, name: 'closes over you', power: 1.25 },
        { w: 3, name: 'says your name wrong', power: 0.7, all: true,
          moodTargetAll: { id: 'tender', amt: 1, force: true },
          line: '{e} says a name. It is close to yours. It is not yours.' },
        { w: 2, name: 'pulls you under', power: 1.1, moodTarget: { id: 'distant', amt: 1 } },
        { w: 2, name: 'drinks the room', power: 0.5, drain: 1.0, all: true }
      ],
      phases: [{
        at: 0.4, line: 'The water goes still. Underneath it, the face opens its eyes.',
        actions: [
          { w: 4, name: 'looks at you properly', power: 1.5,
            moodTarget: { id: 'tender', amt: 1, force: true } },
          { w: 3, name: 'floods the glasshouse', power: 1.0, all: true },
          { w: 2, name: 'holds its breath', power: 0, buff: { def: 1.4, turns: 2 } }
        ]
      }],
      soothe: { turns: 5,
        text: 'You do not fight it. You sit down in the water and let it hold your ' +
              'sleeve until it is finished. It sinks, gently, like something being ' +
              'put to bed.' }
    },

    nameless: {
      name: 'THE NAMELESS', sprite: 'en_nameless', scale: 0.45, xp: 200, boss: true,
      hp: 400, atk: 25, def: 19, spd: 14, lean: 'distant',
      desc: 'It is very patient and it is very gentle and it is taking the labels ' +
            'off everything, one at a time, and it will get to you.',
      music: 'dread', tension: 0.85,
      actions: [
        { w: 3, name: 'reaches out with the eraser', power: 1.3,
          moodTarget: { id: 'distant', amt: 1, force: true } },
        { w: 3, name: 'takes a name off something', power: 0.9, all: true, drainBp: 8,
          line: '{e} rubs out a label. You cannot remember what was in that box.' },
        { w: 2, name: 'goes blank', power: 0, buff: { def: 1.5, turns: 2 },
          line: '{e} stops having edges for a moment.' },
        { w: 2, name: 'starts on you', power: 1.6 }
      ],
      phases: [{
        at: 0.35, line: 'It puts the eraser down. That is much, much worse.',
        actions: [
          { w: 4, name: 'holds out an empty hand', power: 1.7,
            moodTargetAll: { id: 'distant', amt: 1, force: true }, all: true },
          { w: 3, name: 'waits', power: 0, heal: 0.05,
            line: '{e} waits. It is extremely good at waiting.' },
          { w: 3, name: 'is standing where you were', power: 2.0 }
        ]
      }]
    },

    thehouse: {
      name: 'THE HOUSE THAT FORGETS', sprite: 'en_thehouse', scale: 0.5, xp: 320, boss: true,
      hp: 560, atk: 27, def: 20, spd: 10, lean: null,
      desc: 'All of it at once: every room, every door, every thing she knew. It ' +
            'is coming apart and it is trying very hard to be gentle about it.',
      music: 'boss', tension: 0.5,
      actions: [
        { w: 3, name: 'opens all its doors', power: 1.15, all: true },
        { w: 3, name: 'shows you a room you forgot', power: 1.3,
          moodTarget: { id: 'tender', amt: 1, force: true } },
        { w: 2, name: 'a staircase comes down', power: 1.6 },
        { w: 2, name: 'sheds another wall', power: 0.6, all: true, drainBp: 6 },
        { w: 1, name: 'says something in her voice', power: 0, all: true,
          moodTargetAll: { id: 'frayed', amt: 1, force: true },
          line: '{e} speaks, and for one whole second it is exactly her.' }
      ],
      phases: [
        { at: 0.6, line: 'The wallpaper goes. Underneath, it is only paper.',
          actions: [
            { w: 3, name: 'opens all its doors', power: 1.3, all: true },
            { w: 3, name: 'holds a room out to you', power: 1.5,
              moodTarget: { id: 'tender', amt: 1, force: true } },
            { w: 3, name: 'a whole floor gives way', power: 1.8 }
          ] },
        { at: 0.25, line: 'It stops trying to hold its own shape and just looks at you.',
          actions: [
            { w: 4, name: 'lets go of another room', power: 1.6, all: true },
            { w: 3, name: 'asks you to stay', power: 1.2,
              moodTargetAll: { id: 'tender', amt: 2, force: true }, all: true,
              line: '{e} asks you to stay. It does not use words.' },
            { w: 2, name: 'begins to fold up', power: 0, heal: 0.04 }
          ] }
      ],
      soothe: { turns: 6, ending: true,
        text: 'You stop hitting the house. You put both arms as far around it as ' +
              'they will go, which is not far at all, and you hold on.' }
    }
  };

  for (var k in E) E[k].id = k;
  return E;
})();

/* ---------------------------------------------------------------- troops -- */

PW.troops = {
  tutorial:   { foes: ['dustling'], bg: 'bb_hub', music: 'battle', noFlee: true },
  hub_a:      { foes: ['dustling', 'dustling'], bg: 'bb_hub' },
  hub_b:      { foes: ['dustling', 'chippedcup'], bg: 'bb_hub' },
  hub_c:      { foes: ['chippedcup', 'hourmoth'], bg: 'bb_hub' },

  kitchen_a:  { foes: ['mitten', 'chippedcup'], bg: 'bb_kitchen' },
  kitchen_b:  { foes: ['mitten', 'mitten', 'dustling'], bg: 'bb_kitchen' },
  kitchen_c:  { foes: ['emptycoat', 'mitten'], bg: 'bb_kitchen' },
  boss_stove: { foes: ['pilotlight'], bg: 'bb_kitchen', boss: true, noFlee: true },

  garden_a:   { foes: ['sorrowvine', 'hourmoth'], bg: 'bb_garden' },
  garden_b:   { foes: ['sorrowvine', 'sorrowvine'], bg: 'bb_garden' },
  garden_c:   { foes: ['emptycoat', 'hourmoth', 'chippedcup'], bg: 'bb_garden' },
  boss_lily:  { foes: ['drownedlily'], bg: 'bb_garden', boss: true, noFlee: true },

  attic_a:    { foes: ['staticchild', 'dustling'], bg: 'bb_attic' },
  attic_b:    { foes: ['emptycoat', 'staticchild'], bg: 'bb_attic' },
  attic_c:    { foes: ['staticchild', 'staticchild'], bg: 'bb_attic' },
  boss_blank: { foes: ['nameless'], bg: 'bb_blank', boss: true, noFlee: true },

  boss_house: { foes: ['thehouse'], bg: 'bb_blank', boss: true, noFlee: true }
};
