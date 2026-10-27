import assert from 'node:assert/strict';
import {mock} from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import worker,{EventPool,DropSettings,currentJstEventId} from '../src/index.js';
const source={eventId:20261004,poolRevision:3,totalDraws:3,inventory:{secret:0,rare:0,common:3}};
const previousFetch=globalThis.fetch;globalThis.fetch=async()=>Response.json(source);
const pools=new Map();
const namespace={idFromName:x=>x,get(id){if(!pools.has(id)){
 const db=new DatabaseSync(':memory:');
 const ctx={storage:{sql:{exec(sql,...params){return db.prepare(sql).all(...params);}},transactionSync(fn){db.exec('BEGIN');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}},blockConcurrencyWhile(fn){return fn();}};
 pools.set(id,new EventPool(ctx));
}return {fetch:(input,init)=>pools.get(id).fetch(new Request(input,init))};}};
const data=new Map();let queue=Promise.resolve(),failFinalize=false;
const ctx={storage:{async get(k){return structuredClone(data.get(k));},async put(k,v){if(typeof k==='object'){if(failFinalize){failFinalize=false;throw Error('simulated interrupted commit');}for(const [key,value] of Object.entries(k))data.set(key,structuredClone(value));}else data.set(k,structuredClone(v));}},blockConcurrencyWhile(fn){const task=queue.then(fn);queue=task.catch(()=>{});return task;}};
const env={CONFIG_URL:'https://example.invalid/config',EVENT_POOLS:namespace};let coordinator=new DropSettings(ctx,env);
const call=async(path,body={})=>coordinator.fetch(new Request('https://settings.internal/'+path,{method:'POST',body:JSON.stringify(body)}));
const uuid=()=>crypto.randomUUID();const user=uuid();const firstRequest=uuid();
try{
 let r=await call('draw',{requestId:firstRequest,userId:user});assert.equal(r.status,200);assert.equal((await r.json()).rarity,'common');
 let state=await(await call('state')).json();assert.equal(state.current.drawn.total,1);assert.equal(state.current.remaining.total,2);
 r=await call('update',{eventId:state.eventId,revision:0,totalDraws:5,rare:1,secret:1});assert.equal(r.status,200);
 state=await r.json();assert.equal(state.revision,1);assert.equal(state.current.totalDraws,5);assert.equal(state.current.remaining.total,4);assert.equal(state.current.drawn.common,1);
 r=await call('draw',{requestId:uuid(),userId:user});assert.equal((await r.json()).replayed,true);assert.equal((await(await call('state')).json()).current.drawn.total,1);
 r=await call('update',{eventId:state.eventId,revision:1,totalDraws:2,rare:1,secret:1});assert.equal(r.status,409);assert.equal((await r.json()).error,'counts_below_drawn');
 assert.equal((await(await call('state')).json()).revision,1);
 assert.equal((await call('update',{eventId:state.eventId,revision:0,totalDraws:10,rare:0,secret:0})).status,409);
 assert.equal((await call('update',{eventId:state.eventId-100,revision:1,totalDraws:10,rare:0,secret:0})).status,409);
 // Failed global commit must recover from the journal without resetting or double-applying day inventory.
 failFinalize=true;
 await assert.rejects(()=>call('update',{eventId:state.eventId,revision:1,totalDraws:6,rare:2,secret:1}),/interrupted commit/);
 coordinator=new DropSettings(ctx,env);
 state=await(await call('state')).json();assert.equal(state.revision,2);assert.equal(state.current.totalDraws,6);assert.equal(state.current.drawn.total,1);assert.equal(state.current.remaining.total,5);assert.equal(data.get('pending'),null);
 const results=await Promise.all(Array.from({length:10},()=>call('draw',{requestId:uuid(),userId:uuid()})));
 assert.equal(results.filter(r=>r.status===200).length,5);assert.equal(results.filter(r=>r.status===409).length,5);
 state=await(await call('state')).json();assert.equal(state.current.remaining.total,0);assert.equal(state.current.drawn.total,6);
 assert.equal((await call('update',{eventId:state.eventId,revision:2,totalDraws:8,rare:2,secret:1})).status,200);
 state=await(await call('state')).json();assert.equal(state.current.remaining.total,2);
 env.DROP_SETTINGS={idFromName:x=>x,get:()=>({fetch:(input,init)=>coordinator.fetch(new Request(input,init))})};env.ALLOWED_ORIGINS='https://nyokki519.github.io';env.DROP_ADMIN_TOKEN='s'.repeat(40);
 assert.equal((await worker.fetch(new Request('https://api.invalid/api/admin/config'),env)).status,401);
 const admin=await worker.fetch(new Request('https://api.invalid/api/admin/config',{headers:{Authorization:'Bearer '+env.DROP_ADMIN_TOKEN}}),env);assert.equal(admin.status,200);
 const event=await worker.fetch(new Request('https://api.invalid/api/event',{method:'POST',headers:{Origin:'https://nyokki519.github.io'},body:'{}'}),env);const visible=await event.json();assert.equal(visible.configVersion,3);assert.equal(visible.totalDraws,8);assert.equal(Math.floor(visible.eventId/100),currentJstEventId());
 const beforeDay=state.eventId;
 mock.timers.enable({apis:['Date'],now:new Date(Date.now()+86400000)});
 const tomorrow=await(await call('state')).json();assert.notEqual(tomorrow.eventId,beforeDay);assert.equal(tomorrow.current.totalDraws,8);assert.equal(tomorrow.current.drawn.total,0);
 assert.equal((await call('update',{eventId:beforeDay,revision:tomorrow.revision,totalDraws:9,rare:2,secret:1})).status,409);
 assert.equal((await call('draw',{requestId:uuid(),userId:user})).status,200);mock.timers.reset();
 console.log('PASS immediate DROP: atomic inventory edits, below-drawn rejection, unique user preserved, journal crash recovery, concurrent exhaustion/refill, CAS/day checks, dedicated auth');
}finally{globalThis.fetch=previousFetch;}
