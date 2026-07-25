/* PAPERWEIGHT — Chapter Three: the Drowned Garden. Hal, and the thing in the water. */
'use strict';

(function () {
  var S = PW.scripts;

  S.meetHal = function () {
    return [
      ['narrate', 'A girl is standing up to her ankles in the water with her ' +
        'back to you, winding red thread around a broken pane of glass as ' +
        'though she intends to mend it.'],
      ['wait', 0.6],
      ['say', 'hal', 'calm', "You're loud."],
      ['say', 'dell', 'raw', "That's Halloway Finch. She's in the year above. " +
        "She once told me my face was 'a lot'."],
      ['say', 'hal', 'calm', 'Your face is a lot, Odell.'],
      ['wait', 0.5],
      ['say', 'june', 'calm', "You're really here. You're not — you're not a " +
        "bit of the house."],
      ['say', 'hal', 'calm', "I've been here nine nights."],
      ['say', 'june', 'raw', 'Nine—'],
      ['say', 'hal', 'low', "I sleep a lot. There's not much on at home."],
      ['wait', 0.8],
      ['narrate', 'She winds the thread twice more and ties it off, and the ' +
        'crack in the glass stays exactly as cracked as it was.'],
      ['say', 'hal', 'calm', "It doesn't work. I know it doesn't work."],
      ['say', 'hal', 'calm', "You get to do useless things if you do them ' " +
        "quietly."],
      ['wait', 0.5],
      ['say', 'wick', 'warm', 'Hello.'],
      ['say', 'hal', 'calm', "Hello, lamp."],
      ['say', 'hal', 'calm', "There's something under the water in the middle. " +
        "It's been coming up a bit further every night. Tonight it's nearly out."],
      ['say', 'june', 'calm', "Come with us."],
      ['say', 'hal', 'low', '...Why.'],
      ['say', 'june', 'calm', "Because I'd rather not do it on my own and you're " +
        "already here."],
      ['wait', 0.8],
      ['say', 'hal', 'warm', "...Alright. That's a good enough reason. That's " +
        "better than most of them."],
      ['partyadd', 'hal'],
      ['hide', 'hal_meet'],
      ['give', 'thread'],
      ['flag', 'met_hal', true],
      ['save']
    ];
  };

  S.lily = function (which) {
    var flag = 'lily_' + which;
    if (PW.flag(flag)) {
      return [['narrate', 'A pale lily, open on the black water, giving off ' +
        'about as much light as a candle behind a hand.']];
    }
    var lines = {
      a: ['You put your hand near it and it leans, very slightly, toward the ' +
          'warmth. Like a cat that has decided about you.'],
      b: ['There is a wedding ring at the bottom of this one, sitting in the ' +
          'cup of the petals in an inch of rainwater.',
          'You leave it where it is. It is obviously exactly where it wants ' +
          'to be.'],
      c: ['This one has gone over. The petals are brown at the edges and it ' +
          'is still trying, in a determined way, to give off light.',
          'It manages some.']
    };
    var prog = [['sfx', 'water']];
    lines[which].forEach(function (l) { prog.push(['narrate', l]); });
    prog.push(['flag', flag, true]);
    prog.push(['call', function () { PW.counter('lilies', 1); }]);
    return prog;
  };

  S.wateringCan = function () {
    if (PW.flag('got_violet')) {
      return [['narrate', 'A brass watering can, half under the water, doing ' +
        'nothing useful.']];
    }
    return [
      ['sfx', 'water'],
      ['narrate', 'Her watering can, tipped over in the shallows. Something is ' +
        'wedged inside the spout.'],
      ['wait', 0.5],
      ['narrate', 'A violet, pressed flat between two little panes of glass and ' +
        'sealed round the edge with tape, the way you seal something you mean ' +
        'to keep for a long time.'],
      ['say', 'hal', 'calm', "Somebody made that carefully."],
      ['say', 'june', 'low', "She used to say the small ones were the stubborn " +
        "ones."],
      ['give', 'violet'],
      ['flag', 'got_violet', true]
    ];
  };

  S.deepWater = function () {
    if (PW.flag('beat_lily')) {
      return [['narrate', 'The middle of the greenhouse. Still water, and the ' +
        'whole sky lying on it, and nothing underneath any more.']];
    }
    if (!PW.party.has('hal')) {
      return [['narrate', 'The water gets deeper towards the middle. Something ' +
        'down there is pale and slow and you are not going out to it alone.']];
    }
    return [
      ['music', 'garden'],
      ['narrate', 'The water in the middle is deeper than a greenhouse floor ' +
        'has any right to be.'],
      ['wait', 0.6],
      ['sfx', 'water'],
      ['narrate', 'Something enormous and pale turns over, far down, and starts ' +
        'coming up.'],
      ['wait', 1.0],
      ['shake', 8, 0.8],
      ['sfx', 'boom'],
      ['narrate', 'A lily the size of a bed breaks the surface, and folded into ' +
        'the petals is a sleeping face made of clear water.'],
      ['wait', 0.8],
      ['say', 'dell', 'raw', "That's—"],
      ['say', 'june', 'raw', "Don't."],
      ['say', 'dell', 'low', "June, that's your gran's face."],
      ['say', 'june', 'raw', "IT ISN'T."],
      ['wait', 1.0],
      ['say', 'wick', 'low', "It isn't. It's the shape she left in the room. " +
        "Water goes into whatever shape is nearest."],
      ['say', 'hal', 'calm', "June. Look at me. It doesn't know your name. " +
        "It's going to try to say it and it's going to get it wrong."],
      ['say', 'june', 'low', "...Okay."],
      ['say', 'june', 'calm', "Okay. I'm ready."],
      ['tension', 0.55],
      ['battle', 'boss_lily', {
        onWin: [
          ['tension', 0],
          ['wait', 0.6],
          ['sfx', 'water'],
          ['narrate', 'The petals come apart and it goes back to being water, ' +
            'all at once, with a sound like a held breath being let out.'],
          ['wait', 0.8],
          ['say', 'june', 'low', "It said my name wrong. Every time."],
          ['say', 'hal', 'calm', "I know."],
          ['say', 'june', 'low', "She never got it wrong. Not once, not even " +
            "at the end, when she got everything else wrong."],
          ['wait', 0.6],
          ['say', 'hal', 'calm', "Then that wasn't her. That's the whole proof, " +
            "June. That's it."],
          ['run', function () { return S.afterLily; }]
        ],
        onSoothe: [
          ['tension', 0],
          ['wait', 0.6],
          ['sfx', 'chime'],
          ['flash', '#cfe9ff', 0.4, 1.0],
          ['narrate', 'You sit down in the water, which is cold, and let it ' +
            'hold your sleeve until it has finished.'],
          ['wait', 1.0],
          ['narrate', 'It sinks slowly, the way something is put to bed, and ' +
            'the petals close over the face from the outside in.'],
          ['wait', 0.8],
          ['say', 'dell', 'low', "...It was just lonely."],
          ['say', 'hal', 'calm', "It was water in a room-shaped hole. But yes."],
          ['say', 'june', 'calm', "It said my name wrong every time and I let " +
            "it anyway."],
          ['flag', 'soothed_lily', true],
          ['run', function () { return S.afterLily; }]
        ]
      }]
    ];
  };

  S.afterLily = [
    ['flag', 'beat_lily', true],
    ['chapter', 4],
    ['heal'],
    ['keptmax', 5],
    ['wait', 0.8],
    ['sfx', 'wind'],
    ['narrate', 'The water goes down. Not drains — goes down, like a shoulder ' +
      'dropping.'],
    ['wait', 0.6],
    ['say', 'wick', 'low', 'June.'],
    ['say', 'wick', 'low', 'The hall is shorter than it was when we came in ' +
      'here.'],
    ['say', 'hal', 'calm', "How much shorter."],
    ['say', 'wick', 'low', "Two doors. And I cannot remember what either of " +
      "them had behind it, and I am a lamp who remembers things. That is my " +
      "entire job."],
    ['wait', 0.6],
    ['say', 'wick', 'calm', "There's a door in the ceiling now. We should go " +
      "up before there is not."],
    ['save']
  ];
})();
