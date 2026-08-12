/* PAPERWEIGHT — the three ways it can end, and the credits.
 *
 * Which one you get is not a dialogue choice at the last minute. It is how you
 * spent the whole game: whether you held things, and whether you put anything
 * down.
 */
'use strict';

PW.ENDINGS = {

  /* Fought everything through to the end. */
  held_on: {
    title: 'HELD ON',
    music: 'memory',
    tint: '#0b0a14',
    lines: [
      'You wake up with your hand cramped shut.',
      'It takes a minute to work the fingers open. The paperweight is still ' +
      'in there, warm as a held breath, with its little house and its little ' +
      'tree and its slow gold snow.',
      'The rain has stopped. Downstairs somebody is filling the kettle.',
      'You keep it. Of course you keep it. You put it on the shelf where it ' +
      'lived, and you turn it so the house inside faces the window, because ' +
      'she used to do that and you never asked why.',
      'Her door stays shut for another year.',
      'That is allowed. Some things you carry for a long time before you find ' +
      'out what they weigh.'
    ],
    coda: 'you held on to all of it'
  },

  /* Settled most of the house instead of destroying it. */
  set_down: {
    title: 'SET DOWN',
    music: 'ending',
    tint: '#100c1c',
    lines: [
      'You wake up with your hand open.',
      'The paperweight has rolled into the dip of the quilt beside you, which ' +
      'is where it stayed all night, doing what paperweights do: sitting still ' +
      'and keeping one small thing from blowing away.',
      'You go down the landing in your socks and you stand outside her door ' +
      'for a while, the way you have every night since March.',
      'Then you open it.',
      'It is only a room. Lavender blanket, empty chair, her glasses folded on ' +
      'a book she was two thirds through. Dust in the light. Nothing in it is ' +
      'frightening, and nothing in it is her, and both of those things take a ' +
      'moment to get down.',
      'You put the paperweight on her bedside table, next to the glasses.',
      'You leave the door open.'
    ],
    coda: 'you let the house be a house'
  },

  /* Held things *and* let something go. */
  keep_going: {
    title: 'KEEP GOING',
    music: 'ending',
    tint: '#14101f',
    lines: [
      'You wake up before the alarm, which never happens, and lie there ' +
      'listening to the house being a house: the boiler, a pipe, Dell\'s bike ' +
      'going past too fast on the wet road.',
      'The paperweight is on the pillow next to you like a small sleeping ' +
      'animal.',
      'Here is the thing nobody tells you. You do not get to choose between ' +
      'keeping her and putting her down. You keep some of it — the crown, the ' +
      'song with eleven notes, the way she said "a bit of" instead of an ' +
      'amount — and the rest you set down gently, in a room with the door left ' +
      'open, because you cannot carry a whole house.',
      'You get up. You eat something. You go and knock for Dell, and Hal is ' +
      'already at the corner pretending she was not waiting.',
      'It is a Tuesday. The light is doing something ordinary and good on the ' +
      'wet street.',
      'Somewhere behind you, in a hallway with too many doors, a lamp with ' +
      'moth wings puts itself out, satisfied.'
    ],
    coda: 'you kept what you could carry'
  }
};

/** Decide the ending from how the whole game was played. */
PW.pickEnding = function () {
  var soothed = PW.counter('soothed_count');
  var putDown = PW.counter('put_down');
  var heldHouse = PW.flag('soothed_the_house');

  if (heldHouse && putDown > 0) return 'keep_going';
  if (heldHouse || soothed >= 4) return 'set_down';
  return 'held_on';
};

/* ======================================================================== */

PW.EndingScene = function (id) {
  this.name = 'ending';
  this.opaque = true;
  this.id = id || PW.pickEnding();
  this.data = PW.ENDINGS[this.id] || PW.ENDINGS.held_on;
  this.t = 0;
  this.phase = 'title';
  this.line = 0;
  this.shown = 0;
  this.dust = new PW.draw.Dust(38, { color: 'rgba(250,238,205,' });
  this.credits = 0;
};

PW.EndingScene.prototype = {

  enter: function () {
    // The finale fades to cream and then hands over; whoever replaces a scene
    // raises the veil again, and nothing else was going to raise this one.
    PW.game.fadeIn(1.6);
    PW.state.endingSeen = this.id;
    PW.counter('endings_' + this.id, 1);
    PW.audio.setTension(0);
    PW.audio.play(this.data.music, { fade: 1.2 });
    if (PW.state.slot !== undefined) PW.save.write(PW.state.slot);
    this.phaseT = 3.2;
  },

  update: function (dt) {
    this.t += dt;
    this.dust.update(dt);

    if (this.phase === 'title') {
      this.phaseT -= dt;
      if (this.phaseT <= 0 || PW.input.hit('ok')) {
        this.phase = 'lines';
        this.shown = 0;
      }
      return;
    }

    if (this.phase === 'lines') {
      var text = this.data.lines[this.line];
      if (this.shown < text.length) {
        this.shown += 42 * dt;
        if (PW.input.hit('ok')) this.shown = text.length;
      } else if (PW.input.hit('ok')) {
        PW.audio.sfx('cursor');
        this.line++;
        this.shown = 0;
        if (this.line >= this.data.lines.length) {
          this.phase = 'coda';
          this.phaseT = 4.5;
        }
      }
      return;
    }

    if (this.phase === 'coda') {
      this.phaseT -= dt;
      if (this.phaseT <= 0 || PW.input.hit('ok')) {
        this.phase = 'credits';
        this.credits = 0;
      }
      return;
    }

    // credits
    this.credits += dt * (PW.input.held('ok') ? 3 : 1);
    if (this.credits > 34) {
      PW.audio.stopMusic(2.0);
      PW.game.fadeOut(2.0, '#0b0a14', function () {
        PW.game.replace(new PW.TitleScene());
        PW.game.fadeIn(1.4);
      });
      this.phase = 'done';
    }
  },

  draw: function (ctx) {
    var D = PW.draw;
    ctx.fillStyle = this.data.tint;
    ctx.fillRect(0, 0, PW.W, PW.H);
    this.dust.draw(ctx);

    if (this.phase === 'title') {
      var a = PW.util.clamp(this.t * 0.5, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      D.text(ctx, this.data.title, PW.W / 2, PW.H / 2 - 40, {
        size: 54, align: 'center', color: '#f6e7c4',
        glow: 'rgba(246,231,196,.5)', glowBlur: 30, wobble: 1.5
      });
      ctx.restore();
      return;
    }

    if (this.phase === 'lines') {
      var text = this.data.lines[this.line];
      var vis = text.substring(0, Math.floor(this.shown));
      D.textBlock(ctx, vis, 130, 170, PW.W - 260, {
        size: 22, color: '#e9dcc6', lineHeight: 34, shadow: false, wobble: 0.7
      });
      if (this.shown >= text.length) {
        ctx.save();
        ctx.globalAlpha = 0.35 + 0.35 * Math.sin(this.t * 3);
        D.text(ctx, this.line >= this.data.lines.length - 1 ? 'Z' : 'Z',
          PW.W - 130, PW.H - 92, { size: 18, color: '#a99cc0', shadow: false });
        ctx.restore();
      }
      var prog = (this.line + 1) + ' / ' + this.data.lines.length;
      D.text(ctx, prog, 130, PW.H - 90, { size: 14, color: '#585070', shadow: false });
      return;
    }

    if (this.phase === 'coda' || this.phase === 'done') {
      var ca = PW.util.clamp((4.5 - this.phaseT) * 0.8, 0, 1);
      ctx.save();
      ctx.globalAlpha = ca;
      var img = PW.assets.img('ui_paperweight');
      var s = Math.min(190 / img.width, 190 / img.height);
      D.sprite(ctx, img, PW.W / 2, PW.H / 2 + 30 + Math.sin(this.t) * 4, s,
        { tint: 'rgba(255,220,150,.6)', tintBlur: 40 });
      D.text(ctx, this.data.coda, PW.W / 2, PW.H / 2 + 74, {
        size: 22, align: 'center', color: '#cbb9a2', shadow: false
      });
      ctx.restore();
      if (this.phase === 'coda') return;
    }

    if (this.phase === 'credits') this.drawCredits(ctx);
  },

  drawCredits: function (ctx) {
    var D = PW.draw;
    var CR = [
      'PAPERWEIGHT', '',
      'a small game about the things we hold onto', '', '',
      'JUNE — who holds things',
      'DELL — who is loud on purpose',
      'HAL — who mends instead of apologising',
      'WICK — a lamp with moth wings', '',
      'and NEL, at the end of the landing', '', '',
      'chapter one — the shelf',
      'chapter two — the kitchen that hums',
      'chapter three — the drowned garden',
      'chapter four — the attic of names',
      'chapter five — the room at the end of the hall', '', '',
      'every picture drawn by a machine that was asked nicely',
      'every note played by the browser you are holding this in',
      'nothing here is a recording of anything', '', '',
      PW.state.battlesWon + ' things met',
      PW.counter('soothed_count') + ' of them held instead',
      PW.state.kept.length + ' things kept',
      PW.counter('put_down') + ' things set down', '', '',
      'thank you for staying to the end', '',
      'go and ring somebody'
    ];
    var y = PW.H + 30 - this.credits * 34;
    for (var i = 0; i < CR.length; i++) {
      var ly = y + i * 34;
      if (ly < -40 || ly > PW.H + 40) continue;
      var big = i === 0;
      var fade = PW.util.clamp(Math.min(ly / 90, (PW.H - ly) / 90), 0, 1);
      ctx.save();
      ctx.globalAlpha = fade;
      D.text(ctx, CR[i], PW.W / 2, ly, {
        size: big ? 34 : 19, align: 'center',
        color: big ? '#f6e7c4' : '#bdb0a0', shadow: false, wobble: big ? 1.3 : 0.6
      });
      ctx.restore();
    }
  }
};
