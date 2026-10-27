import {validateEventConfig,currentJstEventId} from './config.js';
const json=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store'}});
const tiers=['secret','rare','common'];
export class DropSettings {
 constructor(ctx,env){this.ctx=ctx;this.env=env;}
 pool(config){return this.env.EVENT_POOLS.get(this.env.EVENT_POOLS.idFromName(String(config.eventId)));}
 async base(){
  const state=await this.ctx.storage.get('settings');
  if(state)return state;
  const response=await fetch(this.env.CONFIG_URL,{cf:{cacheTtl:15,cacheEverything:true},signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error('config_unavailable');
  return {revision:0,config:validateEventConfig(await response.json())};
 }
 current(config){return {...config,eventId:currentJstEventId()*100+config.poolRevision};}
 async recover(){
  const pending=await this.ctx.storage.get('pending');if(!pending)return null;
  const response=await this.pool(pending.config).fetch('https://pool.internal/configure',{method:'POST',body:JSON.stringify({config:pending.config,operationId:pending.operationId})});
  if(response.status===409){await this.ctx.storage.put('pending',null);return response;}
  if(!response.ok)throw Error('settings_apply_unknown');
  // Journal + idempotent day-pool operation recover crashes between the two stores.
  await this.ctx.storage.put({settings:{revision:pending.revision,config:pending.config},pending:null});
  return null;
 }
 async state(){
  const state=await this.base(),config=this.current(state.config);
  const r=await this.pool(config).fetch('https://pool.internal/status',{method:'POST',body:JSON.stringify({config})});
  if(!r.ok)throw Error('settings_unavailable');
  return {revision:state.revision,eventId:config.eventId,day:String(Math.floor(config.eventId/100)),current:await r.json(),defaults:{totalDraws:state.config.totalDraws,inventory:state.config.inventory}};
 }
 async fetch(request){
  return this.ctx.blockConcurrencyWhile(async()=>{
   await this.recover();
   const path=new URL(request.url).pathname;
   if(path==='/state')return json(await this.state());
   const state=await this.base(),config=this.current(state.config),body=await request.json();
   if(path==='/draw')return this.pool(config).fetch('https://pool.internal/draw',{method:'POST',body:JSON.stringify({...body,config})});
   if(path!=='/update')return json({error:'not_found'},404);
   if(!body||Object.keys(body).some(k=>!['revision','eventId','totalDraws','rare','secret'].includes(k))||!Number.isSafeInteger(body.revision)||body.revision<0||!Number.isSafeInteger(body.eventId)||![body.totalDraws,body.rare,body.secret].every(Number.isSafeInteger)||body.totalDraws<1||body.totalDraws>100000||body.rare<0||body.secret<0||body.rare+body.secret>body.totalDraws)return json({error:'invalid_counts'},400);
   if(body.eventId!==config.eventId)return json({error:'event_changed'},409);
   if(body.revision!==state.revision)return json({error:'settings_conflict'},409);
   const next=validateEventConfig({...config,totalDraws:body.totalDraws,inventory:{rare:body.rare,secret:body.secret,common:body.totalDraws-body.rare-body.secret}});
   await this.ctx.storage.put('pending',{operationId:crypto.randomUUID(),revision:state.revision+1,config:next});
   const rejected=await this.recover();if(rejected)return rejected;
   return json(await this.state());
  });
 }
}
