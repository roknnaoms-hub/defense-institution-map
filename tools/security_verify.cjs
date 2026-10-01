// Local-only security regression checks. No requests reach external services.
const {chromium}=require('playwright');
const http=require('http'), fs=require('fs'), path=require('path'), assert=require('assert/strict');
const html=fs.readFileSync(path.resolve(__dirname,'../index.html'));
const hits=[];
const server=http.createServer((req,res)=>{
 hits.push(req.url);
 if(req.url.startsWith('/blocked')){res.setHeader('Content-Type','application/javascript');res.end('window.injected=true');return;}
 res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
  await page.addInitScript(()=>{
   window.violations=[];
   addEventListener('securitypolicyviolation',e=>window.violations.push(e.effectiveDirective));
   Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.copied=text;}}});
  });
  await page.goto(origin+'/?private_query=do-not-share');
  await page.evaluate(()=>document.fonts.ready);await page.click('[data-view="map"]');
  assert.equal(await page.locator('.card').count(),9);
  assert.deepEqual(await page.evaluate(()=>window.violations),[]);
  assert.equal(hits.length,1,'No automatic network resources');
  const urls=await page.evaluate(()=>[
   'javascript:alert(1)','data:text/html,hello','http://www.law.go.kr/',
   'https://www.law.go.kr.evil.example/','https://evil.example@www.law.go.kr/',
   'https://www.law.go.kr:444/','https://www.law.go.kr/\n', '//www.law.go.kr/'
  ].map(safeHref));
  assert.ok(urls.every(x=>x==='#'),'Reject unsafe URLs');
  assert.equal(await page.evaluate(()=>safeHref('https://www.law.go.kr/LSW/lsInfoP.do?lsId=010107')),'https://www.law.go.kr/LSW/lsInfoP.do?lsId=010107');
  await page.fill('#query','<img src=x onerror=alert(1)>');
  assert.equal(await page.locator('#content img').count(),0);
  await page.click('#reset');
  await page.evaluate(()=>{location.hash='%E0%A4%A';});
  await page.waitForTimeout(100);
  assert.deepEqual(errors,[],'Malformed hash must not throw');
  await page.evaluate(()=>copyLink('D01'));
  assert.ok(!(await page.evaluate(()=>window.copied)).includes('private_query'),'Share URL excludes query');
  const downloadPromise=page.waitForEvent('download');
  await page.evaluate(()=>{ITEMS[0].title='=1+1';});
  await page.click('#exportCsv');const download=await downloadPromise;
  const csv=fs.readFileSync(await download.path(),'utf8');
  assert.ok(csv.includes('"\'=1+1"'),'CSV formula must be neutralized');
  const cells=await page.evaluate(()=>['=1+1',' +1','-2','@SUM(A1)','\tcmd','\rtest','normal','a"b'].map(csvCell));
  assert.ok(cells.slice(0,6).every(x=>x.startsWith('"\'')));
  assert.equal(cells[6],'"normal"');assert.equal(cells[7],'"a""b"');
  await page.evaluate(()=>{localStorage.setItem('defense-atlas-favs-v1','x'.repeat(5000));});
  await page.reload();await page.click('[data-view="map"]');assert.equal(await page.locator('.card').count(),9);
  await page.evaluate(()=>{
   ITEMS[0].title='<img src=x onerror="window.injected=true">';
   ITEMS[0].scope='<svg onload="window.injected=true">';
   ITEMS[0].sources[0].officialUrl='javascript:window.injected=true';
   render();openDetail('D01','legal');
  });
  assert.equal(await page.locator('#content img,#content svg').count(),0,'Data must render as text');
  assert.equal(await page.locator('#detailContent a[href^="javascript:"]').count(),0);
  await page.click('#closeDetail');
  const requestCount=hits.length;
  const blocked=await page.evaluate(async(origin)=>{
   const script=document.createElement('script');script.textContent='window.injected=true';document.body.append(script);
   const external=document.createElement('script');external.src=origin+'/blocked-script';document.body.append(external);
   const b=document.createElement('button');b.setAttribute('onclick','window.injected=true');document.body.append(b);b.click();
   const img=document.createElement('img');img.src=origin+'/blocked-image';document.body.append(img);
   const frame=document.createElement('iframe');frame.src=origin+'/blocked-frame';document.body.append(frame);
   const form=document.createElement('form');form.action=origin+'/blocked-form';form.method='post';document.body.append(form);form.submit();
   const base=document.createElement('base');base.href='https://evil.example/';document.head.append(base);
   try{await fetch(origin+'/blocked-fetch');return false;}catch(e){return true;}
  },origin);
  assert.equal(blocked,true,'CSP blocks network fetch');
  await page.waitForFunction(()=>['connect-src','script-src-elem','script-src-attr','img-src','frame-src','form-action','base-uri'].every(x=>window.violations.includes(x)));
  assert.equal(await page.evaluate(()=>window.injected),undefined,'Injected scripts must not execute');
  assert.equal(hits.length,requestCount,'CSP must block requests before they reach local server');
  assert.deepEqual(errors,[]);
  console.log('PASS: no automatic network; CSP blocks script/handler/fetch/image/frame/form/base; URL allowlist; HTML escaping; CSV formula protection; malformed hash; corrupt storage; share URL privacy.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
