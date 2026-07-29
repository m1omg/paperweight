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
const {PW, fire, rawInput, tapFingers} = H;
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
[[1,'ok'],[2,'back'],[3,'menu']].forEach(([n,want])=>{
  reset(); tapFingers(n, 300, 200);
  ck(n+'-finger tap still means '+want, R.hit(want), 'ok='+R.hit('ok')+' back='+R.hit('back')+' menu='+R.hit('menu'));
});
reset();
fire('touchstart', T([[400,300]]));
fire('touchstart', T([[400,300],[460,300],[520,300]]));
fire('touchmove',  T([[430,340],[460,300],[520,300]]));
fire('touchend',   T([]));
ck('a three-finger tap survives a roll too', R.hit('menu'));

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
ck('a finger on the fullscreen button still counts',
   R.hit('back') && !R.hit('ok'), 'back='+R.hit('back')+' ok='+R.hit('ok'));

// ...but a tap that *starts* on the button is the DOM's, not the game's.
reset();
fire('touchstart', onUI([[900,500]]));
fire('touchend',   T([]));
ck('a tap that starts on the button is left alone',
   !R.hit('ok') && !R.hit('back'), 'ok='+R.hit('ok')+' back='+R.hit('back'));

console.log('\n'+pass+'/'+(pass+fail)+' gesture checks passed');
process.exit(fail?1:0);
