/* PAPERWEIGHT — Chapter Two: the Kitchen That Hums. Dell, and the stove. */
'use strict';

(function () {
  var S = PW.scripts;

  S.meetDell = function () {
    return [
      ['say', 'dell', 'raw', "RIGHT — okay — you're either a burglar or a " +
        "dream and I'm swinging either way—"],
      ['say', 'june', 'raw', 'DELL!'],
      ['wait', 0.5],
      ['say', 'dell', 'warm', '...June?'],
      ['say', 'dell', 'warm', 'JUNE! Ha! I told you! I said go into the ' +
        'kitchen and I went into the kitchen!'],
      ['say', 'june', 'calm', 'I said that four hours ago on a street.'],
      ['say', 'dell', 'warm', "Yeah, in the dream I'm having, which is this " +
        "one, which means I'm right."],
      ['wait', 0.4],
      ['say', 'wick', 'calm', 'Hello. I am a lamp.'],
      ['say', 'dell', 'raw', "I'm going to need a minute with that."],
      ['wait', 0.6],
      ['say', 'dell', 'calm', "June. This is your gran's kitchen. Not like it. " +
        "It's IT. The stove's the same, the jars are the same, there's the " +
        "burn mark on the table from when I — from when we did the thing with " +
        "the pan."],
      ['say', 'june', 'low', "I know."],
      ['say', 'dell', 'low', "You alright?"],
      ['say', 'june', 'low', "No. Obviously not. Are you coming or not?"],
      ['say', 'dell', 'warm', "Obviously I'm coming."],
      ['partyadd', 'dell'],
      ['hide', 'dell_meet'],
      ['wait', 0.4],
      ['say', 'wick', 'calm', 'The stove at the back has been lit for four ' +
        'months and nobody has cooked on it. Be careful. It is very warm and ' +
        'very angry, and those are the same thing here.'],
      ['flag', 'met_dell', true],
      ['save']
    ];
  };

  S.jars = function () {
    if (!PW.flag('got_jam')) {
      return [
        ['sfx', 'glass'],
        ['narrate', 'Shelves of preserves, labelled in her handwriting. ' +
          'DAMSON. RHUBARB. THE ORANGE ONE, DO NOT EAT.'],
        ['narrate', 'One jar of strawberry has been left out on the side with a ' +
          'spoon beside it, as though somebody was called away.'],
        ['give', 'jam', 2],
        ['flag', 'got_jam', true],
        ['say', 'dell', 'warm', "Take it. She'd be insulted if you didn't."]
      ];
    }
    return [['narrate', 'Damson. Rhubarb. The orange one, which you are still ' +
      'not going to risk.']];
  };

  S.herbs = function () {
    if (PW.flag('got_crown')) {
      return [['narrate', 'Dried herbs and a bare space where something folded ' +
        'used to be pegged.']];
    }
    return [
      ['sfx', 'paper'],
      ['narrate', 'Bunches of dried thyme on a line, and pegged up between ' +
        'them, gone soft with steam: a crown folded out of newspaper.'],
      ['wait', 0.5],
      ['say', 'dell', 'warm', "Oh my god. You wore that for a WEEK."],
      ['say', 'june', 'low', "I was six."],
      ['say', 'dell', 'calm', "You wore it in the bath, June."],
      ['say', 'june', 'low', "...She made it out of the local paper. She never " +
        "once told me to take it off."],
      ['give', 'crown'],
      ['flag', 'got_crown', true],
      ['wait', 0.4],
      ['narrate', 'It is a thing you have chosen to keep. Your pouch only holds ' +
        'so many. (Press C to look at what you carry.)']
    ];
  };

  S.table = function () {
    if (PW.flag('table_done')) {
      return [['narrate', 'The long table, scrubbed pale. Four chairs. One of ' +
        'them is pushed out.']];
    }
    return [
      ['narrate', 'The long kitchen table, scrubbed pale by about nine thousand ' +
        'washings-up.'],
      ['narrate', 'There are four chairs. Three are tucked in. One is pushed ' +
        'out, at the angle of somebody who got up to check something on the ' +
        'stove and meant to come straight back.'],
      ['wait', 0.8],
      ['choice', null, [
        ['Push the chair in.', [
          ['sfx', 'door'],
          ['narrate', 'You push it in. It goes in easily, which is somehow the ' +
            'worst part.'],
          ['say', 'june', 'low', '...'],
          ['flag', 'pushed_chair', true],
          ['flag', 'table_done', true]
        ]],
        ['Leave it out.', [
          ['narrate', 'You leave it out.'],
          ['say', 'dell', 'calm', "Yeah. Leave it."],
          ['flag', 'table_done', true]
        ]]
      ]]
    ];
  };

  S.stove = function () {
    if (PW.flag('beat_stove')) {
      return [
        ['narrate', 'The stove sits in its alcove, warm and quiet, its grate ' +
          'glowing a low steady orange.'],
        ['narrate', 'It is just a stove now. It is doing its job.']
      ];
    }
    if (!PW.flag('met_dell')) {
      return [['narrate', 'The stove at the back of the room is enormous and it ' +
        'is lit, and you are not going near it on your own.']];
    }
    return [
      ['music', 'dream'],
      ['narrate', 'The stove is the size of a small car and its grate is full ' +
        'of orange fire that nobody has fed for four months.'],
      ['wait', 0.6],
      ['sfx', 'flame'],
      ['shake', 6, 0.6],
      ['narrate', 'It notices you.'],
      ['wait', 0.5],
      ['say', 'dell', 'raw', 'JUNE. JUNE, IT HAS A FACE—'],
      ['say', 'wick', 'low', "She kept it lit for forty years. Nobody has come " +
        "to use it since March."],
      ['say', 'wick', 'low', "It is not angry at you. It is just very hot and " +
        "very unused."],
      ['wait', 0.5],
      ['say', 'june', 'raw', 'What do I do?'],
      ['say', 'wick', 'calm', "Whatever you actually feel like doing. That's " +
        "the whole trick, June, and I'm sorry it's not a better one."],
      ['tension', 0.4],
      ['battle', 'boss_stove', {
        onWin: [
          ['tension', 0],
          ['wait', 0.5],
          ['sfx', 'boom'],
          ['narrate', 'The fire goes out all at once, the way fires do, with a ' +
            'small sound like someone sitting down.'],
          ['wait', 0.8],
          ['say', 'dell', 'low', "...Was that alright? That we did that?"],
          ['say', 'june', 'low', "It was trying to burn the room down."],
          ['say', 'dell', 'calm', "Yeah. Yeah, no, you're right."],
          ['wait', 0.6],
          ['narrate', 'The kitchen is cooler now. It smells of nothing at all.'],
          ['run', function () { return S.afterStove; }]
        ],
        onSoothe: [
          ['tension', 0],
          ['wait', 0.5],
          ['sfx', 'chime'],
          ['flash', '#ffd9a8', 0.5, 0.9],
          ['narrate', 'The fire drops to a hum, the way it always used to while ' +
            'she was talking to somebody at the table.'],
          ['wait', 0.8],
          ['say', 'dell', 'warm', "...It's purring. June. The stove is purring."],
          ['say', 'june', 'calm', "It just wanted somebody to stand next to it."],
          ['say', 'wick', 'warm', 'Yes.'],
          ['wait', 0.5],
          ['narrate', 'The kitchen is warm. It smells, faintly and impossibly, ' +
            'of baking.'],
          ['flag', 'soothed_stove', true],
          ['give', 'sweet', 3],
          ['run', function () { return S.afterStove; }]
        ]
      }]
    ];
  };

  S.afterStove = [
    ['flag', 'beat_stove', true],
    ['chapter', 3],
    ['heal'],
    ['wait', 0.5],
    ['say', 'wick', 'calm', 'The door with water under it will open now. I ' +
      'would rather it did not, but it will.'],
    ['say', 'dell', 'calm', "Water?"],
    ['say', 'wick', 'low', "Her greenhouse. It's flooded. It's been flooded " +
      "since about the same time everything else happened."],
    ['wait', 0.4],
    ['say', 'june', 'calm', "Then we go to the greenhouse."],
    ['save']
  ];
})();
