const {chromium}=require('playwright');
const path=require('path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1440,height:1100}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const network=[];page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url())});
 const cspViolations=[];await page.exposeFunction('recordCspViolation',directive=>cspViolations.push(directive));
 await page.addInitScript(()=>{addEventListener('securitypolicyviolation',e=>window.recordCspViolation(e.effectiveDirective));});
 const url='file://'+path.resolve(__dirname,'../index.html');
 const check=(v,msg)=>{if(!v)throw Error(msg)};
 await page.goto(url);await page.evaluate(()=>document.fonts.ready);await page.click('[data-view="map"]');check(await page.locator('.card').count()===9,'9 institutions');
 await page.selectOption('#owner','국방부');check(await page.locator('.card').count()===4,'MND direct 4');
 await page.selectOption('#owner','방위사업청');check(await page.locator('.card').count()===2,'DAPA direct 2');
 await page.selectOption('#owner','공동·연계');check(await page.locator('.card').count()===3,'related 3');
 await page.click('#reset');await page.fill('#query','국방전자조달');check(await page.locator('.card').count()===1,'search procurement');
 await page.fill('#query','not-a-real-institution');check(await page.locator('.card').count()===0,'empty search');
 await page.click('#reset');
 for(const id of ['D01','D02','D03','D04'])await page.click(`[data-compare="${id}"]`);
 check(await page.locator('input[data-compare]:checked').count()===3,'comparison limit');
 await page.click('[data-view="compare"]');check(await page.locator('.compare-table thead th').count()===4,'three comparison columns');
 await page.click('#clearCompare');await page.click('[data-view="map"]');
 await page.click('[data-fav="D01"]');await page.click('#favOnly');check(await page.locator('.card').count()===1,'favorites filter');
 await page.reload();await page.click('[data-view="map"]');check(await page.locator('[data-fav="D01"]').getAttribute('aria-pressed')==='true','favorites persistence');
 for(let k=1;k<=9;k++){
  const id='D'+String(k).padStart(2,'0');await page.locator(`[data-open="${id}"]`).first().click();
  for(const tab of ['flow','legal','checks','overview']){await page.click(`[data-detail-tab="${tab}"]`);check((await page.locator('#detailContent').innerText()).length>50,id+' '+tab);}
  await page.click('#closeDetail');
 }
 await page.locator('[data-open="D01"]').first().click();await page.click('[data-detail-tab="flow"]');await page.click('[data-node="P13"]');check((await page.locator('#nodeInfo').innerText()).includes('↩'),'quality rework loop');
 await page.screenshot({path:path.resolve(__dirname,'../../detail-preview.png'),fullPage:false});await page.click('#closeDetail');
 await page.click('[data-view="sources"]');check(await page.locator('.source-item').count()>8,'legal sources');await page.click('[data-view="map"]');
 const dl=page.waitForEvent('download');await page.click('#exportCsv');const d=await dl;check(d.suggestedFilename()==='defense-institutions.csv','CSV download');
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'desktop overflow');
 await page.screenshot({path:path.resolve(__dirname,'../../desktop-preview.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile overflow');
 await page.screenshot({path:path.resolve(__dirname,'../../mobile-preview.png'),fullPage:true});
 await page.locator('[data-open="D01"]').first().click();await page.click('[data-detail-tab="flow"]');await page.click('[data-node="P13"]');check(await page.evaluate(()=>document.getElementById('detail').scrollWidth<=document.getElementById('detail').clientWidth),'mobile detail overflow');
 await page.click('#closeDetail');await page.goto(url+'#defense-rnd-force-integration');check(await page.locator('#detail').evaluate(d=>d.open),'deep link');
 check(errors.length===0,'JS errors: '+errors.join(','));
 check(network.length===0,'Unexpected network requests');
 check(cspViolations.length===0,'Unexpected CSP violations: '+cspViolations.join(','));
 console.log('PASS: 9 records; 4/2/3 ownership filters; search; 3-item comparison limit; favorites persistence; all 36 detail tabs; rework loop; sources; CSV export; desktop/mobile overflow; deep link; zero runtime errors or network requests.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
