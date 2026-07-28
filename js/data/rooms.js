/* PAPERWEIGHT — the house, room by room.
 *
 * `walk` is the floor: a union of rectangles the party's feet may stand in.
 * `block` is furniture punched back out of it. Characters scale with their y
 * position so the far end of a room reads as further away.
 *
 * Anything with a `talk` may be examined; a function is evaluated at the
 * moment of interaction so it can look at the story flags. An entity's `x` is
 * its middle and its `y` is the line its feet stand on, so its box runs from
 * (x - w/2, y - h) to (x + w/2, y).
 *
 * Every number here was measured against the painting it sits on — run
 * `python3 tools/boxes.py` to draw the boxes back over the art and look. The
 * rooms were generated rather than drawn to a plan, so guessing does not work:
 * the bedroom door is at the right-hand edge, the hall's floor is a wide
 * trapezoid, and the attic has no door at all, only the way you came up.
 */
'use strict';

PW.rooms = (function () {

  var DEPTH = { y0: 300, y1: 540, s0: 0.70, s1: 1.06 };

  var R = {

    /* ==================================================================== *
     *  THE WAKING WORLD
     * ==================================================================== */

    /* The bed fills the left of the picture and the door is at the right-hand
       edge, half out of frame. The floor starts just under the wainscot. */
    bedroom: {
      name: 'Your Room', bg: 'bg_bedroom', music: 'real',
      walk: [[295, 250, 595, 285], [180, 480, 710, 55]],
      block: [[793, 335, 80, 90], [880, 465, 30, 70]],
      depth: DEPTH,
      dust: { n: 22, color: 'rgba(180,200,255,' },
      spawns: {
        start: { x: 520, y: 495, dir: 'up' },
        frombed: { x: 350, y: 420, dir: 'down' }
      },
      entities: [
        { id: 'bed', x: 155, y: 470, w: 290, h: 370,
          talk: [['narrate', 'Your bed. The quilt is the one she made, and two of ' +
                  'the squares are cut from your old school pinafore.'],
                 ['narrate', 'It is late. It has been late for a while.']] },
        { id: 'window', x: 455, y: 248, w: 210, h: 250,
          talk: [['narrate', 'Rain, going sideways. The street light makes each drop ' +
                  'briefly worth looking at.'],
                 ['sfx', 'wind']] },
        { id: 'desk', x: 662, y: 292, w: 200, h: 205,
          talk: [['narrate', 'Your desk. Homework you have looked at eleven times ' +
                  'without doing.']] },
        { id: 'shelf', x: 817, y: 288, w: 110, h: 288,
          talk: function () {
            return PW.flag('took_paperweight')
              ? [['narrate', 'The shelf. There is a clean round patch in the dust now.']]
              : PW.scripts.takePaperweight;
          } },
        { id: 'door_out', x: 930, y: 432, w: 70, h: 360, kind: 'door',
          to: ['landing', 'frombedroom'],
          need: function () { return PW.flag('ch_interlude'); },
          blocked: 'You are not going anywhere tonight.' }
      ]
    },

    /* Three doors along the back wall — hers shut on the left, yours standing
       open and spilling light in the middle — and the stairs going down at the
       right, past the balustrade. */
    landing: {
      name: 'The Landing', bg: 'bg_landing', music: 'real',
      walk: [[105, 240, 775, 55], [105, 295, 545, 245]],
      block: [[532, 238, 110, 20]],
      depth: DEPTH,
      spawns: {
        frombedroom: { x: 447, y: 300, dir: 'down' },
        fromstreet: { x: 600, y: 430, dir: 'left' }
      },
      entities: [
        { id: 'yourdoor', x: 447, y: 250, w: 130, h: 230, kind: 'door',
          to: ['bedroom', 'start'] },
        { id: 'nelsdoor', x: 232, y: 245, w: 145, h: 225,
          talk: function () { return PW.scripts.nelsDoor; } },
        { id: 'linen', x: 712, y: 245, w: 120, h: 225,
          talk: [['narrate', 'The airing cupboard. Towels folded by somebody who ' +
                  'folds towels properly, going slowly grey at the creases.']] },
        { id: 'clock', x: 622, y: 258, w: 60, h: 125,
          talk: [['narrate', 'A carriage clock that stopped at twenty past four ' +
                  'and was never wound again. Nobody has decided who is allowed to ' +
                  'wind it.']] },
        { id: 'fern', x: 562, y: 258, w: 80, h: 160,
          talk: [['narrate', 'The fern is dead. Everyone has agreed, silently, to ' +
                  'keep watering it.']] },
        { id: 'stairs', x: 690, y: 520, w: 140, h: 230, kind: 'door',
          to: ['street', 'fromhouse'] }
      ]
    },

    /* Wet road in the middle, the lit shop up on the left pavement, and the
       path home curling away off the bottom-right corner. */
    street: {
      name: 'Wren Street', bg: 'bg_street', music: 'real',
      walk: [[150, 270, 245, 45], [115, 315, 640, 100], [85, 415, 700, 120]],
      depth: { y0: 320, y1: 540, s0: 0.66, s1: 1.02 },
      spawns: { fromhouse: { x: 740, y: 470, dir: 'left' } },
      entities: [
        { id: 'home', x: 880, y: 545, w: 160, h: 190, kind: 'door',
          label: 'the way home', to: ['landing', 'fromstreet'] },
        { id: 'shop', x: 225, y: 290, w: 290, h: 250,
          talk: function () { return PW.scripts.shop; } },
        { id: 'puddle', x: 450, y: 430, w: 140, h: 80,
          talk: [['sfx', 'water'],
                 ['narrate', 'A puddle with the whole sky in it. You put one boot ' +
                  'in, carefully, and ruin it.']] },
        { id: 'poles', x: 440, y: 300, w: 60, h: 300,
          talk: [['narrate', 'Telephone wires, sagging. Somebody somewhere is ' +
                  'saying something to somebody.']] },
        { id: 'dell_real', x: 600, y: 420, w: 90, h: 130, sprite: 'dell', dir: 'down',
          visibleIf: function () { return !PW.flag('talked_dell_real'); },
          talk: function () { return PW.scripts.dellReal; } }
      ]
    },

    /* ==================================================================== *
     *  THE DREAM
     * ==================================================================== */

    /* A corridor in one-point perspective: the floor is a trapezoid, narrow at
       the back wall and running off both sides of the frame at the front. Each
       door here is a door somebody painted — the two big near ones on the left
       and right, the double door at the far end, and a hatch in the ceiling. */
    hub: {
      name: 'The Hall of Doors',
      // The hall is the one room that keeps losing pieces of itself, so its
      // art is chosen at draw time rather than fixed: chapter four takes two
      // doors off the back wall and chapter five takes three more. The
      // narration says so out loud, so the painting has to agree with it.
      // tools/hall.py makes the worn versions.
      bg: function () {
        if (PW.state.chapter >= 5) return 'bg_hub_bare';
        if (PW.state.chapter >= 4) return 'bg_hub_worn';
        return 'bg_hub';
      },
      music: 'dream',
      walk: [[285, 248, 410, 52], [230, 300, 520, 60], [155, 360, 665, 70],
             [80, 430, 800, 60], [25, 490, 905, 48]],
      depth: { y0: 250, y1: 540, s0: 0.52, s1: 1.05 },
      dust: { n: 40, color: 'rgba(250,238,205,' },
      spawns: {
        start: { x: 560, y: 505, dir: 'up' },
        fromkitchen: { x: 215, y: 400, dir: 'right' },
        fromgarden: { x: 830, y: 470, dir: 'left' },
        fromattic: { x: 650, y: 305, dir: 'down' },
        fromfinal: { x: 478, y: 305, dir: 'down' }
      },
      entities: [
        { id: 'door_kitchen', x: 140, y: 374, w: 136, h: 258, kind: 'door',
          to: ['kitchen', 'start'],
          label: 'a door that smells of butter',
          need: function () { return PW.state.chapter >= 2; },
          blocked: 'Locked. It is warm to the touch, which somehow makes it worse.' },

        { id: 'door_garden', x: 900, y: 535, w: 115, h: 190, kind: 'door',
          to: ['garden', 'start'],
          label: 'a door with water under it',
          need: function () { return PW.state.chapter >= 3; },
          blocked: 'Water is coming under this one. Not yet.' },

        // Really in the ceiling: the box runs from the hatch down to the floor
        // under it, so it can be reached by standing beneath and looking up.
        { id: 'door_attic', x: 650, y: 255, w: 100, h: 255, kind: 'door',
          to: ['attic', 'start'],
          label: 'a door in the ceiling, which is fine',
          need: function () { return PW.state.chapter >= 4; },
          blocked: 'It is set into the ceiling at an angle that hurts to look at.' },

        { id: 'door_final', x: 479, y: 250, w: 76, h: 82,
          label: 'the door at the end of the hall',
          talk: function () { return PW.scripts.finalDoor; } },

        { id: 'wake', x: 22, y: 512, w: 90, h: 175,
          label: 'the way back',
          talk: function () { return PW.scripts.wakeDoor; } },

        { id: 'lantern', x: 740, y: 330, w: 80, h: 330,
          talk: [['narrate', 'A paper lantern, hung too high for anyone in this ' +
                  'house to have reached.']] },
        { id: 'rug', x: 475, y: 540, w: 125, h: 145,
          talk: [['narrate', 'The runner rug goes all the way down the hall and ' +
                  'then a little further than the hall goes.']] },
        { id: 'smalldoor', x: 350, y: 243, w: 45, h: 50,
          talk: [['sfx', 'door'],
                 ['narrate', 'A door the size of a shoebox. You open it. Inside is ' +
                  'a smaller hallway with smaller doors.'],
                 ['narrate', 'You close it again, politely.']] }
      ]
    },

    /* Nobody painted a door into the kitchen, so the way out is the front of
       the room — you walk toward the viewer and back into the hall. */
    kitchen: {
      name: 'The Kitchen That Hums', bg: 'bg_kitchen', music: 'kitchen',
      walk: [[115, 215, 685, 60], [115, 275, 800, 260]],
      block: [[115, 360, 250, 175], [755, 425, 160, 110], [135, 250, 80, 55]],
      depth: { y0: 220, y1: 540, s0: 0.58, s1: 1.04 },
      spawns: { start: { x: 530, y: 470, dir: 'up' } },
      entities: [
        { id: 'out', x: 530, y: 545, w: 300, h: 45, kind: 'door',
          label: 'back to the hall', to: ['hub', 'fromkitchen'] },
        { id: 'stove', x: 388, y: 210, w: 290, h: 210,
          talk: function () { return PW.scripts.stove; } },
        { id: 'jars', x: 875, y: 272, w: 155, h: 272,
          talk: function () { return PW.scripts.jars; } },
        { id: 'table', x: 240, y: 540, w: 250, h: 190,
          talk: function () { return PW.scripts.table; } },
        { id: 'herbs', x: 575, y: 215, w: 110, h: 215,
          talk: function () { return PW.scripts.herbs; } },
        { id: 'recipes', x: 705, y: 215, w: 170, h: 215,
          talk: [['narrate', 'Recipe cards pegged on a line, in her handwriting, ' +
                  'which slopes uphill.'],
                 ['narrate', 'Every one of them says "a bit of" instead of an amount.']] },
        { id: 'dell_meet', x: 620, y: 400, w: 100, h: 140, sprite: 'dell', dir: 'left',
          visibleIf: function () { return !PW.party.has('dell'); },
          talk: function () { return PW.scripts.meetDell; } }
      ],
      foes: [
        { id: 'k1', troop: 'kitchen_a', sprite: 'en_mitten', x: 450, y: 300, r: 90, scale: 0.14 },
        { id: 'k2', troop: 'kitchen_b', sprite: 'en_mitten', x: 760, y: 350, r: 110, scale: 0.14 },
        { id: 'k3', troop: 'kitchen_c', sprite: 'en_emptycoat', x: 200, y: 300, r: 80, scale: 0.19 }
      ]
    },

    /* Flooded to the ankles, open all the way across. The way out is the great
       arched doorway in the middle of the back wall. */
    garden: {
      name: 'The Drowned Garden', bg: 'bg_garden', music: 'garden',
      walk: [[70, 245, 820, 290]],
      block: [[700, 245, 100, 78], [852, 245, 38, 175]],
      depth: { y0: 250, y1: 540, s0: 0.60, s1: 1.04 },
      dust: { n: 26, color: 'rgba(190,255,225,' },
      spawns: { start: { x: 480, y: 320, dir: 'down' } },
      entities: [
        { id: 'out', x: 480, y: 250, w: 100, h: 245, kind: 'door',
          label: 'the arch you came through', to: ['hub', 'fromgarden'] },
        { id: 'lily_a', x: 171, y: 487, w: 80, h: 60,
          talk: function () { return PW.scripts.lily('a'); } },
        { id: 'lily_b', x: 125, y: 380, w: 70, h: 60,
          talk: function () { return PW.scripts.lily('b'); } },
        { id: 'lily_c', x: 815, y: 312, w: 75, h: 45,
          talk: function () { return PW.scripts.lily('c'); } },
        { id: 'wateringcan', x: 825, y: 425, w: 75, h: 72,
          talk: function () { return PW.scripts.wateringCan; } },
        { id: 'roof', x: 720, y: 245, w: 240, h: 245,
          talk: [['narrate', 'The glass roof is broken open and the sky has come ' +
                  'all the way in. There is more sky than there is room.']] },
        { id: 'foxgloves', x: 170, y: 255, w: 80, h: 195,
          talk: [['narrate', 'Foxgloves in cracked pots. She grew these and told you ' +
                  'twice a year not to eat them.']] },
        { id: 'hal_meet', x: 620, y: 430, w: 100, h: 140, sprite: 'hal', dir: 'left',
          visibleIf: function () { return !PW.party.has('hal'); },
          talk: function () { return PW.scripts.meetHal; } },
        { id: 'deepwater', x: 480, y: 545, w: 280, h: 90,
          talk: function () { return PW.scripts.deepWater; } }
      ],
      foes: [
        { id: 'g1', troop: 'garden_a', sprite: 'en_sorrowvine', x: 250, y: 440, r: 100, scale: 0.16 },
        { id: 'g2', troop: 'garden_b', sprite: 'en_sorrowvine', x: 720, y: 430, r: 70, scale: 0.16 },
        { id: 'g3', troop: 'garden_c', sprite: 'en_hourmoth', x: 150, y: 290, r: 90, scale: 0.15 }
      ]
    },

    /* Clutter banked up around the walls leaves a rough oval of bare boards.
       The way down is the front of the room, matching the hatch in the hall. */
    attic: {
      name: 'The Attic of Names', bg: 'bg_attic', music: 'attic',
      walk: [[290, 200, 370, 60], [240, 260, 500, 80], [195, 340, 590, 90],
             [150, 430, 690, 105]],
      depth: { y0: 205, y1: 540, s0: 0.56, s1: 1.02 },
      dust: { n: 46, color: 'rgba(255,244,210,' },
      spawns: { start: { x: 490, y: 470, dir: 'up' } },
      entities: [
        { id: 'out', x: 490, y: 548, w: 260, h: 45, kind: 'door',
          label: 'back down the ladder', to: ['hub', 'fromattic'] },
        // Five things stand along the back wall within a couple of hundred
        // pixels of each other, so their boxes are kept narrow and their
        // bottoms level: the player picks between them by standing left or
        // right, not by standing closer.
        { id: 'box_2', x: 350, y: 200, w: 70, h: 155, talk: function () { return PW.scripts.box(2); } },
        { id: 'box_1', x: 412, y: 200, w: 75, h: 120, talk: function () { return PW.scripts.box(1); } },
        { id: 'window_a', x: 492, y: 200, w: 70, h: 200,
          talk: function () { return PW.scripts.atticWindow; } },
        { id: 'dummy', x: 553, y: 200, w: 60, h: 160,
          talk: [['narrate', 'A dressmaker\'s dummy under a sheet. It is exactly her ' +
                  'height, because it was.']] },
        { id: 'box_3', x: 615, y: 200, w: 80, h: 115, talk: function () { return PW.scripts.box(3); } },
        { id: 'tags', x: 245, y: 250, w: 110, h: 250,
          talk: [['sfx', 'paper'],
                 ['narrate', 'Hundreds of luggage tags on strings, turning slowly. ' +
                  'Every one of them is blank.'],
                 ['narrate', 'They were not blank when you came in.']] }
      ],
      foes: [
        { id: 'a1', troop: 'attic_a', sprite: 'en_staticchild', x: 300, y: 300, r: 70, scale: 0.16 },
        { id: 'a2', troop: 'attic_b', sprite: 'en_emptycoat', x: 700, y: 380, r: 80, scale: 0.18 },
        { id: 'a3', troop: 'attic_c', sprite: 'en_staticchild', x: 420, y: 250, r: 90, scale: 0.16 }
      ]
    },

    /* Bare paper with three unfinished pencil sketches on it. */
    blank: {
      name: 'The Blank', bg: 'bg_blank', music: 'blank',
      walk: [[100, 190, 760, 345]],
      depth: { y0: 200, y1: 540, s0: 0.62, s1: 1.0 },
      tint: 'rgba(255,255,255,0.05)',
      spawns: { start: { x: 480, y: 480, dir: 'up' } },
      entities: [
        { id: 'chair', x: 188, y: 190, w: 100, h: 110,
          talk: [['narrate', 'The outline of a chair. Nobody finished drawing the legs, ' +
                  'so it is resting on the idea of legs.']] },
        { id: 'stair', x: 757, y: 250, w: 105, h: 100,
          talk: [['narrate', 'Three steps, then nothing. You go up all three. It ' +
                  'does not help.']] },
        { id: 'doorway', x: 482, y: 190, w: 110, h: 190,
          talk: function () { return PW.scripts.blankDoor; } }
      ]
    },

    /* Her room: bed along the left wall, the window blazing at the back, the
       rocking chair out on the boards, and the rug running out of the
       bottom-left corner toward the door you came in by. */
    finalroom: {
      name: 'The Room at the End of the Hall', bg: 'bg_finalroom', music: 'nel',
      walk: [[265, 205, 630, 190], [70, 395, 825, 140]],
      block: [[505, 205, 105, 60]],
      depth: { y0: 210, y1: 540, s0: 0.62, s1: 1.04 },
      dust: { n: 34, color: 'rgba(255,232,180,' },
      spawns: { start: { x: 300, y: 480, dir: 'right' } },
      entities: [
        { id: 'out', x: 100, y: 548, w: 200, h: 110, kind: 'door', to: ['hub', 'fromfinal'],
          label: 'the way back to the hall',
          need: function () { return !PW.flag('final_started'); },
          blocked: 'The hallway is not there any more. Only this.' },
        { id: 'chair', x: 557, y: 268, w: 110, h: 175,
          talk: function () { return PW.scripts.rockingChair; } },
        { id: 'bed', x: 150, y: 390, w: 220, h: 340,
          talk: function () { return PW.scripts.nelBed; } },
        { id: 'glasses', x: 307, y: 228, w: 90, h: 110,
          talk: function () { return PW.scripts.glasses; } },
        { id: 'window_b', x: 457, y: 205, w: 200, h: 205,
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

/** The art a room is wearing right now. `bg` may be a plain name or a function
    of the story, which is how the hall loses its doors. */
PW.roomBg = function (room) {
  return typeof room.bg === 'function' ? room.bg() : room.bg;
};
