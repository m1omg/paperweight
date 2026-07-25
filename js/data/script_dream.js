/* PAPERWEIGHT — the Hall of Doors between chapters, and party chatter. */
'use strict';

(function () {
  var S = PW.scripts;

  /* Wick is happy to be asked what is going on. It is most of his job. */
  S.askWick = function () {
    var lines;
    if (PW.state.chapter <= 2) {
      lines = [
        ['say', 'wick', 'calm', "The house is bigger on the inside than it " +
          "should be, and it is getting smaller. Both at once. I have stopped " +
          "trying to make that sound sensible."],
        ['say', 'wick', 'warm', "Try the doors. Take what's behind them. That's " +
          "genuinely all the advice I have."]
      ];
    } else if (PW.state.chapter === 3) {
      lines = [
        ['say', 'wick', 'low', "Two doors have gone since we started and I " +
          "cannot remember either of them."],
        ['say', 'wick', 'calm', "I can remember that I have forgotten, which " +
          "is the worst possible amount of remembering."]
      ];
    } else {
      lines = [
        ['say', 'wick', 'low', "Not long now."],
        ['say', 'wick', 'calm', "June. Whatever's at the end — you're allowed " +
          "to decide what to do about it when you're standing in front of it. " +
          "You don't have to decide out here."]
      ];
    }
    return lines;
  };

  /* Optional party talk in the hub — small, cumulative, never required. */
  S.partyTalk = function () {
    var who = PW.state.party;
    var pool = [];

    if (who.indexOf('dell') >= 0) {
      pool.push([['say', 'dell', 'warm', "Do you reckon if I fall asleep IN " +
        "here I wake up somewhere even further in?"],
        ['say', 'hal', 'calm', "Please don't test that."],
        ['say', 'dell', 'warm', "I'm absolutely going to test that."]]);
      pool.push([['say', 'dell', 'low', "My mum thinks I'm being weird about " +
        "your gran because I keep asking about her."],
        ['say', 'dell', 'calm', "I'm not being weird. I liked her. She let me " +
          "stir things."],
        ['say', 'june', 'warm', "You dropped a whole egg in the flour."],
        ['say', 'dell', 'warm', "AND SHE LET ME STIR IT ANYWAY."]]);
    }
    if (who.indexOf('hal') >= 0) {
      pool.push([['say', 'hal', 'calm', "You keep checking the pouch."],
        ['say', 'june', 'low', "I'm not."],
        ['say', 'hal', 'calm', "You are. It's fine. I count the stairs at home."],
        ['say', 'hal', 'low', "Fourteen. Every time. In case."]]);
      pool.push([['say', 'june', 'calm', "Why the thread?"],
        ['say', 'hal', 'low', "..."],
        ['say', 'hal', 'low', "My dad's shirt lost a button in February and I " +
          "sewed it on and he wore it and he didn't say anything."],
        ['say', 'hal', 'calm', "It's just the best conversation we've had in a " +
          "year, that's all. So I keep some on me."]]);
    }
    pool.push([['say', 'wick', 'warm', "Ask me something."],
      ['say', 'june', 'calm', "Were you hers?"],
      ['say', 'wick', 'calm', "..."],
      ['say', 'wick', 'warm', "I was on her landing for thirty years with a " +
        "bulb in me. Make of that what you like."]]);

    return PW.util.pick(pool);
  };

  /* The rug in the hub gives you a save point and a chat. */
  var hub = PW.rooms.hub;
  for (var i = 0; i < hub.entities.length; i++) {
    var e = hub.entities[i];
    if (e.id === 'rug') {
      e.label = 'sit down a minute';
      e.talk = function () {
        return [
          ['narrate', 'You sit down on the rug in the middle of a hallway that ' +
            'goes on too long, which is a perfectly reasonable thing to do in ' +
            'a dream.'],
          ['heal'],
          ['sfx', 'heal'],
          ['call', function () { PW.game.toast('everyone catches their breath'); }],
          ['save'],
          ['choice', null, [
            ['Ask Wick what is going on.', S.askWick()],
            ['Talk to everyone.', S.partyTalk()],
            ['Just sit.', [
              ['wait', 1.0],
              ['narrate', 'You just sit. Somewhere a long way off, a door ' +
                'closes politely.']
            ]]
          ]]
        ];
      };
    }
  }
})();
