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

/* --- writing the save out to a file ---------------------------------------
 *
 * The slots write when the story says so. A file writes when the player says
 * so, which is the only save that happens anywhere. What comes out has to be
 * the slot blob and nothing else: no wrapper, no format of its own, so every
 * rule above holds for it unchanged and an old build could read it.
 */
PW.save.reset();
PW.state.chapter=4; PW.state.room='attic'; PW.party.add('hal'); PW.items.give('crane');
PW.flag('carried_out', true);
const exported = PW.save.text();
ck('what is written out is the save blob itself',
   JSON.stringify(JSON.parse(exported).flags)===JSON.stringify(PW.state.flags) &&
   JSON.parse(exported).room==='attic');
ck('and nothing in it that a template does not declare',
   Object.keys(JSON.parse(exported)).every(k=>TEMPLATE.indexOf(k)>=0||k==='savedAt'),
   Object.keys(JSON.parse(exported)).filter(k=>TEMPLATE.indexOf(k)<0&&k!=='savedAt').join(', '));
ck('the filename says which run it is', /^paperweight-ch4-\d+min-\d{8}-\d{4}\.json$/
   .test(PW.save.filename()), PW.save.filename());

const before = H.downloads.length;
const name = PW.save.toFile();
const dl = H.downloads[H.downloads.length-1];
ck('it reaches the browser as a download', !!name && H.downloads.length===before+1 &&
   dl.name===name, name+' / '+(dl&&dl.name));
ck('and the download carries the save', !!dl &&
   decodeURIComponent(dl.href.replace(/^data:[^,]*,/,'')).indexOf('"room":"attic"')>0);

// Reading one back in, from a fresh start, is the whole point.
PW.save.reset();
ck('a file read back in is the run it came from', PW.save.adopt(exported) &&
   PW.state.chapter===4 && PW.state.room==='attic' &&
   PW.party.has('hal') && PW.items.has('crane') && PW.flag('carried_out'));

// It back-fills exactly like a slot does, so an old file is not a dead end.
PW.save.reset();
ck('an old file back-fills like a slot', PW.save.adopt(JSON.stringify(older)) &&
   PW.state.chapter===5 && PW.state.pocket && PW.state.keptMax===5,
   JSON.stringify(PW.state.pocket));

// ...and anything that is not a save is refused rather than half-loaded.
PW.save.reset();
const kept = PW.state.chapter;
ck('nonsense is refused', !PW.save.adopt('this is not a save') &&
   !PW.save.adopt('{"version":1}') &&
   !PW.save.adopt(JSON.stringify({version:1, party:['june'], actors:{}, room:'nowhere'})) &&
   PW.state.chapter===kept);

// A file dropped on the window waits until a screen asks for it, and is only
// handed over once.
PW.save.drop('x.json', exported);
const got = PW.save.waiting() && PW.save.dropped();
ck('a dropped file waits to be picked up', got && got.name==='x.json' &&
   PW.save.dropped()===null && !PW.save.waiting());

/* ...and dropping one while walking about opens the pouch to ask, rather than
   swallowing the file and looking broken. */
PW.save.reset();
PW.game.start(new PW.FieldScene('hub','start'));
until(()=>top().name==='field'&&!top().script.running,'ok',600);
PW.save.drop('walked.json', exported);
run(3);
ck('a file dropped mid-game opens the pouch and asks', top().name==='pocket' &&
   !!top().confirm && /walked\.json/.test(top().confirm.text),
   top().name+': '+(top().confirm&&top().confirm.text));
top().confirm.action(); run(4);
until(()=>top().name==='field'&&!PW.game.busy(),null,400);
ck('and saying yes puts her where the file left off',
   PW.state.room==='attic' && PW.state.chapter===4, PW.state.room+' ch'+PW.state.chapter);

/* The title screen offers it whether or not there is a slot to load — a file
   is the way back in precisely when the browser has thrown the slots away. */
PW.save.reset();
PW.game.start(new PW.TitleScene());
run(2);
ck('the title screen offers a file with no saves at all',
   top().opts.indexOf('from a file')>=0, top().opts.join(', '));

/* The pouch's fourth tab is the save you make yourself. Walk to it, write one
   out, and check the room came from a real run rather than a fresh state. */
PW.save.reset();
PW.state.chapter=2; PW.items.give('jam');
PW.game.start(new PW.FieldScene('kitchen','start'));
until(()=>top().name==='field'&&!top().script.running,'ok',600);
/* X and C are one key. Out in a room there is nothing to go back to, so back
   is what opens the pouch — which is what makes a two-finger tap worth having,
   since out here it was the one gesture that did nothing at all. */
tick('back'); run(2);
ck('back opens the pouch out in a room', top().name==='pocket', top().name);
tick('back'); run(2);
ck('and back again closes it', top().name==='field', top().name);
tick('back'); run(2);
ck('the pouch has a save tab', top().name==='pocket' &&
   PW.PocketScene.TABS[3]==='save', PW.PocketScene.TABS.join(', '));
const saveTab = top();
saveTab.tab=3; saveTab.idx=0; run(2); tick('ok'); run(2);
ck('writing out from the pouch says what it wrote',
   /^Written out as paperweight-ch2-/.test(saveTab.note), saveTab.note);
ck('and it remembers the last one for the panel', !!saveTab.wrote, saveTab.wrote);
saveTab.idx=1; run(2); tick('ok'); run(2);
ck('reading one in asks first, and defaults to no',
   !!saveTab.confirm && saveTab.confirm.idx===1, saveTab.confirm && saveTab.confirm.text);
tick('back'); run(2);
ck('and backing out of that changes nothing', !saveTab.confirm && PW.state.chapter===2);

/* --- reaching into a pocket with nothing in front of you ------------------
 *
 * Moods, buffs and binding only mean anything in a fight, so out here an item
 * counts only if it mends, gives breath back, or gets somebody up. The menu
 * must also refuse to spend one on a party that does not need it, and must
 * never quietly eat a memory — a kept thing leaves the pouch only by being put
 * down on purpose, which is what the ending counts.
 */
function withParty(){
  PW.save.reset();
  ['wick','dell'].forEach(x=>PW.party.add(x));
  PW.game.start(new PW.FieldScene('hub','start'));
  until(()=>top().name==='field'&&!top().script.running,'ok',600);
}
const rec = id => PW.party.rec(id), maxOf = id => PW.party.stats(id);

withParty();
ck('supplies that mend can be used outside a fight',
   ['jam','sweet','plaster','sock','crane','pencil'].every(i=>PW.items.usableOutside(i)));
ck('things that only matter in a fight cannot',
   ['thimble','marble','thread','musicbox','key','paperweight']
     .every(i=>!PW.items.usableOutside(i)));

PW.items.give('jam',2);
rec('june').hp = 5;
let pk = new PW.PocketScene(); PW.game.push(pk); run(4);
pk.tab = 1; pk.idx = 0; pk.activate();
ck('a jar of jam mends someone out in the world',
   rec('june').hp === Math.min(maxOf('june').maxhp, 65) && PW.items.count('jam') === 1,
   'hp='+rec('june').hp+' x'+PW.items.count('jam'));
pk.activate();
ck('and will not be spent on nobody', PW.items.count('jam') === 1, pk.note);
PW.game.pop();

withParty();
PW.items.give('jam');
rec('june').hp = 10; rec('wick').hp = 10;
pk = new PW.PocketScene(); PW.game.push(pk); run(4);
pk.tab = 1; pk.idx = 0; pk.activate();
ck('two hurt friends means it asks who', !!pk.pick && pk.pick.who.length === 2,
   pk.pick ? pk.pick.who.join(',') : 'no picker');
run(3);                              // the picker draws without throwing
pk.apply(pk.pick.id, [pk.pick.who[1]]); pk.pick = null;
ck('and it goes to the one chosen',
   rec('wick').hp === Math.min(maxOf('wick').maxhp, 70) && rec('june').hp === 10,
   'june='+rec('june').hp+' wick='+rec('wick').hp);
PW.game.pop();

withParty();
PW.items.give('pencil');
rec('dell').hp = 0;
pk = new PW.PocketScene(); PW.game.push(pk); run(4);
pk.tab = 1; pk.idx = Object.keys(PW.items.pocket()).indexOf('pencil'); pk.activate();
ck('a pencil stub gets the fallen up without a fight',
   rec('dell').hp === Math.round(maxOf('dell').maxhp * 0.5), 'hp='+rec('dell').hp);
PW.game.pop();

withParty();
PW.items.give('violet');
PW.state.party.forEach(id => { rec(id).hp = 20; });
ck('a memory that mends the party mends all of it',
   (PW.items.useOutside('violet', PW.items.wouldHelp('violet')) || []).length === 3 &&
   PW.state.party.every(id => rec(id).hp === Math.min(maxOf(id).maxhp, 55)),
   PW.state.party.map(id=>rec(id).hp).join(','));
ck('using a memory does not destroy it', PW.items.has('violet'), JSON.stringify(PW.state.kept));
PW.game.push(new PW.BattleScene('hub_a',{}));
{ const bt = top(); bt.doItem(bt.party[0], PW.items.get('violet'), 'violet', bt.party[0]); }
ck('nor does using one in a fight', PW.items.has('violet'), JSON.stringify(PW.state.kept));
PW.game.pop();

pk = new PW.PocketScene(); PW.game.push(pk); run(4);
PW.state.party.forEach(id => { rec(id).hp = 20; });
pk.tab = 2; pk.idx = PW.state.kept.indexOf('violet'); pk.activate();
ck('a usable memory offers both decisions', !!pk.confirm && pk.confirm.labels[0] === 'use it',
   pk.confirm ? pk.confirm.labels.join('/') : 'none');
pk.confirm.alt();
ck('putting one down still warns it is permanent',
   /You will not get it back/.test(pk.confirm.text), pk.confirm.text);
pk.confirm.action();
ck('and putting it down is what the ending counts',
   !PW.items.has('violet') && PW.counter('put_down') === 1);
PW.game.pop();

/* --- awake, she walks alone ----------------------------------------------
 *
 * Wick is a lamp with moth wings and has no business on Wren Street. Rooms
 * June is awake in carry `waking: true` and draw no follow-trail; a script can
 * still stage anyone deliberately, which is the only way somebody from the
 * dream should ever turn up in the waking world.
 */
function walkersIn(room, spawn){
  PW.game.start(new PW.FieldScene(room, spawn));
  until(()=>top().name==='field'&&!top().script.running,'ok',600);
  const sc = top(), drawn = [], real = sc.drawWalker;
  sc.drawWalker = function (ctx, id) { drawn.push(id); };
  run(1);
  sc.drawWalker = real;
  return drawn;
}
PW.save.reset();
['wick','dell','hal'].forEach(x=>PW.party.add(x));
PW.flag('tutorial_done',true); PW.flag('ch_interlude',true); PW.flag('can_sleep',true);
PW.state.chapter = 4;
[['bedroom','start'],['landing','frombedroom'],['street','fromhouse']].forEach(([r,s])=>{
  const w = walkersIn(r,s);
  ck('nobody follows her awake in '+r, w.length===1 && w[0]==='june', w.join(', ')||'nobody');
});
[['hub','start'],['kitchen','start']].forEach(([r,s])=>{
  const w = walkersIn(r,s);
  ck('the party is still there dreaming in '+r, w.length===4, w.join(', '));
});

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
