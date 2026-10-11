"""Validate iOS file-share integration using a stub for the native OS sheet."""
from playwright.sync_api import sync_playwright
import json, os
item={'rarity':'common','title':'200円OFF','message':'次回イベントで使える特典です。','eventId':2026101103,'expiresAt':'2026/11/11'}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for mode in ['success','cancel','failure','unsupported']:
  page=b.new_page(viewport={'width':390,'height':844},accept_downloads=True)
  page.route('**/api/event',lambda r:r.fulfill(content_type='application/json',body=json.dumps({'eventId':item['eventId']})))
  page.add_init_script('localStorage.setItem("unityDropLastResult",'+json.dumps(json.dumps(item))+')')
  page.add_init_script('''(mode=>{
   Object.defineProperty(navigator,'userAgent',{value:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'});
   window.nativeCalls=[];
   Object.defineProperty(navigator,'canShare',{value:data=>mode!=='unsupported'&&data.files[0] instanceof File&&data.files[0].type==='image/png'});
   Object.defineProperty(navigator,'share',{value:async data=>{
    const file=data.files[0];
    window.nativeCalls.push({name:file.name,type:file.type,size:file.size,active:navigator.userActivation.isActive});
    if(mode==='cancel')throw new DOMException('cancelled','AbortError');
    if(mode==='failure')throw new DOMException('blocked','NotAllowedError');
    window.signature=Array.from(new Uint8Array(await file.arrayBuffer()).slice(0,8));
   }});
  })('''+json.dumps(mode)+')')
  downloads=[];page.on('download',lambda d:downloads.append(d))
  page.goto(os.environ.get('UNITY_DROP_TEST_URL','http://localhost:4173/'))
  page.wait_for_selector('#screen-already.is-active');page.click('#btn-save-already')
  if mode=='success':
   page.wait_for_function('window.signature !== undefined',timeout=3000)
   assert page.evaluate('window.signature')==[137,80,78,71,13,10,26,10]
   calls=page.evaluate('window.nativeCalls');assert calls[0]['active'] and calls[0]['size']>1000 and calls[0]['type']=='image/png'
   assert not downloads
  elif mode=='cancel':
   page.wait_for_function('window.nativeCalls.length===1');page.wait_for_timeout(200);assert not downloads
  else:
   page.wait_for_timeout(500);assert len(downloads)==1
  print(mode,'iOS native-share integration: PASS')
  page.close()
 b.close()
