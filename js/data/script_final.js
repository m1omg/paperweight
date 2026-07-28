/* PAPERWEIGHT — Chapter Five: the door at the end of the hall. */
'use strict';

(function () {
  var S = PW.scripts;

  S.chapterFive = [
    ['wait', 0.8],
    ['sfx', 'wind'],
    ['narrate', 'The Hall of Doors has four enterable doors left in it.'],
    ['wait', 0.5],
    ['narrate', 'Three of them are shut and smooth and have no handles any ' +
      'more. The fourth is at the end, and it is the one Wick told you not to ' +
      'go through, and it is standing very slightly open.'],
    ['wait', 0.8],
    ['say', 'wick', 'low', 'Right.'],
    ['say', 'wick', 'low', "I said don't go through it yet. It is now yet."],
    ['wait', 0.6],
    ['say', 'dell', 'calm', "What's in there?"],
    ['say', 'wick', 'calm', "Her room. The real one, more or less, put together " +
      "out of what's left of it."],
    ['say', 'hal', 'calm', "And the thing that's been unmaking the house?"],
    ['say', 'wick', 'low', "In there too. It has been in there the whole time. " +
      "It lives at the bottom of the house the way damp does."],
    ['wait', 0.8],
    ['say', 'june', 'calm', "Then I need the key."],
    ['say', 'wick', 'warm', 'You have the key. You have had it since the attic. ' +
      'That is not the part you have been missing.']
  ];

  S.finalDoor = function () {
    if (PW.state.chapter < 5) {
      return [
        ['narrate', 'The door at the end of the hall. It is the only one that ' +
          'is the right size, in the right place, painted the right green.'],
        ['narrate', 'It is her door. You are not ready and the door knows it.'],
        ['say', 'wick', 'low', 'Not yet, June.']
      ];
    }
    if (PW.flag('final_started')) {
      return [['narrate', 'It stands open. There is only one direction left.']];
    }
    return [
      ['narrate', 'Her door, standing very slightly open, with warm light in ' +
        'the gap.'],
      ['wait', 0.6],
      ['choice', 'Go in?', [
        ['Go in.', [
          ['flag', 'final_started', true],
          ['sfx', 'door'],
          ['stopmusic', 1.2],
          ['fade', 1.4],
          ['goroom', 'finalroom', 'start'],
          ['music', 'nel'],
          ['unfade', 2.2],
          ['run', function () { return S.finalRoomIntro; }]
        ]],
        ['Not yet.', [
          ['narrate', 'Not yet.'],
          ['say', 'wick', 'calm', "It'll wait. It's very good at waiting. That " +
            "is not a comfort, but it's true."]
        ]]
      ]]
    ];
  };

  S.finalRoomIntro = [
    ['wait', 1.4],
    ['narrate', 'Her room.'],
    ['wait', 0.8],
    ['narrate', 'The lavender blanket. The rocking chair, turned very slightly, ' +
      'as though somebody has just got up out of it. Her glasses folded on a ' +
      'book she was two thirds of the way through.'],
    ['narrate', 'The window is pouring a warm gold light that is far too much ' +
      'light for four in the morning in March.'],
    ['wait', 1.0],
    ['say', 'dell', 'low', "...I'm going to wait by the door. Is that alright?"],
    ['say', 'june', 'calm', "Yeah."],
    ['say', 'hal', 'calm', "I'm not. I'm coming in."],
    ['say', 'june', 'warm', "...Thanks."],
    ['wait', 0.8],
    ['say', 'wick', 'calm', "Look round it properly. All of it. You will want " +
      "to have done."],
    ['flag', 'final_intro', true],
    ['save']
  ];

  /* ------------------------------------------------- things in her room -- */

  function count() {
    var n = 0;
    ['saw_chair', 'saw_bed', 'saw_glasses', 'saw_window'].forEach(function (f) {
      if (PW.flag(f)) n++;
    });
    return n;
  }

  function maybeSummon(prog) {
    if (count() >= 4 && !PW.flag('house_started')) {
      prog.push(['run', function () { return S.summonHouse; }]);
    }
    return prog;
  }

  S.rockingChair = function () {
    if (PW.flag('saw_chair')) {
      return maybeSummon([['narrate', 'The chair. Still rocking, very slightly, ' +
        'from nothing.']]);
    }
    return maybeSummon([
      ['narrate', 'Her chair. There is a dip worn into the seat cushion in the ' +
        'exact shape of a small woman who sat in one place for forty years.'],
      ['wait', 0.6],
      ['choice', null, [
        ['Sit in it.', [
          ['sfx', 'door'],
          ['narrate', 'You sit in it. It is much too big and it fits you ' +
            'perfectly, and both of those are true at once.'],
          ['wait', 0.8],
          ['say', 'june', 'low', "She used to do the crossword in here and get " +
            "cross at it."],
          ['say', 'hal', 'calm', "My gran did the same thing with the telly."],
          ['flag', 'sat_in_chair', true]
        ]],
        ['Leave it.', [
          ['narrate', 'You do not sit in it. It rocks slightly anyway, from ' +
            'nothing at all.']
        ]]
      ]],
      ['flag', 'saw_chair', true]
    ]);
  };

  S.nelBed = function () {
    if (PW.flag('saw_bed')) {
      return maybeSummon([['narrate', 'The bed, made, with the corners done ' +
        'properly.']]);
    }
    return maybeSummon([
      ['narrate', 'The bed is made. The corners are done the way she did them, ' +
        'tight enough to bounce a coin.'],
      ['wait', 0.6],
      ['narrate', 'She made it herself on the last morning. Nobody has been ' +
        'able to decide whether that means she knew.'],
      ['wait', 0.8],
      ['say', 'june', 'low', "She'd have hated the fuss."],
      ['say', 'hal', 'calm', "Everybody's gran hates the fuss. Then they all " +
        "get one anyway."],
      ['say', 'june', 'warm', "...She'd have hated it out loud, and then told " +
        "everyone about it for a year."],
      ['flag', 'saw_bed', true]
    ]);
  };

  S.glasses = function () {
    if (PW.flag('saw_glasses')) {
      return maybeSummon([['narrate', 'Her glasses, folded on the book. Page ' +
        'two hundred and eleven.']]);
    }
    return maybeSummon([
      ['sfx', 'glass'],
      ['narrate', 'Her round wire glasses, folded and set down on top of a ' +
        'library book with a ticket in it.'],
      ['narrate', 'She was two thirds of the way through. Page two hundred and ' +
        'eleven.'],
      ['wait', 1.0],
      ['say', 'june', 'low', "She's not going to find out how it ends."],
      ['wait', 0.8],
      ['say', 'hal', 'calm', "No."],
      ['say', 'hal', 'calm', "Do you want me to read it and tell you?"],
      ['say', 'june', 'warm', "...Yes. Actually, yes."],
      ['flag', 'saw_glasses', true]
    ]);
  };

  S.finalWindow = function () {
    if (PW.flag('saw_window')) {
      return maybeSummon([['narrate', 'Gold light, far too much of it, coming ' +
        'in from a March that never happened.']]);
    }
    return maybeSummon([
      ['narrate', 'The window is doing something impossible. It is a summer ' +
        'afternoon out there, the specific one where she taught you to whistle ' +
        'on the back step and you never quite got it.'],
      ['wait', 1.0],
      ['choice', null, [
        ['Try to whistle.', [
          ['wait', 0.6],
          ['narrate', 'You put your mouth in the shape and blow, and you get ' +
            'the same puff of air you have always got.'],
          ['wait', 0.6],
          ['say', 'june', 'warm', "Still can't."],
          ['say', 'wick', 'warm', "She couldn't either. She learnt at thirty. " +
            "She never told you that because it was funnier not to."],
          ['say', 'june', 'warm', "...That absolute liar."],
          ['flag', 'whistled', true]
        ]],
        ['Just watch.', [
          ['wait', 0.8],
          ['narrate', 'You watch it for a while. It does not change. It is ' +
            'very good at being a summer afternoon.']
        ]]
      ]],
      ['flag', 'saw_window', true]
    ]);
  };

  /* ==================================================================== *
   *  THE HOUSE THAT FORGETS
   * ==================================================================== */

  S.summonHouse = [
    ['flag', 'house_started', true],
    ['wait', 1.2],
    ['stopmusic', 1.6],
    ['tension', 0.5],
    ['wait', 1.0],
    ['sfx', 'erase'],
    ['shake', 5, 1.0],
    ['narrate', 'The wallpaper by the door goes blank. Not off — blank, all at ' +
      'once, like a word you have said too many times.'],
    ['wait', 0.8],
    ['say', 'dell', 'raw', 'JUNE—'],
    ['sfx', 'boom'],
    ['shake', 12, 1.2],
    ['narrate', 'The room stands up.'],
    ['wait', 1.0],
    ['narrate', 'All of it: the walls folding into shoulders, the two windows ' +
      'going up and up until they are eyes, a front door for a mouth, and the ' +
      'staircases of a house you have known your whole life coming down where ' +
      'the arms should be.'],
    ['wait', 1.0],
    ['say', 'wick', 'low', 'Oh.'],
    ['say', 'wick', 'low', "Oh, June, I'm sorry. It's not something in the " +
      "house."],
    ['say', 'june', 'low', "It's the house."],
    ['say', 'wick', 'low', "It's the house. It has been taking its own names " +
      "off. It has been doing it to itself since March, one room at a time, " +
      "because there is nobody left in it who knows what everything is called."],
    ['wait', 1.0],
    ['say', 'hal', 'calm', "It's not attacking. Look at it. It's holding its " +
      "hands out."],
    ['say', 'dell', 'low', "It's asking."],
    ['wait', 1.0],
    ['say', 'june', 'calm', "...I know what it's asking."],
    ['wait', 1.2],
    ['music', 'boss', { hard: true }],
    ['battle', 'boss_house', {
      onWin: [
        ['tension', 0],
        ['wait', 1.0],
        ['sfx', 'boom'],
        ['shake', 10, 1.2],
        ['narrate', 'It comes down in pieces, and every piece is a room, and ' +
          'every room goes white as it lands.'],
        ['wait', 1.2],
        ['narrate', 'When it is finished there is a girl standing in a ' +
          'perfectly empty white space, holding a glass paperweight very hard.'],
        ['wait', 1.0],
        ['say', 'wick', 'low', "...You beat it."],
        ['say', 'june', 'low', "Yeah."],
        ['say', 'wick', 'low', "June, you beat the house."],
        ['wait', 1.2],
        ['run', function () { return S.finale; }]
      ],
      onSoothe: [
        ['tension', 0],
        ['wait', 1.0],
        ['sfx', 'chime'],
        ['flash', '#ffe9c4', 0.55, 1.4],
        ['narrate', 'You stop hitting the house.'],
        ['wait', 0.8],
        ['narrate', 'You put both arms as far around it as they will go, which ' +
          'is not far at all, roughly as far as a doorframe, and you hold on.'],
        ['wait', 1.4],
        ['narrate', 'It goes very still. Then it folds down — not falls, folds, ' +
          'the way she used to fold a sheet, in half and in half and in half — ' +
          'until it is small enough to sit in a room again.'],
        ['wait', 1.2],
        ['flag', 'soothed_the_house', true],
        ['run', function () { return S.finale; }]
      ]
    }]
  ];

  /* ==================================================================== *
   *  NEL
   * ==================================================================== */

  S.finale = [
    ['heal'],
    ['stopmusic', 1.4],
    ['wait', 1.4],
    ['fade', 1.8, '#f7ecd8'],
    ['wait', 1.0],
    ['music', 'memory'],
    ['unfade', 2.4],
    ['wait', 1.2],
    ['narrate', 'Her room again, put back, exactly and only as big as a room.'],
    ['wait', 0.8],
    ['narrate', 'There is somebody in the chair.'],
    ['wait', 1.6],
    ['say', 'nel', 'calm', "There you are."],
    ['wait', 1.2],
    ['say', 'june', 'low', "...You're not really here."],
    ['say', 'nel', 'warm', "No, love. I'm the bit of you that does my voice. " +
      "You've got it very good, mind. You've got the cough."],
    ['wait', 0.8],
    ['say', 'june', 'low', "I didn't come in. For four months. I stood outside " +
      "your door about a hundred times and I never once—"],
    ['say', 'nel', 'calm', "I know."],
    ['say', 'june', 'raw', "I'm sorry."],
    ['say', 'nel', 'calm', "I know. Come here."],
    ['wait', 1.4],
    ['sfx', 'heartbeat'],
    ['narrate', 'You go over. She is exactly the right size, which is small, ' +
      'and she smells of the lavender bag in her cardigan drawer, which your ' +
      'brain has apparently been keeping in perfect condition for four months ' +
      'without asking you.'],
    ['wait', 1.6],
    ['say', 'nel', 'calm', "Now. That thing you were carrying. Let's have a " +
      "look at it."],
    ['wait', 1.0],
    ['run', function () { return S.finalChoice; }]
  ];

  S.finalChoice = [
    ['narrate', 'You hold out the paperweight. The little house inside it is ' +
      'lit, and the gold flecks go round when you turn it, and it is heavy.'],
    ['wait', 1.0],
    ['say', 'nel', 'warm', "Do you know what that's for?"],
    ['say', 'june', 'calm', "Holding things down."],
    ['say', 'nel', 'warm', "It's for holding things down SO YOU CAN LEAVE THE " +
      "WINDOW OPEN, June. That's the whole point of it. Otherwise you'd just " +
      "shut the window."],
    ['wait', 1.4],
    ['say', 'nel', 'calm', "You're allowed to keep a thing and put a thing " +
      "down. They're not opposites. Nobody tells you that and it's the only " +
      "useful thing I know."],
    ['wait', 1.6],
    ['say', 'nel', 'warm', "Right. Off you go. It's nearly morning and you've " +
      "school."],
    ['say', 'june', 'raw', "It's the holidays."],
    ['say', 'nel', 'warm', "Then you've nothing to do, so go and do it with " +
      "someone."],
    ['wait', 1.6],
    ['stopmusic', 2.4],
    ['fade', 3.0, '#f7ecd8'],
    ['wait', 1.6],
    ['ending']
  ];
})();
