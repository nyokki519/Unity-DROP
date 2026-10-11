const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const tierSources = {common:'secret.mp4',rare:'rare.mp4',secret:'common.mp4'};
const sharedSources = Array.from({length:5},(_,i)=>`effects/effect-0${i+1}.mp4`);
(async () => {
 for (const rarity of ['common','rare','secret']) for (let index=0;index<6;index++) {
  const elements = new Map(); const played=[]; const storage=new Map();
  function element(id) {
   if (!elements.has(id)) elements.set(id,{classList:{toggle(){}},dataset:{},handlers:{},addEventListener(name,fn){this.handlers[name]=fn},removeEventListener(){},pause(){},load(){},removeAttribute(){},play(){played.push(this.src);queueMicrotask(()=>this.handlers.ended());return Promise.resolve()}});
   return elements.get(id);
  }
  const math=Object.create(Math);math.random=()=>(index+0.5)/6;
  const context={navigator:{userAgent:"test"},Math:math,console,setTimeout,clearTimeout,queueMicrotask,Date,Promise,crypto:{randomUUID:()=> 'request-uuid'},window:{UNITY_DROP_API_URL:'http://mock'},document:{readyState:'complete',getElementById:element,body:{classList:{toggle(){}}}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},fetch:async url=>({ok:true,json:async()=>url.endsWith('/event')?{eventId:1}:url.endsWith('/session')?{token:'token'}:{rarity,event_id:1,request_id:'request-uuid',drawn_at:'now'}})};
  vm.runInNewContext(fs.readFileSync('script.js','utf8'),context);
  await new Promise(r=>setImmediate(r));
  element('btn-open').handlers.click({currentTarget:element('btn-open')});
  await new Promise(r=>setImmediate(r));
  await element('btn-receive').handlers.click();
  assert.equal(played[0],`assets/videos/${[tierSources[rarity],...sharedSources][index]}`,`${rarity}: random slot ${index}`);
  assert.equal(JSON.parse(storage.get('unityDropLastResult')).rarity,rarity);
  assert.equal(element('result-rarity-label').dataset.rarity,rarity);
 }
 console.log('18 presentation cases: tier-specific original and 5 shared videos preserve server rarity — OK');
})().catch(e=>{console.error(e);process.exitCode=1});
