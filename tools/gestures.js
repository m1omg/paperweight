/* PAPERWEIGHT — the gesture layer, driven by real touch events.
 *
 * tools/touch.js does this through headless Chrome and covers far more, but it
 * needs a Chrome binary. This runs anywhere node does: it fires genuine
 * touchstart/move/end sequences at the handlers input.js actually registered,
 * and reads the real input module rather than the scripted one smoke.js swaps
 * in for everything else.
 *
 * It exists because of a bug no still-fingered test could ever catch. A hand
 * makes a two-finger tap by rolling slightly, so the first finger drifts past
 * the drag threshold as the second lands — which used to throw the tap away
 * and steer instead. Every check below with a "roll" in it is that bug.
 *
 *   node tools/gestures.js
 */
const H = require('./smoke.js');
const {PW, fire, key, rawInput, tapFingers, settle} = H;
const R = rawInput;
let pass=0, fail=0;
const ck=(n,ok,d)=>{ ok?pass++:fail++; console.log((ok?'  ok   ':'  FAIL ')+n+(d?'  — '+d:'')); };
const T = (pts) => ({
  touches: pts.map((p,i)=>({identifier:i, clientX:p[0], clientY:p[1]})),
  changedTouches: pts.map((p,i)=>({identifier:i, clientX:p[0], clientY:p[1]})),
  target: { closest: () => null }, preventDefault(){}, stopPropagation(){}
});
const reset = () => { fire('touchcancel', T([])); R.flush.call(PW.input); };

// one finger still steers
reset();
fire('touchstart', T([[400,300]]));
fire('touchmove',  T([[400,240]]));            // straight up, well past DEAD
ck('a one-finger drag still walks up', R.held('up') && !R.held('down'),
   'up='+R.held('up')+' down='+R.held('down'));
fire('touchmove',  T([[470,300]]));            // now to the right
ck('and follows the finger to the right', R.held('right') && !R.held('up'),
   'right='+R.held('right')+' up='+R.held('up'));
fire('touchend', T([]));
ck('letting go stops her', !R.held('right') && !R.held('up'));
ck('and a drag is not a tap', !R.hit('ok'));

// diagonals
reset();
fire('touchstart', T([[400,300]]));
fire('touchmove',  T([[460,240]]));
ck('a diagonal holds both axes', R.held('up') && R.held('right'));
fire('touchend', T([]));

// taps of each arity, held perfectly still and with a roll
/* Two fingers and three say the same thing now: X and C were merged, because
   out in a room "back" has nothing to go back to and C was the only way to
   reach the pouch — so a two-finger tap did nothing where it mattered most. */
[[1,'ok'],[2,'back'],[3,'back']].forEach(([n,want])=>{
  reset(); tapFingers(n, 300, 200);
  ck(n+'-finger tap means '+want, R.hit(want), 'ok='+R.hit('ok')+' back='+R.hit('back'));
});
reset();
fire('touchstart', T([[400,300]]));
fire('touchstart', T([[400,300],[460,300],[520,300]]));
fire('touchmove',  T([[430,340],[460,300],[520,300]]));
fire('touchend',   T([]));
settle();
ck('a three-finger tap survives a roll too', R.hit('back'));

/* Everything below is a two-finger tap that the old release-time rules threw
   away. A gesture is decided when the fingers land, so none of it can. */

// held far too long to have been a tap, by the old rules
reset();
fire('touchstart', T([[400,300]]));
fire('touchstart', T([[400,300],[460,300]]));
settle();
const slow = R.hit('back');
settle(); settle();                         // ...and the fingers stay down...
fire('touchend',   T([]));
settle();
ck('back fires while the fingers are down, however long they stay there',
   slow && !R.hit('back'), 'fired='+slow+'  again on release='+R.hit('back'));

// the first finger wandering before the second one lands
reset();
fire('touchstart', T([[400,300]]));
fire('touchmove',  T([[400,260]]));         // 40px — a drag, by the old rules
fire('touchstart', T([[400,260],[460,260]]));
fire('touchend',   T([]));
settle();
ck('a two-finger tap after the first finger wandered still means back',
   R.hit('back') && !R.held('up'), 'back='+R.hit('back')+' up='+R.held('up'));

// the browser taking the gesture away after the hand was already down
reset();
fire('touchstart', T([[400,300]]));
fire('touchstart', T([[400,300],[460,300]]));
fire('touchcancel', T([]));
settle();
ck('a cancelled two-finger tap still lands', R.hit('back'), 'back='+R.hit('back'));

// fingers that lift raggedly, one long after the other
reset();
fire('touchstart', T([[400,300]]));
fire('touchstart', T([[400,300],[460,300]]));
fire('touchend',   T([[460,300]]));
settle();
fire('touchend',   T([]));
ck('back does not wait for the second finger to lift', R.hit('back'));

// and it must not fire twice for one hand
reset();
fire('touchstart', T([[400,300]]));
fire('touchstart', T([[400,300],[460,300]]));
fire('touchend',   T([]));
settle();
const once = R.hit('back');
settle();
ck('and it fires exactly once', once && !R.hit('back') && !R.hit('ok'),
   'again='+R.hit('back')+' ok='+R.hit('ok'));

// a third finger arriving a moment late is still a third finger
reset();
fire('touchstart', T([[400,300]]));
fire('touchstart', T([[400,300],[460,300]]));
fire('touchstart', T([[400,300],[460,300],[520,300]]));
fire('touchend',   T([]));
settle();
ck('a hand that lands raggedly still says back once',
   R.hit('back'), 'back='+R.hit('back'));

// a one-finger tap still reports where it landed
reset(); tapFingers(1, 312, 244);
ck('a one-finger tap still aims', JSON.stringify(R.tap())==='{"x":312,"y":244}', JSON.stringify(R.tap()));
reset(); tapFingers(2, 312, 244);
ck('a two-finger tap still aims at nothing', R.tap()===null, JSON.stringify(R.tap()));

// starting a walk and then adding a finger must not leave her walking
reset();
fire('touchstart', T([[400,300]]));
fire('touchmove',  T([[400,240]]));
ck('walking before the second finger', R.held('up'));
fire('touchstart', T([[400,240],[460,240]]));
ck('a second finger stops her walking', !R.held('up'), 'up='+R.held('up'));

/* The fullscreen button is 44px in the corner of a phone and only exists on
   touch devices. A finger straying onto it must not quietly downgrade the
   gesture — that turned *back* into *confirm*, which is worse than nothing. */
const onUI = (pts) => ({
  touches: pts.map((p,i)=>({identifier:i, clientX:p[0], clientY:p[1]})),
  changedTouches: pts.map((p,i)=>({identifier:i, clientX:p[0], clientY:p[1]})),
  target: { closest: () => ({ id: 'fs' }) }, preventDefault(){}, stopPropagation(){}
});
reset();
fire('touchstart', T([[400,300]]));
fire('touchstart', onUI([[400,300],[900,500]]));
fire('touchend',   T([[900,500]]));
fire('touchend',   T([]));
settle();
ck('a finger on the fullscreen button still counts',
   R.hit('back') && !R.hit('ok'), 'back='+R.hit('back')+' ok='+R.hit('ok'));

// ...but a tap that *starts* on the button is the DOM's, not the game's.
reset();
fire('touchstart', onUI([[900,500]]));
fire('touchend',   T([]));
ck('a tap that starts on the button is left alone',
   !R.hit('ok') && !R.hit('back'), 'ok='+R.hit('ok')+' back='+R.hit('back'));

/* X and C are one key on the keyboard too, which is the whole reason two
   fingers were useless: out in a room only C did anything, and two fingers
   said X. */
[['KeyX','X'],['Escape','Esc'],['KeyC','C'],['ShiftLeft','Shift']].forEach(([code,label])=>{
  reset(); key(code);
  ck(label+' means back', R.hit('back') && !R.hit('ok'), 'back='+R.hit('back'));
});
reset(); key('KeyZ');
ck('and Z is still its own key', R.hit('ok') && !R.hit('back'));

/* ------------------------------------------------------- double tap -- */

/* A double tap is back, which is the pouch out in a room. The price is that a
   single tap has to wait a moment to be sure it was single — so every check
   here is as much about what does *not* fire, and when. */
const frame = () => R.endFrame.call(PW.input, 1/60);
const frames = (n) => { for (let i = 0; i < n; i++) frame(); };

reset(); tapFingers(1, 300, 200, { wait: false });
ck('a tap waits before it means ok', !R.hit('ok') && R.tap()===null);
frames(6);
ck('...and is still waiting a tenth of a second on', !R.hit('ok'));
settle();
ck('...then lands, where it landed', R.hit('ok') && R.tap() && Math.round(R.tap().x)===300,
   JSON.stringify(R.tap()));

reset();
tapFingers(1, 300, 200, { wait: false }); frames(8);
tapFingers(1, 310, 205, { wait: false });
ck('two quick taps in one place are back', R.hit('back') && !R.hit('ok'),
   'back='+R.hit('back')+' ok='+R.hit('ok'));
settle(); settle();
ck('and the first of them never lands as ok', !R.hit('ok') && !R.hit('back') && R.tap()===null);

reset();
tapFingers(1, 300, 200, { wait: false }); frames(8);
fire('touchstart', H.ev([[305,200]]));
frames(40);                                   // a second finger down, and staying
ck('a second touch keeps the window open while it is down', !R.hit('ok') && !R.hit('back'));
fire('touchend', H.ev([]));
ck('...and a quick lift still makes it a double tap', R.hit('back') && !R.hit('ok'));

reset();
tapFingers(1, 200, 200, { wait: false }); frames(4);
tapFingers(1, 600, 300, { wait: false });
ck('two quick taps far apart are two taps: the first lands at once',
   R.hit('ok') && !R.hit('back') && Math.round(R.tap().x)===200, JSON.stringify(R.tap()));
frame(); settle();
ck('...and the second lands after it', R.hit('ok') && Math.round(R.tap().x)===600,
   JSON.stringify(R.tap()));

reset();
tapFingers(1, 300, 200, { wait: false }); frames(4);
fire('touchstart', H.ev([[300,200]]));
fire('touchmove',  H.ev([[300,140]]));
ck('a tap and then a walk from the same place: the tap lands, and she walks',
   R.hit('ok') && R.held('up') && !R.hit('back'), 'ok='+R.hit('ok')+' up='+R.held('up'));
fire('touchend', H.ev([]));

reset();
tapFingers(1, 300, 200, { wait: false }); frames(4);
fire('touchstart', H.ev([[300,200]], 1000));
fire('touchend',   H.ev([], 1900));             // held far too long to be a tap
ck('a tap and then a long press is one tap, not back', R.hit('ok') && !R.hit('back'));

reset();
tapFingers(1, 300, 200, { wait: false }); frames(4);
fire('touchstart', H.ev([[300,200]]));
fire('touchstart', H.ev([[300,200],[360,200]]));
fire('touchend',   H.ev([]));
ck('a tap and then a two-finger tap: the tap lands first', R.hit('ok') && !R.hit('back'));
frame(); settle();
ck('...and the two fingers still mean back', R.hit('back'));

// tapping fast through a conversation: three taps are a back and an ok,
// never a dropped tap — the dialogue box takes either as "go on"
reset();
tapFingers(1, 300, 200, { wait: false }); frames(5);
tapFingers(1, 300, 200, { wait: false });
const third0 = R.hit('back'); frames(5);
tapFingers(1, 300, 200, { wait: false }); settle();
ck('three quick taps are back and then ok', third0 && R.hit('ok'));

reset(); tapFingers(1, 300, 200, { wait: false }); R.flush.call(PW.input); settle();
ck('a scene changing under a waiting tap drops it', !R.hit('ok'));

/* ------------------------------------------------------------ swipes -- */

/* A swipe that is still moving as it lifts leaves her walking. That lives only
   in axisX/axisY: held() and rep() are what menus read, and they must see a
   swipe as one step of the cursor and nothing held afterwards. */
// [x, y, ms] points: down at the first, moved through the middle, lifted at the
// last. A browser never stamps an event 0, and the layer reads 0 as unstamped.
const swipe = (pts) => {
  const at = (p) => 1000 + p[2];
  fire('touchstart', H.ev([pts[0].slice(0,2)], at(pts[0])));
  for (let i = 1; i < pts.length - 1; i++) fire('touchmove', H.ev([pts[i].slice(0,2)], at(pts[i])));
  const end = pts[pts.length - 1];
  fire('touchend', Object.assign(H.ev([], at(end)), { changedTouches: H.ev([end.slice(0,2)]).changedTouches }));
};
const axes = () => R.axisX()+','+R.axisY();

reset();
swipe([[400,300,0],[400,250,40],[400,190,80],[400,180,90]]);
ck('a flick up leaves her walking up', axes()==='0,-1', axes());
frame();
ck('...without holding a key a menu could read', !R.held('up') && !R.rep('up'));
frames(60);
ck('...and she is still going a second later', axes()==='0,-1', axes());
fire('touchstart', H.ev([[700,100]]));
ck('a finger on the glass stops her', axes()==='0,0', axes());
fire('touchend', H.ev([]));
settle();
ck('...and that touch is still a tap', R.hit('ok'));

reset();
swipe([[400,300,0],[400,240,40],[400,200,700],[400,200,1000]]);
ck('a drag that came to rest before lifting stops on the lift', axes()==='0,0', axes());

reset();
swipe([[400,300,0],[400,250,300],[400,250,1500],[400,200,1530],[400,150,1560]]);
ck('a long drag that ends in a flick carries on', axes()==='0,-1', axes());

reset();
swipe([[400,300,0],[400,300,10],[490,300,70]]);
ck('a flick quicker than any move event still counts', axes()==='1,0', axes());
ck('...and is not a tap', !R.hit('ok') && !R.hit('back'));

reset();
swipe([[400,300,0],[480,260,60],[480,260,70]]);
ck('a slanted flick stays straight', axes()==='1,0', axes());
reset();
swipe([[400,300,0],[470,230,60],[470,230,70]]);
ck('a flick that means a diagonal gets one', axes()==='1,-1', axes());

reset();
swipe([[400,300,0],[400,190,80],[400,180,90]]);
R.halt.call(PW.input);
ck('the field can stop a flick (walking into a wall)', axes()==='0,0', axes());

reset();
swipe([[400,300,0],[400,190,80],[400,180,90]]);
key('ArrowLeft');
ck('a key stops a flick', axes()==='0,0', axes());

reset();
swipe([[400,300,0],[400,190,80],[400,180,90]]);
R.flush.call(PW.input);
ck('a scene changing stops a flick', axes()==='0,0', axes());

reset();
fire('touchstart', H.ev([[400,300]], 1000));
fire('touchmove',  H.ev([[400,370]], 1030));
ck('a swipe in a menu is one press of the key', R.hit('down') && R.held('down'));
fire('touchend', H.ev([], 1060));
ck('...released when it lifts', !R.held('down'));

/* ------------------------------------------------------- in a room -- */

// The field reads the real axes for this, not the scripted ones smoke.js
// swaps in, so a flick reaches her the way it would on a phone.
{
  const {tick, run, until, top} = H;
  const scripted = { x: PW.input.axisX, y: PW.input.axisY };
  PW.input.axisX = R.axisX; PW.input.axisY = R.axisY;

  PW.save.reset(); PW.state.slot = 0; PW.state.chapter = 2;
  PW.game.replace(new PW.FieldScene('hub', 'start'));
  top().script.stop();
  until(() => !PW.game.busy() && !top().script.running && !top().box.active, null, 600);
  const p = top().player;

  reset();
  const x0 = p.x;
  swipe([[500,300,0],[440,300,40],[380,300,80],[370,300,90]]);
  run(20);
  const x1 = p.x;
  ck('a flick walks her across the room', x1 < x0 - 30, Math.round(x0)+' -> '+Math.round(x1));
  until(() => !R.axisX(), null, 900);
  run(10);
  const x2 = p.x;
  run(10);
  ck('...until she walks into something, and there she stops',
     !R.axisX() && p.x === x2 && x2 < x1, Math.round(x2)+' axis='+R.axisX());

  reset();
  swipe([[500,300,0],[560,300,40],[620,300,80],[630,300,90]]);
  run(2);
  top().box.show(null, null, 'A line of somebody talking.', 'narrate');
  tick();
  ck('a conversation starting stops a flick', !R.axisX(), 'axis='+R.axisX());
  top().box.close();

  PW.input.axisX = scripted.x; PW.input.axisY = scripted.y;
  reset();
}

console.log('\n'+pass+'/'+(pass+fail)+' gesture checks passed');
process.exit(fail?1:0);
