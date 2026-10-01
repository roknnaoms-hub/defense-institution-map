// Local feature/security checks for ontology v2. No external network access.
const {chromium}=require('playwright');
const path=require('path'),fs=require('fs'),assert=require('assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[],requests=[],violations=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
  await page.exposeFunction('recordViolation',s=>violations.push(s));await page.addInitScript(()=>addEventListener('securitypolicyviolation',e=>window.recordViolation(e.effectiveDirective)));
  const url='file://'+path.resolve(__dirname,'../index.html');await page.goto(url);await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('.kg-node').count(),11,'AI core graph');
  const nodes=await page.evaluate(()=>KG.nodes.length),edges=await page.evaluate(()=>KG.edges.length);assert.equal(nodes,270);assert.equal(edges,523);
  await page.locator('[data-kg-node="program-rapid"]').click();assert.ok((await page.locator('#kgSide').innerText()).includes('신속시범사업'));
  const before=await page.locator('#kgSvg').getAttribute('viewBox');await page.click('#kgZoomIn');assert.notEqual(await page.locator('#kgSvg').getAttribute('viewBox'),before);await page.click('#kgFit');assert.equal(await page.locator('#kgSvg').getAttribute('viewBox'),before);
  await page.locator('#kgSide [data-kg-focus]').click();assert.ok(await page.locator('[data-kg-node="rapid-proposal"]').count());
  await page.selectOption('#kgLevel','source');assert.equal(await page.locator('.kg-edge.model').count(),0);assert.ok(await page.locator('.kg-edge.source').count()>0);
  await page.click('#kgDepth');assert.ok((await page.locator('.project-notice').innerText()).includes('2단계'));
  await page.click('#kgReset');await page.selectOption('#kgScope','all');assert.equal(await page.locator('.kg-node').count(),60);await page.click('#kgNext');assert.ok((await page.locator('.kg-bar').last().innerText()).includes('2 / 5'));
  await page.fill('#kgQuery','형상');assert.ok(await page.locator('.kg-node').count()>0);await page.fill('#kgQuery','no-such-entity');assert.equal(await page.locator('.kg-node').count(),0);await page.click('#kgReset');
  await page.locator('[data-kg-node="program-ax"]').focus();await page.keyboard.press('Enter');assert.ok((await page.locator('#kgSide').innerText()).includes('AX-Sprint'));
  await page.screenshot({path:path.resolve(__dirname,'../../ontology-desktop.png'),fullPage:true});
  await page.click('[data-view="ai"]');assert.equal(await page.locator('.ai-program').count(),5);assert.equal(await page.locator('.ai-route li').count(),8);await page.selectOption('#aiRoute','rapid-official');assert.equal(await page.locator('.ai-route li').count(),5);assert.ok((await page.locator('.ai-section').first().innerText()).includes('별도 판단'));
  await page.screenshot({path:path.resolve(__dirname,'../../ontology-ai.png'),fullPage:true});
  await page.click('[data-view="schema"]');assert.equal(await page.locator('.schema-grid .panel').count(),8);
  let dl=page.waitForEvent('download');await page.click('[data-kg-export="jsonld"]');let d=await dl;const ld=JSON.parse(fs.readFileSync(await d.path(),'utf8'));assert.ok(ld['@context'].prov);assert.equal(ld['@graph'].filter(n=>n['@type']==='rdf:Statement').length,523);assert.equal(ld['@graph'].filter(n=>n['@type']==='owl:Class').length,8);assert.ok(ld['@graph'].find(n=>n['@id']==='dm:responsible')['rdfs:domain']['owl:unionOf']['@list']);
  await page.click('[data-view="projects"]');await page.fill('[name="title"]','테스트 AI <img src=x onerror=alert(1)>');await page.fill('[name="owner"]','검토 담당');await page.fill('[name="notes"]','공개 자료 검토\n<script>window.injected=true</script>');await page.check('[name="checks"][value="control-quality"]');await page.click('#projectForm [type="submit"]');assert.equal(await page.locator('.project-record').count(),1);assert.equal(await page.locator('.project-record img,.project-record script').count(),0);
  const recordId=await page.evaluate(()=>projects[0].id);await page.reload();await page.click('[data-view="projects"]');assert.equal(await page.locator('.project-record').count(),1);
  await page.click('[data-project-edit]');await page.selectOption('[name="stage"]','ai-test');await page.selectOption('[name="status"]','수행');await page.click('#projectForm [type="submit"]');assert.ok((await page.locator('.project-record').innerText()).includes('시험·신뢰성'));
  await page.click('.project-record [data-kg-focus]');assert.ok(await page.locator(`[data-kg-node="${recordId}"]`).count());assert.ok(await page.locator('[data-kg-node="ai-test"]').count());assert.equal(await page.locator('.kg-edge.user').count(),2);
  await page.click('[data-view="projects"]');dl=page.waitForEvent('download');await page.click('#projectBackup');d=await dl;const backup=fs.readFileSync(await d.path(),'utf8');assert.equal(JSON.parse(backup).projects.length,1);
  await page.setInputFiles('#projectRestore',{name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"schema":"defense-projects-v2","projects":[{"id":"__proto__"}]}')});await page.waitForFunction(()=>document.getElementById('toast').textContent.includes('복원 실패'));assert.equal(await page.locator('.project-record').count(),1);
  await page.setInputFiles('#projectRestore',{name:'duplicate.json',mimeType:'application/json',buffer:Buffer.from(backup)});await page.waitForFunction(()=>document.getElementById('toast').textContent.includes('중복'));assert.equal(await page.locator('.project-record').count(),1);
  page.once('dialog',d=>d.accept());await page.click('[data-project-delete]');assert.equal(await page.locator('.project-record').count(),0);await page.setInputFiles('#projectRestore',{name:'restore.json',mimeType:'application/json',buffer:Buffer.from(backup)});await page.waitForSelector('.project-record');assert.equal(await page.locator('.project-record').count(),1);
  await page.setViewportSize({width:390,height:844});for(const view of ['graph','ai','projects','schema']){await page.click(`[data-view="${view}"]`);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),view+' mobile width');}
  await page.click('[data-view="graph"]');await page.click('#kgReset');await page.screenshot({path:path.resolve(__dirname,'../../ontology-mobile.png'),fullPage:true});
  await page.click('[data-view="map"]');await page.locator('[data-open="D01"]').first().click();await page.click('#detailActions [data-kg-focus]');await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>location.hash),'#kg-inst-D01','Modal to graph preserves node URL');
  await page.goto(url+'#kg-rule-ai');assert.ok((await page.locator('#kgSide').innerText()).includes('국방데이터·인공지능업무 훈령'));
  await page.evaluate(()=>{localStorage.setItem(PROJECT_KEY,'{"invalid":true}');});await page.reload();await page.click('[data-view="projects"]');assert.ok((await page.locator('#content').innerText()).includes('읽지 못했습니다'));
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);assert.deepEqual(violations,[]);
  console.log('PASS: 270 nodes / 523 edges; AI graph/filter/pagination/zoom/keyboard/deep link; 5 programs / 8 proposed and 5 official stages; JSON-LD schema + provenance; local CRUD/persistence/backup/restore; invalid and duplicate import preserved; XSS escaping; mobile views; no external requests or CSP violations.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
