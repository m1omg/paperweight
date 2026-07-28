/* PAPERWEIGHT — the paths tools/smoke.js does not take.
 *
 * Endings, every skill, every item, the mood triangle, a party wipe, saving,
 * and the waking-world chapter. Run with:  node tools/paths.js
 */
'use strict';
const H = require('./smoke.js');
const {PW, tick, run, until, top, errors} = H;
let pass=0, fail=0;
const ck=(n,ok,d)=>{ ok?pass++:fail++; console.log((ok?'  ok   ':'  FAIL ')+n+(d?'  — '+d:'')); };

// --- ending selection logic ---
function endingFor(soothed, putDown, house){
  PW.save.reset();
  PW.state.flags.soothed_count = soothed;
  PW.state.flags.put_down = putDown;
  PW.flag('soothed_the_house', house);
  return PW.pickEnding();
}
ck('fight everything -> HELD ON', endingFor(0,0,false)==='held_on', endingFor(0,0,false));
ck('settle a lot -> SET DOWN', endingFor(5,0,false)==='set_down', endingFor(5,0,false));
ck('hold the house only -> SET DOWN', endingFor(0,0,true)==='set_down', endingFor(0,0,true));
ck('hold + let go -> KEEP GOING', endingFor(2,1,true)==='keep_going', endingFor(2,1,true));

// each ending scene renders start to finish
['held_on','set_down','keep_going'].forEach(id=>{
  PW.save.reset();
  const before = errors.length;
  PW.game.start(new PW.EndingScene(id));
  for(let i=0;i<1400;i++) tick(i%4===0?'ok':null);
  ck('ending "'+id+'" plays through', errors.length===before, errors.slice(before)[0]);
});

// --- battle mechanics ---
PW.save.reset();
['wick','dell','hal'].forEach(x=>PW.party.add(x));
PW.state.party.forEach(id=>{ PW.party.rec(id).lv = 9; const s=PW.party.stats(id); PW.party.rec(id).hp=s.maxhp; PW.party.rec(id).bp=s.maxbp; });
PW.items.give('jam',5); PW.items.give('pencil',3); PW.items.give('crane',2);
PW.game.start(new PW.FieldScene('hub','start'));
until(()=>top().name==='field'&&!top().script.running,'ok',600);

// every skill of every character, cast in a real fight
const allSkills = [];
PW.state.party.forEach(id => PW.party.skillsOf(id).forEach(s=>allSkills.push([id,s])));
ck('everyone has learned several skills', allSkills.length >= 14, allSkills.length+' skills');

let castErrors = 0;
allSkills.forEach(([id, sk])=>{
  const before = errors.length;
  PW.game.push(new PW.BattleScene('hub_c',{}));
  const b = top();
  const actor = b.party.find(p=>p.id===id);
  const skill = PW.skills.get(sk);
  actor.bp = 999;
  try {
    b.doSkill(actor, skill, skill.target==='enemy'||skill.target==='allEnemies' ? b.foes[0] : b.party[0]);
    for(let i=0;i<10;i++) tick();
  } catch(e){ castErrors++; console.log('    cast '+sk+': '+e.message); }
  if (errors.length>before) { castErrors++; console.log('    render after '+sk+': '+errors[before]); }
  PW.game.pop();
});
ck('every skill can be cast and drawn', castErrors===0, castErrors+' failures');

// every item usable in battle
PW.game.push(new PW.BattleScene('hub_c',{}));
let itemErrors=0;
Object.keys(PW.items.all).forEach(id=>{
  const it = PW.items.get(id);
  if (!it.target) return;
  PW.items.give(id);
  const b = top();
  try { b.doItem(b.party[0], it, id, it.target==='enemy'?b.foes[0]:b.party[0]); for(let i=0;i<6;i++) tick(); }
  catch(e){ itemErrors++; console.log('    '+id+': '+e.message); }
});
ck('every usable item works in battle', itemErrors===0, itemErrors+' failures');
PW.game.pop();

// mood triangle maths
const M=PW.moods;
const t={id:'tender',lvl:1}, f={id:'frayed',lvl:1}, d={id:'distant',lvl:1}, s=M.blank();
ck('tender beats frayed', M.mult(t,f)===1.5);
ck('frayed beats distant', M.mult(f,d)===1.5);
ck('distant beats tender', M.mult(d,t)===1.5);
ck('and each loses the other way', M.mult(f,t)===0.7 && M.mult(d,f)===0.7 && M.mult(t,d)===0.7);
ck('steady is neutral both ways', M.mult(s,t)===1 && M.mult(t,s)===1);
const m={id:'tender',lvl:2};
M.shift(m,'frayed',1);
ck('a different feeling cools you first', m.id==='tender'&&m.lvl===1, m.id+':'+m.lvl);
M.shift(m,'frayed',1); M.shift(m,'frayed',1);
ck('then it can take hold', m.id==='frayed'&&m.lvl===1, m.id+':'+m.lvl);

// fleeing, and a party wipe that offers to get up
PW.save.reset();
PW.game.start(new PW.FieldScene('hub','start'));
until(()=>!top().script.running,'ok',600);
PW.game.push(new PW.BattleScene('hub_a',{}));
let b=top(); b.party.forEach(p=>{p.hp=1;});
b.foes.forEach(x=>{x.atk=999;});
until(()=>top().name!=='battle'||top().result,'ok',3000);
ck('a party wipe is survivable', top().name==='battle' && top().result==='lose', top().result);
until(()=>top().box.choices,'ok',600);
// one press finishes the typing, the next picks "Get up."
until(()=>!top().result,'ok',300); run(20);
ck('"get up" restarts the fight', top().name==='battle' && !top().result &&
   top().party.every(p=>p.hp>1),
   top().name+' '+top().result+' hp='+top().party.map(p=>p.hp).join(','));

// saving and loading round-trips
PW.save.reset();
PW.state.chapter=3; PW.state.room='garden'; PW.party.add('dell'); PW.items.give('crown');
PW.flag('test_flag', true);
const wrote = PW.save.write(1);
PW.save.reset();
const read = PW.save.load(1);
ck('a save can be written and read back', wrote && read &&
   PW.state.chapter===3 && PW.state.room==='garden' &&
   PW.party.has('dell') && PW.items.has('crown') && PW.flag('test_flag'));

/* --- saves must survive the game changing underneath them -----------------
 *
 * Somebody is always mid-playthrough. A save written by any build has to load
 * in any other, in both directions, so the rule is: newState() is the whole
 * shape of a save, load() back-fills anything an older one lacks, and nothing
 * anywhere else invents a field. These checks are what stop that drifting —
 * `pocket` was conjured into PW.state by items.js for a long time without ever
 * appearing in the template, which worked purely by luck.
 */
PW.save.reset();
const TEMPLATE = Object.keys(PW.state).sort();

// Play a save as hard as the game can: party, pockets, memories, counters.
PW.state.chapter = 5;
['wick','dell','hal'].forEach(id=>PW.party.add(id));
PW.items.give('sock'); PW.items.give('crown'); PW.items.give('marble');
PW.flag('soothed_lily', true); PW.counter('soothed_count', 2);
const strays = Object.keys(PW.state).filter(k=>TEMPLATE.indexOf(k)<0 && k!=='savedAt');
ck('play invents no field newState() does not declare', strays.length===0, strays.join(', '));

// The blob has to stay plain JSON — rooms.js now holds a function for the
// hall's art, and a function reaching PW.state would break every old build.
let blob=null; try { blob = JSON.stringify(PW.state); } catch(e) { blob = null; }
ck('a save is still plain JSON', !!blob && JSON.parse(blob) && blob.indexOf('function')<0);

// ...and a save from before any of today's fields existed still has to load.
const older = { version:1, chapter:5, flags:{beat_lily:true}, party:['june','wick'],
  actors:{ june:{id:'june',lv:6,xp:3,hp:60,bp:30,skills:['steady_breath','say_it']},
           wick:{id:'wick',lv:6,xp:3,hp:45,bp:50,skills:['warm_up','remember_when']} },
  kept:['paperweight'], keptMax:5, room:'hub', spawn:'start', facing:'down',
  playtime:900, steps:4000, battlesWon:7, endingSeen:null };
PW.state = JSON.parse(JSON.stringify(older));
PW.save.reset.call(PW.save);                       // grab a fresh template...
const blank = PW.state;
PW.state = JSON.parse(JSON.stringify(older));      // ...then back-fill like load()
for (const k in blank) if (PW.state[k]===undefined) PW.state[k] = blank[k];
ck('a save with fields missing still loads',
   PW.state.chapter===5 && PW.party.has('wick') && PW.items.count('sock')===0);
ck('an old save picks up art added since', PW.roomBg(PW.rooms.hub)==='bg_hub_bare',
   PW.roomBg(PW.rooms.hub));
ck('an old actor picks up skills added since',
   PW.party.skillsOf('wick').indexOf('say_their_name')>=0,
   PW.party.skillsOf('wick').join(', '));

// the real-world interlude branch
PW.save.reset();
PW.flag('tutorial_done',true); PW.flag('ch_interlude',true); PW.flag('can_sleep',true);
PW.game.start(new PW.FieldScene('landing','frombedroom'));
until(()=>!top().script.running&&!PW.game.busy(),'ok',600);
// Walk to the nearest floor tile from which `e` is the thing the player would
// touch, rather than guessing a spot — the rooms are painted, not laid out.
function stand(sc,e){ let best=null,bestD=1e9;
  for(let x=0;x<960;x+=8) for(let y=0;y<540;y+=8){ if(!sc.canStand(x,y)) continue;
    for(const dir of ['up','down','left','right']){ if(sc.nearest({x,y,dir})!==e) continue;
      const d=Math.hypot(x-e.x,y-e.y); if(d<bestD){bestD=d;best={x,y,dir};} } }
  if(!best) return false;
  sc.player.x=best.x; sc.player.y=best.y; sc.player.dir=best.dir; return true; }
function use(id){ until(()=>top().name==='field'&&!top().script.running&&!top().box.active&&!PW.game.busy(),null,600);
  const sc=top(); const e=sc.entities.find(x=>x.id===id); if(!e||!e.visible) return false;
  if(!stand(sc,e)) return false; run(2); tick('ok'); run(4); return true; }
use('nelsdoor'); until(()=>top().box.choices,'ok',600); tick('ok'); run(6);
until(()=>!top().script.running,'ok',900);
ck('her door in the real world can be approached', PW.flag('tried_door'));
use('stairs'); until(()=>PW.state.room==='street',null,500);
ck('the street exists', PW.state.room==='street', PW.state.room);
use('dell_real'); until(()=>!top().script.running,'ok',1200);
ck('Dell can be met in the waking world', PW.flag('talked_dell_real'));
use('shop'); until(()=>top().box.choices,'ok',600); tick('ok'); run(6);
until(()=>!top().script.running,'ok',900);
ck('the shop scene plays', PW.flag('stood_at_shop'));

console.log('\n'+pass+'/'+(pass+fail)+' alternate-path checks passed'+(errors.length?', '+errors.length+' runtime errors':''));
if (errors.length) [...new Set(errors)].slice(0,8).forEach(e=>console.log('  '+e));
process.exit(fail||errors.length?1:0);
