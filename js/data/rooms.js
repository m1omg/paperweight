/* PAPERWEIGHT — the house, room by room.
 *
 * `walk` is the floor: a union of rectangles the party's feet may stand in.
 * `block` is furniture punched back out of it. Characters scale with their y
 * position so the far end of a room reads as further away.
 *
 * Anything with a `talk` may be examined; a function is evaluated at the
 * moment of interaction so it can look at the story flags.
 */
'use strict';

PW.rooms = (function () {

  var DEPTH = { y0: 300, y1: 540, s0: 0.70, s1: 1.06 };

  var R = {

    /* ==================================================================== *
     *  THE WAKING WORLD
     * ==================================================================== */

    bedroom: {
      name: 'Your Room', bg: 'bg_bedroom', music: 'real',
      walk: [[296, 300, 396, 218]],
      block: [[296, 300, 90, 60]],
      depth: DEPTH,
      dust: { n: 22, color: 'rgba(180,200,255,' },
      spawns: {
        start: { x: 480, y: 470, dir: 'up' },
        frombed: { x: 430, y: 430, dir: 'down' }
      },
      entities: [
        { id: 'bed', x: 360, y: 380, w: 150, h: 90,
          talk: [['narrate', 'Your bed. The quilt is the one she made, and two of ' +
                  'the squares are cut from your old school pinafore.'],
                 ['narrate', 'It is late. It has been late for a while.']] },
        { id: 'window', x: 545, y: 330, w: 130, h: 60,
          talk: [['narrate', 'Rain, going sideways. The street light makes each drop ' +
                  'briefly worth looking at.'],
                 ['sfx', 'wind']] },
        { id: 'desk', x: 640, y: 380, w: 120, h: 80,
          talk: [['narrate', 'Your desk. Homework you have looked at eleven times ' +
                  'without doing.']] },
        { id: 'shelf', x: 670, y: 340, w: 110, h: 70,
          talk: function () {
            return PW.flag('took_paperweight')
              ? [['narrate', 'The shelf. There is a clean round patch in the dust now.']]
              : PW.scripts.takePaperweight;
          } },
        { id: 'door_out', x: 300, y: 430, w: 60, h: 110, kind: 'door',
          to: ['landing', 'frombedroom'],
          need: function () { return PW.flag('ch_interlude'); },
          blocked: 'You are not going anywhere tonight.' }
      ]
    },

    landing: {
      name: 'The Landing', bg: 'bg_landing', music: 'real',
      walk: [[244, 340, 470, 180]],
      depth: DEPTH,
      spawns: {
        frombedroom: { x: 330, y: 470, dir: 'right' },
        fromstreet: { x: 620, y: 500, dir: 'up' }
      },
      entities: [
        { id: 'yourdoor', x: 300, y: 400, w: 70, h: 110, kind: 'door',
          to: ['bedroom', 'start'] },
        { id: 'nelsdoor', x: 480, y: 375, w: 80, h: 120,
          talk: function () { return PW.scripts.nelsDoor; } },
        { id: 'clock', x: 590, y: 380, w: 70, h: 60,
          talk: [['narrate', 'A carriage clock that stopped at twenty past four ' +
                  'and was never wound again. Nobody has decided who is allowed to ' +
                  'wind it.']] },
        { id: 'fern', x: 620, y: 395, w: 60, h: 50,
          talk: [['narrate', 'The fern is dead. Everyone has agreed, silently, to ' +
                  'keep watering it.']] },
        { id: 'stairs', x: 660, y: 505, w: 120, h: 60, kind: 'door',
          to: ['street', 'fromhouse'] }
      ]
    },

    street: {
      name: 'Wren Street', bg: 'bg_street', music: 'real',
      walk: [[130, 330, 700, 196]],
      depth: { y0: 320, y1: 540, s0: 0.66, s1: 1.02 },
      spawns: { fromhouse: { x: 700, y: 500, dir: 'left' } },
      entities: [
        { id: 'home', x: 760, y: 460, w: 110, h: 130, kind: 'door',
          to: ['landing', 'fromstreet'] },
        { id: 'shop', x: 250, y: 390, w: 150, h: 110,
          talk: function () { return PW.scripts.shop; } },
        { id: 'puddle', x: 500, y: 480, w: 120, h: 60,
          talk: [['sfx', 'water'],
                 ['narrate', 'A puddle with the whole sky in it. You put one boot ' +
                  'in, carefully, and ruin it.']] },
        { id: 'poles', x: 620, y: 360, w: 80, h: 90,
          talk: [['narrate', 'Telephone wires, sagging. Somebody somewhere is ' +
                  'saying something to somebody.']] },
        { id: 'dell_real', x: 400, y: 460, w: 90, h: 130, sprite: 'dell', dir: 'down',
          visibleIf: function () { return !PW.flag('talked_dell_real'); },
          talk: function () { return PW.scripts.dellReal; } }
      ]
    },

    /* ==================================================================== *
     *  THE DREAM
     * ==================================================================== */

    hub: {
      name: 'The Hall of Doors', bg: 'bg_hub', music: 'dream',
      walk: [[352, 302, 258, 60], [302, 360, 358, 62], [242, 420, 478, 62],
             [176, 480, 610, 56]],
      depth: { y0: 300, y1: 540, s0: 0.55, s1: 1.05 },
      dust: { n: 40, color: 'rgba(250,238,205,' },
      spawns: {
        start: { x: 480, y: 500, dir: 'up' },
        fromkitchen: { x: 330, y: 440, dir: 'right' },
        fromgarden: { x: 630, y: 440, dir: 'left' },
        fromattic: { x: 400, y: 340, dir: 'down' },
        fromfinal: { x: 560, y: 340, dir: 'down' }
      },
      entities: [
        { id: 'door_kitchen', x: 268, y: 452, w: 90, h: 130, kind: 'door',
          to: ['kitchen', 'start'],
          label: 'a door that smells of butter',
          need: function () { return PW.state.chapter >= 2; },
          blocked: 'Locked. It is warm to the touch, which somehow makes it worse.' },

        { id: 'door_garden', x: 692, y: 452, w: 90, h: 130, kind: 'door',
          to: ['garden', 'start'],
          label: 'a door with water under it',
          need: function () { return PW.state.chapter >= 3; },
          blocked: 'Water is coming under this one. Not yet.' },

        { id: 'door_attic', x: 372, y: 356, w: 70, h: 100, kind: 'door',
          to: ['attic', 'start'],
          label: 'a door in the ceiling, which is fine',
          need: function () { return PW.state.chapter >= 4; },
          blocked: 'It is set into the ceiling at an angle that hurts to look at.' },

        { id: 'door_final', x: 588, y: 356, w: 70, h: 100,
          label: 'the door at the end of the hall',
          talk: function () { return PW.scripts.finalDoor; } },

        { id: 'wake', x: 480, y: 524, w: 190, h: 66,
          label: 'the way back',
          talk: function () { return PW.scripts.wakeDoor; } },

        { id: 'lantern', x: 300, y: 330, w: 70, h: 60,
          talk: [['narrate', 'A paper lantern, hung too high for anyone in this ' +
                  'house to have reached.']] },
        { id: 'rug', x: 480, y: 440, w: 170, h: 36,
          talk: [['narrate', 'The runner rug goes all the way down the hall and ' +
                  'then a little further than the hall goes.']] },
        { id: 'smalldoor', x: 640, y: 500, w: 60, h: 50,
          talk: [['sfx', 'door'],
                 ['narrate', 'A door the size of a shoebox. You open it. Inside is ' +
                  'a smaller hallway with smaller doors.'],
                 ['narrate', 'You close it again, politely.']] }
      ]
    },

    kitchen: {
      name: 'The Kitchen That Hums', bg: 'bg_kitchen', music: 'kitchen',
      walk: [[112, 302, 736, 232]],
      block: [[164, 412, 272, 108]],
      depth: { y0: 300, y1: 540, s0: 0.62, s1: 1.04 },
      spawns: { start: { x: 700, y: 500, dir: 'left' } },
      entities: [
        { id: 'out', x: 790, y: 500, w: 110, h: 70, kind: 'door', to: ['hub', 'fromkitchen'] },
        { id: 'stove', x: 470, y: 336, w: 190, h: 90,
          talk: function () { return PW.scripts.stove; } },
        { id: 'jars', x: 760, y: 350, w: 120, h: 90,
          talk: function () { return PW.scripts.jars; } },
        { id: 'table', x: 300, y: 470, w: 250, h: 100,
          talk: function () { return PW.scripts.table; } },
        { id: 'herbs', x: 200, y: 340, w: 110, h: 70,
          talk: function () { return PW.scripts.herbs; } },
        { id: 'recipes', x: 620, y: 330, w: 110, h: 70,
          talk: [['narrate', 'Recipe cards pegged on a line, in her handwriting, ' +
                  'which slopes uphill.'],
                 ['narrate', 'Every one of them says "a bit of" instead of an amount.']] },
        { id: 'dell_meet', x: 620, y: 440, w: 100, h: 140, sprite: 'dell', dir: 'left',
          visibleIf: function () { return !PW.party.has('dell'); },
          talk: function () { return PW.scripts.meetDell; } }
      ],
      foes: [
        { id: 'k1', troop: 'kitchen_a', sprite: 'en_mitten', x: 260, y: 360, r: 90, scale: 0.14 },
        { id: 'k2', troop: 'kitchen_b', sprite: 'en_mitten', x: 500, y: 512, r: 110, scale: 0.14 },
        { id: 'k3', troop: 'kitchen_c', sprite: 'en_emptycoat', x: 150, y: 350, r: 80, scale: 0.19 }
      ]
    },

    garden: {
      name: 'The Drowned Garden', bg: 'bg_garden', music: 'garden',
      walk: [[150, 300, 660, 218]],
      depth: { y0: 300, y1: 540, s0: 0.62, s1: 1.04 },
      dust: { n: 26, color: 'rgba(190,255,225,' },
      spawns: { start: { x: 220, y: 490, dir: 'right' } },
      entities: [
        { id: 'out', x: 160, y: 500, w: 90, h: 70, kind: 'door', to: ['hub', 'fromgarden'] },
        { id: 'lily_a', x: 330, y: 400, w: 90, h: 70,
          talk: function () { return PW.scripts.lily('a'); } },
        { id: 'lily_b', x: 500, y: 360, w: 90, h: 70,
          talk: function () { return PW.scripts.lily('b'); } },
        { id: 'lily_c', x: 670, y: 400, w: 90, h: 70,
          talk: function () { return PW.scripts.lily('c'); } },
        { id: 'wateringcan', x: 250, y: 380, w: 80, h: 60,
          talk: function () { return PW.scripts.wateringCan; } },
        { id: 'roof', x: 480, y: 310, w: 200, h: 60,
          talk: [['narrate', 'The glass roof is broken open and the sky has come ' +
                  'all the way in. There is more sky than there is room.']] },
        { id: 'foxgloves', x: 760, y: 420, w: 90, h: 80,
          talk: [['narrate', 'Foxgloves in cracked pots. She grew these and told you ' +
                  'twice a year not to eat them.']] },
        { id: 'hal_meet', x: 560, y: 480, w: 100, h: 140, sprite: 'hal', dir: 'left',
          visibleIf: function () { return !PW.party.has('hal'); },
          talk: function () { return PW.scripts.meetHal; } },
        { id: 'deepwater', x: 480, y: 505, w: 260, h: 50,
          talk: function () { return PW.scripts.deepWater; } }
      ],
      foes: [
        { id: 'g1', troop: 'garden_a', sprite: 'en_sorrowvine', x: 560, y: 470, r: 100, scale: 0.16 },
        { id: 'g2', troop: 'garden_b', sprite: 'en_sorrowvine', x: 700, y: 350, r: 70, scale: 0.16 },
        { id: 'g3', troop: 'garden_c', sprite: 'en_hourmoth', x: 470, y: 330, r: 90, scale: 0.15 }
      ]
    },

    attic: {
      name: 'The Attic of Names', bg: 'bg_attic', music: 'attic',
      walk: [[280, 300, 410, 224]],
      depth: { y0: 300, y1: 540, s0: 0.62, s1: 1.02 },
      dust: { n: 46, color: 'rgba(255,244,210,' },
      spawns: { start: { x: 480, y: 500, dir: 'up' } },
      entities: [
        { id: 'out', x: 480, y: 512, w: 140, h: 50, kind: 'door', to: ['hub', 'fromattic'] },
        { id: 'box_1', x: 330, y: 390, w: 80, h: 80, talk: function () { return PW.scripts.box(1); } },
        { id: 'box_2', x: 480, y: 355, w: 80, h: 80, talk: function () { return PW.scripts.box(2); } },
        { id: 'box_3', x: 630, y: 390, w: 80, h: 80, talk: function () { return PW.scripts.box(3); } },
        { id: 'dummy', x: 380, y: 330, w: 80, h: 90,
          talk: [['narrate', 'A dressmaker\'s dummy under a sheet. It is exactly her ' +
                  'height, because it was.']] },
        { id: 'window_a', x: 480, y: 305, w: 90, h: 50,
          talk: function () { return PW.scripts.atticWindow; } },
        { id: 'tags', x: 600, y: 320, w: 100, h: 60,
          talk: [['sfx', 'paper'],
                 ['narrate', 'Hundreds of luggage tags on strings, turning slowly. ' +
                  'Every one of them is blank.'],
                 ['narrate', 'They were not blank when you came in.']] }
      ],
      foes: [
        { id: 'a1', troop: 'attic_a', sprite: 'en_staticchild', x: 320, y: 360, r: 70, scale: 0.16 },
        { id: 'a2', troop: 'attic_b', sprite: 'en_emptycoat', x: 650, y: 350, r: 80, scale: 0.18 },
        { id: 'a3', troop: 'attic_c', sprite: 'en_staticchild', x: 350, y: 310, r: 90, scale: 0.16 }
      ]
    },

    blank: {
      name: 'The Blank', bg: 'bg_blank', music: 'blank',
      walk: [[100, 190, 760, 330]],
      depth: { y0: 200, y1: 540, s0: 0.62, s1: 1.0 },
      tint: 'rgba(255,255,255,0.05)',
      spawns: { start: { x: 480, y: 480, dir: 'up' } },
      entities: [
        { id: 'chair', x: 300, y: 330, w: 90, h: 90,
          talk: [['narrate', 'The outline of a chair. Nobody finished drawing the legs, ' +
                  'so it is resting on the idea of legs.']] },
        { id: 'stair', x: 680, y: 400, w: 100, h: 90,
          talk: [['narrate', 'Three steps, then nothing. You go up all three. It ' +
                  'does not help.']] },
        { id: 'doorway', x: 480, y: 300, w: 100, h: 110,
          talk: function () { return PW.scripts.blankDoor; } }
      ]
    },

    finalroom: {
      name: 'The Room at the End of the Hall', bg: 'bg_finalroom', music: 'nel',
      walk: [[214, 342, 508, 178]],
      depth: { y0: 340, y1: 540, s0: 0.74, s1: 1.04 },
      dust: { n: 34, color: 'rgba(255,232,180,' },
      spawns: { start: { x: 300, y: 500, dir: 'right' } },
      entities: [
        { id: 'out', x: 240, y: 500, w: 80, h: 70, kind: 'door', to: ['hub', 'fromfinal'],
          need: function () { return !PW.flag('final_started'); },
          blocked: 'The hallway is not there any more. Only this.' },
        { id: 'chair', x: 470, y: 420, w: 110, h: 110,
          talk: function () { return PW.scripts.rockingChair; } },
        { id: 'bed', x: 330, y: 400, w: 140, h: 100,
          talk: function () { return PW.scripts.nelBed; } },
        { id: 'glasses', x: 600, y: 400, w: 90, h: 70,
          talk: function () { return PW.scripts.glasses; } },
        { id: 'window_b', x: 640, y: 350, w: 110, h: 80,
          talk: function () { return PW.scripts.finalWindow; } }
      ]
    }
  };

  for (var k in R) {
    R[k].id = k;
    if (!R[k].depth) R[k].depth = DEPTH;
    if (!R[k].block) R[k].block = [];
    if (!R[k].entities) R[k].entities = [];
    if (!R[k].foes) R[k].foes = [];
  }
  return R;
})();
