"""Browser regression for prize hierarchy, readability and save-error recovery."""
from playwright.sync_api import sync_playwright
import json,os
item={'rarity':'common','title':'リピーター会イベント 200円OFF','message':'次回のUnityイベントで使える特典です。スタッフにお伝えください。','eventId':2026102803,'expiresAt':'2026/11/28'}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width in [320,390,1440]:
  page=b.new_page(viewport={'width':width,'height':900})
  page.route('**/api/event',lambda r:r.fulfill(content_type='application/json',body=json.dumps({'eventId':item['eventId']})))
  page.add_init_script('localStorage.setItem("unityDropLastResult",'+json.dumps(json.dumps(item))+')')
  page.add_init_script('window.UNITY_DROP_OPTIONS={eventsUrl:"https://example.com/events",bookingUrl:"https://example.com/book",redemptionInstruction:"テスト：対象イベントの受付で保存画像を提示してください。"}')
  page.goto(os.environ.get('UNITY_DROP_TEST_URL','http://localhost:4173/'));page.wait_for_selector('#screen-already.is-active')
  assert page.locator('#already-title').inner_text()=='200円OFF'
  assert '受付' in page.locator('#already-usage').inner_text()
  assert page.locator('#already-usage').is_visible()
  assert page.locator('#already-subtitle').inner_text()=='リピーター会イベント'
  assert page.locator('#already-title').evaluate('(e)=>e.getBoundingClientRect().height<parseFloat(getComputedStyle(e).lineHeight)*1.2')
  assert page.locator('#already-expiration').evaluate('(e)=>parseFloat(getComputedStyle(e).fontSize)>=14')
  assert page.locator('#already-message').evaluate('(e)=>parseFloat(getComputedStyle(e).fontSize)>=15')
  assert page.locator('#screen-already [data-event-link="events"]').get_attribute('href')=='https://example.com/events'
  assert page.locator('#screen-already [data-event-link="booking"]').is_visible()
  ratios=page.evaluate("""()=>{
   const lum=rgb=>{const c=rgb.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return .2126*c[0]+.7152*c[1]+.0722*c[2]};
   return ['already-message','already-expiration','already-rarity-label'].map(id=>{
    const e=document.getElementById(id);const parse=s=>s.match(/[0-9.]+/g).slice(0,3).map(Number);
    const a=lum(parse(getComputedStyle(e).color)),b=lum(parse(getComputedStyle(e.closest('.result-card')).backgroundColor));
    return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
   });
  }""")
  assert min(ratios)>=4.5,ratios
  print('Measured contrast ratios:',[round(x,2) for x in ratios])
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.evaluate('()=>{HTMLCanvasElement.prototype.toDataURL=()=>{throw new Error("test canvas export failure")}}')
  page.click('#btn-save-already')
  page.wait_for_function('document.querySelector("#already-save-status").textContent.includes("スクリーンショット")')
  assert page.locator('#btn-save-already').is_enabled()
  print(width,'hierarchy, readable text, save-error guidance: PASS')
  page.screenshot(path=f'/tmp/unity-result-ux-{width}.png',full_page=True)
  page.close()
 b.close()
