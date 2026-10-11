from playwright.sync_api import sync_playwright
from PIL import Image
import json, os, tempfile
item={'rarity':'common','title':'リピーター会イベント 200円OFF','message':'次回のUnityイベントで使える特典です。スタッフにお伝えください。','eventId':2026101103,'drawRequestId':'test-request','expiresAt':'2026/11/11'}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':390,'height':844},accept_downloads=True)
 page.route('**/api/event',lambda r:r.fulfill(content_type='application/json',body=json.dumps({'eventId':item['eventId']})))
 page.add_init_script('localStorage.setItem("unityDropLastResult",'+json.dumps(json.dumps(item,ensure_ascii=False))+')')
 page.goto(os.environ.get('UNITY_DROP_TEST_URL', 'http://localhost:4173/'));page.wait_for_selector('#screen-already.is-active')
 assert page.locator('#btn-save-already').count()==1,'Saved results need an image-save button'
 with page.expect_download() as download:page.click('#btn-save-already')
 path=os.path.join(tempfile.gettempdir(), 'unity-drop-saved.png');download.value.save_as(path)
 im=Image.open(path);assert im.format=='PNG' and im.size==(1080,1350)
 assert download.value.suggested_filename.endswith('.png')
 print('Cached-result PNG download: PASS',im.size)
 # Exercise a fresh draw and the actual result-screen rendering path.
 page=b.new_page(viewport={'width':390,'height':844},accept_downloads=True)
 def api(route):
  path=route.request.url.split('/api/')[-1]
  payload={'eventId':item['eventId']} if path=='event' else {'token':'mock.token'} if path=='session' else {'rarity':item['rarity'],'event_id':item['eventId'],'request_id':item['drawRequestId'],'drawn_at':'2026-10-11T00:00:00Z'}
  route.fulfill(content_type='application/json',body=json.dumps(payload))
 page.route('**/api/*',api)
 page.goto(os.environ.get('UNITY_DROP_TEST_URL', 'http://localhost:4173/'))
 page.click('#btn-open');page.wait_for_selector('#screen-ready.is-active')
 page.click('#btn-receive');page.wait_for_selector('#screen-opening.is-active');page.click('#btn-skip')
 page.wait_for_selector('#screen-result.is-active')
 with page.expect_download() as download:page.click('#btn-save-image')
 download.value.save_as(os.path.join(tempfile.gettempdir(), 'unity-drop-saved-result.png'))
 assert Image.open(os.path.join(tempfile.gettempdir(), 'unity-drop-saved-result.png')).size==(1080,1350)
 print('Fresh-draw result-screen PNG download: PASS')
 b.close()
