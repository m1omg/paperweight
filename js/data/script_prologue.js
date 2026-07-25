/* PAPERWEIGHT — Chapter One: the waking house.
 *
 * Scripts are arrays of [op, ...args] read by PW.Script. `say` takes
 * (who, expression, text); expressions are calm | warm | low | raw.
 */
'use strict';

PW.scripts = PW.scripts || {};

(function () {
  var S = PW.scripts;

  /* ==================================================================== *
   *  OPENING
   * ==================================================================== */

  S.opening = [
    ['fade', 0.01],
    ['music', 'real'],
    ['wait', 0.4],
    ['unfade', 2.0],
    ['narrate', 'Rain on the window, going sideways. Half past eleven on a ' +
      'Tuesday in March.'],
    ['narrate', 'Your room. The lamp is on because you did not turn it off, and ' +
      'the homework on the desk has been looked at eleven times without being ' +
      'done.'],
    ['wait', 0.4],
    ['say', 'june', 'low', 'I should go to sleep.'],
    ['say', 'june', 'low', "I've been should-ing for about two hours."],
    ['narrate', 'On the shelf, something small is catching the lamplight and ' +
      'refusing to stop.'],
    ['flag', 'saw_shelf']
  ];

  S.takePaperweight = [
    ['narrate', "Her paperweight. It has lived on this shelf since the second " +
      "week of March, which is when your mother carried a box up here and put " +
      "it down without saying anything about it."],
    ['narrate', 'Glass, the size of an apple, with a tiny lit house inside and ' +
      'one small tree, and gold flecks that go round when you turn it.'],
    ['sfx', 'glass'],
    ['choice', null, [
      ['Pick it up.', [
        ['flag', 'took_paperweight'],
        ['sfx', 'chime'],
        ['give', 'paperweight'],
        ['narrate', 'It is heavier than you expect, every single time.'],
        ['say', 'june', 'low', 'Hi.'],
        ['wait', 0.6],
        ['say', 'june', 'low', "That's — I'm not talking to a paperweight. " +
          "I'm talking near it."],
        ['run', function () { return S.toBed; }]
      ]],
      ['Leave it alone.', [
        ['narrate', 'You leave it alone. It goes on catching the light in a way ' +
          'that is somehow pointed.'],
        ['say', 'june', 'low', "...Fine."],
        ['run', function () { return S.takePaperweight2; }]
      ]]
    ]]
  ];

  S.takePaperweight2 = [
    ['flag', 'took_paperweight'],
    ['sfx', 'chime'],
    ['give', 'paperweight'],
    ['narrate', 'You pick it up anyway. It is heavier than you expect.'],
    ['run', function () { return S.toBed; }]
  ];

  S.toBed = [
    ['wait', 0.5],
    ['narrate', 'You get into bed with it, which is a stupid thing to do with a ' +
      'lump of glass, and you do it anyway.'],
    ['wait', 0.8],
    ['sfx', 'heartbeat'],
    ['tension', 0.25],
    ['narrate', 'The rain gets further away.'],
    ['wait', 0.6],
    ['narrate', 'Then it stops being rain and starts being a sound like someone ' +
      'shuffling cards in the next room.'],
    ['stopmusic', 2.2],
    ['fade', 2.4],
    ['wait', 1.0],
    ['tension', 0],
    ['flag', 'ch1_dream'],
    ['chapter', 1],
    ['goroom', 'hub', 'start'],
    ['run', function () { return S.firstDream; }]
  ];

  /* ==================================================================== *
   *  FIRST TIME IN THE DREAM
   * ==================================================================== */

  S.firstDream = [
    ['music', 'dream'],
    ['unfade', 1.8],
    ['wait', 0.8],
    ['narrate', 'You are standing in a hallway.'],
    ['narrate', 'It is your hallway — the runner rug, the wallpaper with the ' +
      'stripes that were green once — except it goes on for much longer than ' +
      'your house is, and there are far too many doors, and one of them is in ' +
      'the ceiling.'],
    ['say', 'june', 'raw', 'Okay.'],
    ['say', 'june', 'raw', "Okay, this is a dream, I know this is a dream, " +
      "that usually means I wake up in about four seconds."],
    ['wait', 2.0],
    ['say', 'june', 'low', '...'],
    ['say', 'june', 'low', 'Four seconds.'],
    ['wait', 0.8],
    ['sfx', 'chime'],
    ['narrate', 'Something small comes round the corner at the far end, flying ' +
      'the way a moth flies, badly and with total confidence.'],
    ['wait', 1.2],
    ['say', 'wick', 'warm', 'Oh! Oh, good. You came up.'],
    ['say', 'june', 'raw', "You're a lamp."],
    ['say', 'wick', 'calm', "I'm a lamp."],
    ['say', 'june', 'raw', 'You have wings.'],
    ['say', 'wick', 'warm', 'I have wings. It comes up a lot. Are you cold? ' +
      'You look cold. Come here a second.'],
    ['wait', 0.5],
    ['narrate', 'It bumps gently against your shoulder like a cat, and you are ' +
      'briefly, embarrassingly warm.'],
    ['say', 'june', 'calm', "...What are you called?"],
    ['say', 'wick', 'calm', "Wick. I think. It's what's written on me, anyway, " +
      "and I've decided that counts."],
    ['partyadd', 'wick'],
    ['wait', 0.4],
    ['say', 'wick', 'calm', "This is the Hall of Doors. It's mostly your house " +
      "and partly somebody else's, and there's more of it every time I count."],
    ['say', 'wick', 'low', "Something in here is taking the names off things, " +
      "June. Quietly. One at a time."],
    ['say', 'june', 'raw', 'How do you know my name?'],
    ['say', 'wick', 'warm', "Because it hasn't been taken yet."],
    ['wait', 0.8],
    ['narrate', 'The flame inside the glass leans, like a person deciding ' +
      'whether to say the next bit.'],
    ['say', 'wick', 'low', "There's a door at the end of the hall. You'll know " +
      "it when you see it. Don't go through it yet."],
    ['say', 'june', 'calm', 'Why not?'],
    ['say', 'wick', 'calm', "Because you're not carrying enough yet. Come on. " +
      "I'll show you what happens here."],
    ['flag', 'met_wick'],
    ['run', function () { return S.tutorialFight; }]
  ];

  S.tutorialFight = [
    ['wait', 0.6],
    ['sfx', 'wind'],
    ['narrate', 'Something detaches itself from under the rug and rolls over to ' +
      'have a look at you.'],
    ['say', 'wick', 'calm', "That's a Dustling. It's about as dangerous as a " +
      "cushion. Perfect. Watch what your feelings do."],
    ['battle', 'tutorial', {
      onWin: [
        ['wait', 0.3],
        ['say', 'wick', 'calm', "There. Two things you can always do."],
        ['say', 'wick', 'calm', "You can HIT a thing until it stops. That works. " +
          "It'll go on working all night."],
        ['say', 'wick', 'warm', "Or you can HOLD it. Some things in this house " +
          "aren't attacking you, they're just very loud about being lost. " +
          "Hold one long enough and it settles."],
        ['say', 'june', 'calm', 'Which one am I meant to do?'],
        ['say', 'wick', 'calm', "I'm a lamp, June. I'm not going to tell you " +
          "how to feel about things."],
        ['wait', 0.5],
        ['say', 'wick', 'calm', "One more thing. Look at yourself while you " +
          "fight — the little card with your name on."],
        ['say', 'wick', 'calm', "TENDER beats FRAYED. FRAYED beats DISTANT. " +
          "DISTANT beats TENDER. Being kind gets through to somebody angry. " +
          "Being angry gets through to somebody who's gone quiet. And going " +
          "quiet beats somebody trying to be kind at you."],
        ['say', 'june', 'low', "That's horrible."],
        ['say', 'wick', 'low', "Yes. Sorry. It's also true, so."],
        ['flag', 'tutorial_done'],
        ['wait', 0.5],
        ['say', 'wick', 'warm', "Try the door on the left. The one that smells " +
          "of butter. There's someone in there making a lot of noise."],
        ['chapter', 2],
        ['save']
      ],
      onSoothe: [
        ['wait', 0.3],
        ['say', 'wick', 'warm', "Oh. You held it."],
        ['say', 'wick', 'warm', "Most people hit it. It's a perfectly good thing " +
          "to hit."],
        ['say', 'june', 'calm', 'It was asleep.'],
        ['say', 'wick', 'calm', '...Yes. It was.'],
        ['wait', 0.6],
        ['say', 'wick', 'calm', "Right. Both work. HIT makes them stop. HOLD " +
          "makes them settle, if they're the settling kind."],
        ['say', 'wick', 'calm', "And watch your mood card. TENDER beats FRAYED, " +
          "FRAYED beats DISTANT, DISTANT beats TENDER. Kindness gets through " +
          "anger. Anger gets through silence. Silence gets through kindness."],
        ['say', 'june', 'low', "That last one's horrible."],
        ['say', 'wick', 'low', "Yes. Sorry."],
        ['flag', 'tutorial_done'],
        ['wait', 0.5],
        ['say', 'wick', 'warm', "Try the door on the left. Someone in there is " +
          "making a lot of noise."],
        ['chapter', 2],
        ['save']
      ]
    }]
  ];

  /* ==================================================================== *
   *  WAKING UP / THE REAL WORLD
   * ==================================================================== */

  S.wakeDoor = function () {
    if (!PW.flag('tutorial_done')) {
      return [['narrate', 'A small plain door with your own bedroom light under ' +
        'it. Not yet — you have only just got here.']];
    }
    return [
      ['narrate', 'Your own door, with your own lamplight coming under it.'],
      ['choice', 'Wake up?', [
        ['Yes.', [
          ['sfx', 'door'],
          ['stopmusic', 1.2],
          ['fade', 1.4],
          ['heal'],
          ['flag', 'ch_interlude'],
          ['goroom', 'bedroom', 'frombed'],
          ['music', 'real'],
          ['unfade', 1.6],
          ['narrate', 'You wake up in your own bed with your hand shut tight ' +
            'and the paperweight warm inside it.'],
          ['narrate', 'It is twenty past four in the morning. The rain has ' +
            'thinned out to the sound of a tap not quite turned off.'],
          ['save']
        ]],
        ['Not yet.', [
          ['narrate', 'Not yet.']
        ]]
      ]]
    ];
  };

  /* Going back to sleep, from the real bedroom. */
  S.bedSleep = [
    ['choice', 'Go back to sleep?', [
      ['Yes.', [
        ['sfx', 'heartbeat'],
        ['stopmusic', 1.6],
        ['fade', 1.8],
        ['heal'],
        ['goroom', 'hub', 'start'],
        ['music', 'dream'],
        ['unfade', 1.6],
        ['save']
      ]],
      ['No.', []]
    ]]
  ];

  /* -------------------------------------------------------- real world -- */

  S.nelsDoor = function () {
    if (PW.flag('opened_nels_door')) {
      return [['narrate', 'Her door. You have been in once. That was enough for ' +
        'this week.']];
    }
    return [
      ['narrate', 'The third door. Nobody has been in since March, and everybody ' +
        'has agreed not to mention that.'],
      ['wait', 0.4],
      ['narrate', 'You put your hand flat on it. It is exactly as cold as the ' +
        'other two doors, which feels like a betrayal on the part of the door.'],
      ['choice', null, [
        ['Open it.', [
          ['sfx', 'door'],
          ['wait', 0.6],
          ['narrate', 'Your hand is on the handle and your hand does not turn ' +
            'the handle.'],
          ['say', 'june', 'low', "...Tomorrow."],
          ['narrate', 'You have said tomorrow one hundred and twelve times.'],
          ['flag', 'tried_door', true]
        ]],
        ['Leave it.', [
          ['narrate', 'You leave it. Downstairs the fridge hums, and the house ' +
            'gets on with being a house.']
        ]]
      ]]
    ];
  };

  S.dellReal = function () {
    return [
      ['say', 'dell', 'warm', 'JUNE! June, June, June — okay, so, listen.'],
      ['say', 'june', 'calm', "It's four in the morning, Dell."],
      ['say', 'dell', 'warm', "It's four in the morning and I am OUT here, " +
        "which is objectively cooler than being asleep."],
      ['say', 'dell', 'calm', "I couldn't sleep either. I keep having this " +
        "dream about a kitchen."],
      ['wait', 0.5],
      ['say', 'june', 'raw', 'What kitchen.'],
      ['say', 'dell', 'calm', "Big one. Pans going round in the air like " +
        "they're on strings. It smells like your gran's."],
      ['wait', 0.8],
      ['say', 'june', 'low', '...'],
      ['say', 'dell', 'low', "I didn't mean — sorry. I say things and then " +
        "they're out."],
      ['say', 'june', 'calm', "No. It's — no, it's fine."],
      ['say', 'june', 'calm', "Dell. If you dream about the kitchen again, " +
        "go into it."],
      ['say', 'dell', 'warm', "That is the single most sinister thing anyone " +
        "has ever said to me and I'm absolutely going to."],
      ['flag', 'talked_dell_real', true],
      ['wait', 0.3],
      ['narrate', 'He rides off standing up on the pedals, which is how he ' +
        'does everything.']
    ];
  };

  S.shop = [
    ['narrate', 'The corner shop, shut, with one warm light left on over the ' +
      'till the way it always is.'],
    ['narrate', 'She used to send you down here for a bit of butter and a bit ' +
      'of sugar and you never came back with the right amount of either.'],
    ['choice', null, [
      ['Stand here a minute.', [
        ['wait', 1.2],
        ['narrate', 'You stand there a minute.'],
        ['sfx', 'wind'],
        ['narrate', 'It helps about as much as standing anywhere does, which ' +
          'turns out to be slightly more than nothing.'],
        ['flag', 'stood_at_shop', true]
      ]],
      ['Go home.', []]
    ]]
  ];

  /* ==================================================================== *
   *  ROOM TRIGGERS — one-off beats when you first arrive somewhere
   * ==================================================================== */

  S.roomTriggers = {

    bedroom: function () {
      if (PW.flag('ch_interlude') && !PW.flag('interlude_done')) {
        PW.flag('interlude_done', true);
        return [
          ['wait', 0.6],
          ['say', 'june', 'low', "That was the most detailed dream I have ever " +
            "had in my life."],
          ['say', 'june', 'calm', "There was a lamp. It was worried about me."],
          ['wait', 0.5],
          ['narrate', 'You could go out. It is four in the morning and the ' +
            'street will be empty and nobody could stop you.'],
          ['narrate', 'Or you could lie down and see if the hallway is still ' +
            'there.'],
          ['flag', 'can_sleep', true]
        ];
      }
      return null;
    },

    hub: function () {
      if (PW.state.chapter >= 5 && !PW.flag('ch5_intro')) {
        PW.flag('ch5_intro', true);
        return S.chapterFive;
      }
      if (PW.state.chapter >= 4 && !PW.flag('ch4_intro')) {
        PW.flag('ch4_intro', true);
        return [
          ['wait', 0.5],
          ['sfx', 'wind'],
          ['narrate', 'The hall is shorter than it was. Two of the doors have ' +
            'gone, and the wallpaper where they were is completely smooth.'],
          ['say', 'hal', 'low', "It's eating them."],
          ['say', 'wick', 'low', "It's not eating. It's tidying."],
          ['say', 'dell', 'raw', "Oh, well, that's fine then!"],
          ['say', 'wick', 'calm', "There's a door in the ceiling now. I know. " +
            "I don't like it either."]
        ];
      }
      return null;
    }
  };

  /* Sleeping in the real bed is handled through the bed entity. */
  var bedroomBed = null;
  for (var i = 0; i < PW.rooms.bedroom.entities.length; i++) {
    if (PW.rooms.bedroom.entities[i].id === 'bed') bedroomBed = PW.rooms.bedroom.entities[i];
  }
  if (bedroomBed) {
    bedroomBed.talk = function () {
      if (PW.flag('can_sleep')) return S.bedSleep;
      return [['narrate', 'Your bed. The quilt is the one she made, and two of ' +
        'the squares are cut from your old school pinafore.']];
    };
  }
})();
