/* PAPERWEIGHT — Chapter Four: the Attic of Names, and the thing taking them. */
'use strict';

(function () {
  var S = PW.scripts;

  /* Three boxes. Each one is a small argument about what remembering is for. */
  S.box = function (n) {
    var flag = 'box_' + n;
    if (PW.flag(flag)) {
      return [['narrate', 'A box with a blank tag on it. You know what is in ' +
        'this one now, which turns out to be a kind of ownership.']];
    }

    if (n === 1) {
      return [
        ['sfx', 'paper'],
        ['narrate', 'A cardboard box with a blank luggage tag. Inside: her ' +
          'winter coat, folded, with a bus ticket still in the pocket from a ' +
          'journey she took on a Thursday for no reason anybody wrote down.'],
        ['wait', 0.6],
        ['say', 'dell', 'calm', "Where'd she go?"],
        ['say', 'june', 'calm', "No idea. She did that. She'd just get a bus " +
          "and come back at teatime with a face like she'd won something."],
        ['choice', null, [
          ['Write "COAT" on the tag.', [
            ['sfx', 'paper'],
            ['narrate', 'You write COAT on the tag in pencil. It is not much ' +
              'of a name for it, but it holds.'],
            ['flag', 'named_1', true],
            ['call', function () { PW.counter('named', 1); }]
          ]],
          ['Write "THURSDAY" on the tag.', [
            ['sfx', 'paper'],
            ['narrate', 'You write THURSDAY on the tag. It is not what is in ' +
              'the box. It is what the box is about, which is different and ' +
              'better.'],
            ['flag', 'named_1', true],
            ['flag', 'named_well_1', true],
            ['call', function () { PW.counter('named', 1); PW.counter('named_well', 1); }]
          ]],
          ['Leave it blank.', [
            ['narrate', 'You leave the tag blank and close the flaps.'],
            ['say', 'hal', 'low', "...Alright."]
          ]]
        ]],
        ['flag', flag, true],
        ['give', 'photo']
      ];
    }

    if (n === 2) {
      return [
        ['sfx', 'paper'],
        ['narrate', 'This box is full of your things. Every drawing you ever ' +
          'did, in date order, with the date on the back in her handwriting.'],
        ['wait', 0.8],
        ['say', 'june', 'low', "...She kept all of them."],
        ['say', 'dell', 'warm', "Mate, that one's a horse."],
        ['say', 'june', 'low', "That's a dog."],
        ['say', 'dell', 'warm', "It's got seven legs, June."],
        ['say', 'june', 'warm', "It's a very good dog."],
        ['wait', 0.6],
        ['narrate', 'Underneath the drawings there is a music box, the ' +
          'wind-up kind, small enough to close your hand around.'],
        ['sfx', 'chime'],
        ['narrate', 'You wind it. It plays eleven notes and then stops, ' +
          'exactly where it always stopped, one note short of the end.'],
        ['say', 'hal', 'calm', "It's broken."],
        ['say', 'june', 'calm', "It's always been like that. She used to hum " +
          "the last one."],
        ['wait', 1.0],
        ['give', 'musicbox'],
        ['flag', flag, true],
        ['flag', 'has_musicbox', true],
        ['call', function () { PW.counter('named', 1); }]
      ];
    }

    return [
      ['sfx', 'paper'],
      ['narrate', 'The last box is small and very light. Inside there is a ' +
        'locket, tarnished nearly black, and a brass key.'],
      ['wait', 0.6],
      ['say', 'hal', 'calm', "That key's for a door."],
      ['say', 'dell', 'raw', "Brilliant. Which door."],
      ['say', 'wick', 'low', 'You know which door.'],
      ['wait', 1.0],
      ['say', 'june', 'low', '...Yeah.'],
      ['give', 'locket'],
      ['give', 'key'],
      ['flag', flag, true],
      ['flag', 'has_key', true],
      ['call', function () { PW.counter('named', 1); }]
    ];
  };

  S.atticWindow = function () {
    return [
      ['narrate', 'A round window at the far end, letting in one shaft of pale ' +
        'gold that has been in exactly that position the whole time you have ' +
        'been up here.'],
      ['wait', 0.5],
      ['narrate', 'Through it: not your street. A hallway, seen from outside, ' +
        'with too many doors.'],
      ['say', 'hal', 'low', "We're in the house that's in the house."],
      ['say', 'wick', 'calm', 'Yes. Try not to hold that thought too tightly, ' +
        'it comes apart.']
    ];
  };

  /* ------------------------------------------------------ the Nameless -- */

  S.blankDoor = function () {
    if (PW.flag('beat_nameless')) {
      return [['narrate', 'A doorway with no wall around it. Through it: the ' +
        'hall, waiting, shorter than it was.']];
    }
    return [
      ['narrate', 'The half-drawn doorway. Through it there is nothing but more ' +
        'paper.'],
      ['wait', 0.8],
      ['sfx', 'erase'],
      ['narrate', 'And then there is a shape in the nothing, tall and thin and ' +
        'soft, walking without any hurry at all, with an eraser where its hand ' +
        'should be.'],
      ['wait', 1.0],
      ['say', 'wick', 'low', "There it is."],
      ['say', 'wick', 'low', "That is what has been taking the names off the " +
        "doors."],
      ['wait', 0.6],
      ['say', 'dell', 'raw', "What is it?!"],
      ['say', 'wick', 'calm', "Nothing. That is not me being poetic, Odell. " +
        "It is the part of forgetting that does the actual work."],
      ['wait', 0.8],
      ['say', 'hal', 'low', "It's not even fast."],
      ['say', 'wick', 'low', "No. It never has to be."],
      ['wait', 0.6],
      ['say', 'june', 'raw', "It's not having them."],
      ['say', 'june', 'raw', "It's not having the kitchen and it's not having " +
        "the greenhouse and it is absolutely not having her."],
      ['tension', 0.85],
      ['music', 'dread', { hard: true }],
      ['battle', 'boss_blank', {
        onWin: [
          ['tension', 0],
          ['wait', 0.8],
          ['sfx', 'erase'],
          ['narrate', 'It comes apart into crumbs, the way a pencil line does ' +
            'when you go over it too many times.'],
          ['wait', 1.0],
          ['narrate', 'The crumbs drift. They do not settle. They are still ' +
            'drifting when you stop watching them.'],
          ['wait', 0.8],
          ['say', 'wick', 'low', 'That was not the last one of those.'],
          ['say', 'june', 'calm', "I know."],
          ['run', function () { return S.afterNameless; }]
        ],
        // Losing to this one is allowed. It costs you a room, and the story
        // goes on without it, which is the entire point of the Nameless.
        canLose: true,
        onLose: [
          ['tension', 0],
          ['wait', 0.8],
          ['sfx', 'erase'],
          ['narrate', 'It gets a hand on the edge of something and pulls.'],
          ['narrate', 'A room you have been in twice goes completely out of ' +
            'your head. You know it has gone. You cannot get at what it was.'],
          ['wait', 0.8],
          ['say', 'wick', 'low', "...It took the greenhouse."],
          ['say', 'june', 'low', "No it didn't. I remember the greenhouse."],
          ['say', 'wick', 'low', 'Yes. You do. Good.'],
          ['flag', 'lost_a_room', true],
          ['run', function () { return S.afterNameless; }]
        ]
      }]
    ];
  };

  S.afterNameless = [
    ['flag', 'beat_nameless', true],
    ['chapter', 5],
    ['heal'],
    ['stopmusic', 1.4],
    ['wait', 1.0],
    ['fade', 1.4],
    ['goroom', 'hub', 'start'],
    ['music', 'dream'],
    ['unfade', 1.6],
    ['save']
  ];

  /* Attic entry beat and the fight that gets you into the Blank. */
  S.roomTriggers.attic = function () {
    if (PW.flag('attic_intro')) {
      if (PW.flag('box_1') && PW.flag('box_2') && PW.flag('box_3') &&
          !PW.flag('attic_open')) {
        PW.flag('attic_open', true);
        return [
          ['wait', 0.5],
          ['sfx', 'wind'],
          ['shake', 6, 0.6],
          ['narrate', 'Every tag in the attic turns at once, all the way round, ' +
            'and hangs still.'],
          ['say', 'wick', 'low', "It has noticed us."],
          ['say', 'hal', 'calm', "Good."],
          ['wait', 0.5],
          ['narrate', 'The floor at the far end has stopped being floor. There ' +
            'is a soft white nothing where it was, and it is getting nearer at ' +
            'the speed of a person walking.'],
          ['say', 'wick', 'calm', 'We go to it. Better than it coming to us.'],
          ['goroom', 'blank', 'start']
        ];
      }
      return null;
    }
    PW.flag('attic_intro', true);
    return [
      ['wait', 0.6],
      ['sfx', 'paper'],
      ['narrate', 'The attic. Boxes to the rafters, and hundreds of luggage ' +
        'tags on strings, turning slowly in air that is not moving.'],
      ['wait', 0.5],
      ['say', 'dell', 'calm', "They're all blank."],
      ['say', 'wick', 'low', "They were not blank last week. I read them."],
      ['wait', 0.8],
      ['say', 'hal', 'calm', "So we open the boxes and find out what's in them."],
      ['say', 'wick', 'warm', 'Yes. Exactly that. Three of them will do it.']
    ];
  };

  S.roomTriggers.blank = function () {
    if (PW.flag('blank_intro')) return null;
    PW.flag('blank_intro', true);
    return [
      ['music', 'blank'],
      ['wait', 0.8],
      ['narrate', 'There is nothing here. That is not a description, it is the ' +
        'contents.'],
      ['wait', 0.6],
      ['say', 'dell', 'low', "I don't like it. I want to go back to the one " +
        "with the teeth."],
      ['say', 'hal', 'low', "There's a chair over there that nobody finished."],
      ['say', 'june', 'calm', "Then somebody was drawing this. Somebody stopped."],
      ['say', 'wick', 'low', "Somebody is still stopping. Come on."]
    ];
  };
})();
