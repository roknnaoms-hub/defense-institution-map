// No fetch, remote libraries, analytics or paid API. All graph data is embedded.
const KG=JSON.parse($('ontologyData').textContent);
const TYPE=new Map(KG.types.map(t=>[t.id,t.label])), REL=new Map(KG.relations.map(r=>[r.id,r]));
const SOURCES=new Map(KG.sources.map(s=>[s.id,s]));
const LEVEL={source:'공식 근거 확인',original:'기존 원본',model:'관리모형·검토 제안',user:'내 입력'};
const ks={scope:'core',type:'all',level:'all',query:'',selected:'program-rapid',focus:'',depth:1,page:0,route:'ai-management',edit:''};
const PROJECT_KEY='defense-ontology-projects-v2', STATUS=['검토','기획','수행','보완','완료','중단'];
const CONTROL_IDS=KG.nodes.filter(n=>n.type==='Control').map(n=>n.id);
function checkedProjects(value){
 if(!Array.isArray(value)||value.length>50)throw Error('관리사업은 최대 50개까지 복원할 수 있습니다.');
 const ids=new Set();return value.map(p=>{
  if(!p||typeof p!=='object'||typeof p.id!=='string'||!/^local-[a-zA-Z0-9-]{1,65}$/.test(p.id)||ids.has(p.id))throw Error('사업 ID가 잘못되었거나 중복됩니다.');ids.add(p.id);
  for(const [key,max] of [['title',120],['owner',80],['notes',1000]])if(typeof p[key]!=='string'||p[key].length>max)throw Error('사업 필드의 형식·길이를 확인해 주세요.');
  if(!p.title.trim()||!KG.nodes.some(n=>n.id===p.program&&n.type==='Program')||!KG.routes[0].nodes.includes(p.stage)||!STATUS.includes(p.status)||!Array.isArray(p.checks)||p.checks.some(c=>!CONTROL_IDS.includes(c)))throw Error('사업경로·단계·점검값이 올바르지 않습니다.');
  return {id:p.id,title:p.title.trim(),owner:p.owner,notes:p.notes,program:p.program,stage:p.stage,status:p.status,checks:[...new Set(p.checks)]};
 });
}
let projects=[], storageWarning='';
try{const raw=localStorage.getItem(PROJECT_KEY);if(raw){if(raw.length>200000)throw Error('length');projects=checkedProjects(JSON.parse(raw));}}catch(e){storageWarning='저장 자료를 읽지 못했습니다. 새로 저장하기 전에 기존 백업을 확인해 주세요.';}
function persistProjects(next){try{localStorage.setItem(PROJECT_KEY,JSON.stringify(next));projects=next;storageWarning='';return true;}catch(e){toast('저장하지 못했습니다. 브라우저 저장 권한·여유 공간을 확인해 주세요.');return false;}}
function graphData(){
 const nodes=[...KG.nodes,...projects.map(p=>({id:p.id,type:'Project',label:p.title,summary:p.notes||'사용자가 이 기기에 기록한 관리사업입니다.',ai:true,level:'user',sources:[],status:p.status,owner:p.owner}))];
 const edges=[...KG.edges,...projects.flatMap(p=>[
  {id:p.id+'-program',source:p.id,predicate:'usesProgram',target:p.program,level:'user',sources:[],note:'사용자가 선택한 참고 사업경로'},
  {id:p.id+'-stage',source:p.id,predicate:'currentStage',target:p.stage,level:'user',sources:[],note:'관리모형에서 사용자가 기록한 단계. 공식 진행현황 아님'}
 ])];return {nodes,edges};
}
function ev(level){return `<span class="ev ${esc(level)}">${esc(LEVEL[level])}</span>`;}
function sourceHtml(ids){return [...new Set(ids)].map(id=>{const s=SOURCES.get(id);return s?`<div class="source-item"><a href="${safeHref(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a><p>${esc(s.date)} · 확인 ${esc(s.checkedOn)}</p><p class="kg-source-note">${esc(s.note)}</p></div>`:'';}).join('');}
function nodeLink(n){return `<button class="btn" data-kg="${esc(n.id)}">${esc(n.label)} ↗</button>`;}
function kgOpen(id,focus=false){const n=graphData().nodes.find(n=>n.id===id);if(!n)return;if($('detail').open)$('detail').close();ks.selected=id;if(focus||!graphSubset().nodes.some(x=>x.id===id)){ks.focus=id;ks.query='';ks.type='all';ks.level='all';ks.page=0;}state.view='graph';render();try{history.replaceState(null,'','#kg-'+id);}catch(e){} }
function graphSubset(){
 const g=graphData(), byId=new Map(g.nodes.map(n=>[n.id,n]));let nodes;
 const eligibleEdges=g.edges.filter(e=>ks.level==='all'||e.level===ks.level);
 if(ks.focus){const ids=new Set([ks.focus]);for(let d=0;d<ks.depth;d++){const before=new Set(ids);for(const e of eligibleEdges)if(before.has(e.source)||before.has(e.target)){ids.add(e.source);ids.add(e.target);}}nodes=g.nodes.filter(n=>ids.has(n.id));}
 else if(ks.scope==='core')nodes=g.nodes.filter(n=>n.type==='Program'||(n.ai&&n.type==='Regulation')||['org-mnd','org-dapa'].includes(n.id));
 else if(ks.scope==='ai')nodes=g.nodes.filter(n=>n.ai);
 else if(ks.scope==='institutions')nodes=g.nodes.filter(n=>n.type==='Institution'||['org-mnd','org-dapa','org-jcs','org-forces'].includes(n.id));
 else nodes=g.nodes;
 const q=ks.query.toLocaleLowerCase('ko').trim().split(/\s+/).filter(Boolean);
 nodes=nodes.filter(n=>(ks.type==='all'||ks.type===n.type)&&q.every(t=>(n.label+' '+n.summary+' '+n.id).toLocaleLowerCase('ko').includes(t))&&(ks.level==='all'||n.level===ks.level||eligibleEdges.some(e=>e.source===n.id||e.target===n.id)));
 const total=nodes.length;ks.page=Math.min(ks.page,Math.max(0,Math.ceil(total/60)-1));nodes=nodes.slice(ks.page*60,(ks.page+1)*60);
 const ids=new Set(nodes.map(n=>n.id)),edges=eligibleEdges.filter(e=>ids.has(e.source)&&ids.has(e.target));return {nodes,edges,total,byId,all:g};
}
const options=(values,selected)=>values.map(([v,l])=>`<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(l)}</option>`).join('');
function renderGraph(){
 $('content').innerHTML=`<div class="kg-heading"><div><p class="eyebrow">ONTOLOGY · KNOWLEDGE GRAPH</p><h2>관계로 탐색하는 국방·방위사업</h2><p>${KG.nodes.length}개 개체 · ${KG.edges.length}개 관계 · ${KG.types.length}개 유형. 사업을 선택하면 절차·기관·규정·산출물로 이어집니다.</p></div><div class="kg-actions"><button class="btn" data-kg-export="jsonld">온톨로지 JSON-LD</button><button class="btn" data-kg-export="json">그래프 JSON</button></div></div><div class="kg-tools"><label>개체 검색<input id="kgQuery" type="search" maxlength="150" placeholder="사업·규정·절차·산출물 검색" value="${esc(ks.query)}"></label><label>탐색 범위<select id="kgScope">${options([['core','국방 AI 핵심'],['ai','국방 AI 전체'],['institutions','9개 제도 개요'],['all','전체 개체']],ks.scope)}</select></label><label>개체 유형<select id="kgType">${options([['all','모든 유형'],...KG.types.map(t=>[t.id,t.label])],ks.type)}</select></label><label>관계 근거<select id="kgLevel">${options([['all','모든 근거'],...Object.entries(LEVEL)],ks.level)}</select></label><button class="btn" id="kgReset">초기화</button></div><div id="kgDisplay"></div>`;
 drawGraph();$('kgQuery').addEventListener('input',e=>{ks.query=e.target.value;ks.page=0;drawGraph();});
 for(const [id,key] of [['kgScope','scope'],['kgType','type'],['kgLevel','level']])$(id).addEventListener('change',e=>{ks[key]=e.target.value;ks.page=0;if(key==='scope')ks.focus='';drawGraph();});
}
function drawGraph(){
 const g=graphSubset(), sel=g.byId.get(ks.selected), focus=g.byId.get(ks.focus);
 $('kgDisplay').innerHTML=`${focus?`<div class="project-notice">${esc(focus.label)} 중심 · ${ks.depth}단계 이웃 <button class="btn" id="kgDepth">${ks.depth===1?'2단계까지 확장':'1단계로 축소'}</button> <button class="btn" id="kgUnfocus">전체 범위로 돌아가기</button></div>`:''}<div class="kg-layout"><section class="kg-board" aria-label="관계 그래프"><div class="kg-bar"><span class="kg-count">표시 ${g.nodes.length} / 조건에 맞는 ${g.total}개 · 화면 내 관계 ${g.edges.length}개</span><div><button class="btn" id="kgZoomIn" aria-label="그래프 확대">＋</button> <button class="btn" id="kgZoomOut" aria-label="그래프 축소">−</button> <button class="btn" id="kgFit">맞춤</button></div></div><svg id="kgSvg" class="kg-canvas" role="group" aria-label="국방 지식그래프. 노드 선택 또는 아래 텍스트 목록 이용" tabindex="0"></svg><div class="kg-legend">${ev('source')} 실선 ${ev('original')} 회색 ${ev('model')} 점선 <span>화살표: 관계 방향 · AI 배지: 강조 항목</span></div><div class="kg-bar"><span>빈 곳을 끌어 이동 · 확대 버튼으로 조절</span><span><button class="btn" id="kgPrev" ${ks.page===0?'disabled':''}>이전</button> ${ks.page+1} / ${Math.max(1,Math.ceil(g.total/60))} <button class="btn" id="kgNext" ${(ks.page+1)*60>=g.total?'disabled':''}>다음</button></span></div></section><aside class="panel kg-side" id="kgSide" aria-label="선택 개체의 근거와 연결" aria-live="polite">${graphDetail(sel,g.all,g.byId)}</aside></div><details class="kg-catalog" open><summary>화면의 개체를 텍스트로 탐색 (${g.nodes.length})</summary><div class="kg-node-list">${g.nodes.map(nodeLink).join('')||'<p class="mini">검색 결과가 없습니다. 범위·필터를 변경해 주세요.</p>'}</div></details><details class="kg-catalog"><summary>화면 내 관계와 근거 (${g.edges.length})</summary><div class="table-scroll"><table><thead><tr><th>시작 개체</th><th>관계 →</th><th>대상 개체</th><th>근거 수준·설명</th></tr></thead><tbody>${g.edges.map(e=>`<tr><td>${nodeLink(g.byId.get(e.source))}</td><td>${esc(REL.get(e.predicate).label)}</td><td>${nodeLink(g.byId.get(e.target))}</td><td>${ev(e.level)}<p>${esc(e.note)}</p>${sourceHtml(e.sources)}</td></tr>`).join('')}</tbody></table></div></details>`;
 paintGraph(g);
}
function graphDetail(n,g,byId){
 if(!n)return '<h3>개체를 선택하세요</h3><p>선택한 사업·규정의 근거와 연결을 확인할 수 있습니다.</p>';
 const edges=g.edges.filter(e=>(e.source===n.id||e.target===n.id)&&(ks.level==='all'||e.level===ks.level));
 return `<span class="badge">${esc(TYPE.get(n.type))}${n.ai?' · AI':''}</span><h3>${esc(n.label)}</h3>${ev(n.level)}<p>${esc(n.summary)}</p>${n.status?`<p><b>${esc(n.status)}</b></p>`:''}${n.date?`<p>시행 기준 ${esc(n.date)}</p>`:''}<div class="kg-actions"><button class="btn primary" data-kg-focus="${esc(n.id)}">이 개체 중심으로 연결 탐색</button>${n.institutionId?`<button class="btn" data-open="${esc(n.institutionId)}">기존 제도 상세</button>`:''}</div><h4>개체의 출처</h4>${sourceHtml(n.sources)||`<p>${n.level==='user'?'이 기기에서 사용자가 입력한 내용입니다.':'실무 탐색·관리를 위한 제안입니다. 공식 사업 절차나 의무로 확정한 내용이 아닙니다.'}</p>`}<details ${innerWidth>720?'open':''}><summary>연결 ${edges.length}개 · 근거 필터 적용</summary>${edges.map(e=>{const out=e.source===n.id,other=byId.get(out?e.target:e.source);return `<button class="kg-neighbor" data-kg="${esc(other.id)}">${out?'→':'←'} ${esc(REL.get(e.predicate).label)} · ${esc(other.label)}<small>${esc(LEVEL[e.level])}${e.note?' · '+esc(e.note):''}</small></button>${e.sources.length?`<details><summary class="mini">이 관계의 출처</summary>${sourceHtml(e.sources)}</details>`:''}`;}).join('')||'<p>현재 근거 필터에 해당하는 연결이 없습니다.</p>'}</details>`;
}
function paintGraph(g){
 const svg=$('kgSvg'), order=['Organization','Institution','Program','Project','Process','Control','Regulation','Artifact'];
 const types=order.filter(t=>g.nodes.some(n=>n.type===t)), positions=new Map();
 const cols=Math.min(types.length,4)||1, widths=235, heights=80;let maxY=360, rowStart=45;
 for(let row=0;row<Math.ceil(types.length/4);row++){
  let rowSize=0;for(let col=0;col<4;col++){const type=types[row*4+col];if(!type)continue;const nodes=g.nodes.filter(n=>n.type===type);rowSize=Math.max(rowSize,nodes.length);nodes.forEach((n,i)=>positions.set(n.id,{x:25+col*widths,y:rowStart+i*heights}));}
  rowStart+=rowSize*heights+70;maxY=Math.max(maxY,rowStart);
 }
 let markup='<defs><pattern id="kgDots" width="20" height="20" patternUnits="userSpaceOnUse"><circle class="kg-grid" cx="2" cy="2" r=".7"/></pattern><marker id="kgArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path class="kg-arrow" d="M 0 0 L 10 5 L 0 10 z"/></marker></defs>';
 const w=cols*widths+25,h=maxY;markup+=`<rect x="0" y="0" width="${w}" height="${h}" fill="url(#kgDots)"/>`;
 for(const e of g.edges){const a=positions.get(e.source),b=positions.get(e.target);let x1=a.x+190,y1=a.y+30,x2=b.x,y2=b.y+30;let d;
  if(a.x===b.x){x1=a.x+190;x2=b.x+190;const bend=x1+22;d=`M${x1},${y1} C${bend},${y1} ${bend},${y2} ${x2},${y2}`;}else{if(a.x>b.x){x1=a.x;x2=b.x+190;}const mx=(x1+x2)/2;d=`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;}
  markup+=`<path class="kg-edge ${esc(e.level)} ${e.source===ks.selected||e.target===ks.selected?'selected':''}" d="${d}" marker-end="url(#kgArrow)"><title>${esc(g.byId.get(e.source).label)} → ${esc(REL.get(e.predicate).label)} → ${esc(g.byId.get(e.target).label)} · ${esc(LEVEL[e.level])}</title></path>`;
 }
 for(const n of g.nodes){const p=positions.get(n.id),chars=Array.from(n.label),line1=chars.slice(0,14).join(''),line2=chars.slice(14,28).join('')+(chars.length>28?'…':'');markup+=`<g class="kg-node ${esc(n.type)} ${n.ai?'ai':''} ${n.id===ks.selected?'selected':''}" transform="translate(${p.x} ${p.y})" data-kg-node="${esc(n.id)}" role="button" tabindex="0" aria-label="${esc(n.label+' · '+TYPE.get(n.type)+' · '+LEVEL[n.level])}" aria-pressed="${n.id===ks.selected}"><title>${esc(n.label)}</title><rect width="190" height="64" rx="9"/><text class="kg-type" x="12" y="15">${esc(TYPE.get(n.type))}${n.ai?' · AI':''}</text><text x="12" y="34">${esc(line1)}</text><text x="12" y="51">${esc(line2)}</text></g>`;}
 if(!g.nodes.length)markup+='<text x="40" y="70" class="kg-column">표시할 개체가 없습니다. 필터를 조정해 주세요.</text>';
 svg.innerHTML=markup;
 const home=[0,0,w,h];let box=[...home],drag=null;
 if(innerWidth<=720&&g.nodes.length){const p=positions.get(ks.selected)||positions.values().next().value;const mw=Math.min(430,w);box=[Math.max(0,p.x+95-mw/2),0,mw,mw*(svg.clientHeight/Math.max(1,svg.clientWidth))];}
 const update=()=>svg.setAttribute('viewBox',box.join(' '));update();
 const zoom=f=>{const nw=box[2]*f,nh=box[3]*f;if(nw<150||nw>w*3)return;box=[box[0]+(box[2]-nw)/2,box[1]+(box[3]-nh)/2,nw,nh];update();};
 $('kgZoomIn').onclick=()=>zoom(.75);$('kgZoomOut').onclick=()=>zoom(1.333333);$('kgFit').onclick=()=>{box=[...home];update();};
 svg.addEventListener('pointerdown',e=>{if(e.target.closest('[data-kg-node]'))return;drag={x:e.clientX,y:e.clientY,box:[...box]};svg.setPointerCapture(e.pointerId);});
 svg.addEventListener('pointermove',e=>{if(!drag)return;const r=svg.getBoundingClientRect(),scale=Math.min(r.width/box[2],r.height/box[3]);box=[drag.box[0]-(e.clientX-drag.x)/scale,drag.box[1]-(e.clientY-drag.y)/scale,box[2],box[3]];update();});
 for(const name of ['pointerup','pointercancel'])svg.addEventListener(name,()=>drag=null);
 svg.addEventListener('click',e=>{const n=e.target.closest('[data-kg-node]');if(n)kgOpen(n.dataset.kgNode);});
 svg.addEventListener('keydown',e=>{const n=e.target.closest('[data-kg-node]');if(n&&['Enter',' '].includes(e.key)){e.preventDefault();kgOpen(n.dataset.kgNode);$('kgSide').scrollIntoView({block:'nearest'});}else if(e.key==='+'||e.key==='='){e.preventDefault();zoom(.75);}else if(e.key==='-'){e.preventDefault();zoom(1.333333);}});
}
function renderAI(){
 const programs=KG.nodes.filter(n=>n.type==='Program'),rules=KG.nodes.filter(n=>n.ai&&n.type==='Regulation'),route=KG.routes.find(r=>r.id===ks.route);
 const byId=new Map(KG.nodes.map(n=>[n.id,n]));
 $('content').innerHTML=`<div class="ai-banner"><div><p class="eyebrow">DEFENSE AI · PRIORITY VIEW</p><h2>국방 AI를 사업에서 운영까지</h2><p>프로그램의 목적과 사업경로를 구분하고, 데이터·모델·시험·규정의 연결을 한눈에 확인합니다. 공개 자료를 바탕으로 한 탐색 화면이며 개별 사업의 실제 진행현황은 포함하지 않습니다.</p></div><div class="ai-number">05<small>사업·추진 기반</small></div></div><div class="ai-programs">${programs.map((n,i)=>`<article class="panel ai-program"><span class="badge mnd">AI · 0${i+1}</span> ${ev(n.level)}<h3>${esc(n.label)}</h3><p>${esc(n.summary)}</p><p class="mini">${esc(n.status)}</p><button class="btn primary" data-kg-focus="${esc(n.id)}">연결 지식그래프 →</button><details><summary>공식 근거·확인 범위</summary>${sourceHtml(n.sources)}</details></article>`).join('')}</div><section class="ai-section"><div class="kg-heading"><div><h3>프로세스와 단계별 산출물</h3><p>공통 관리모형과 특정 사업의 공식 경로를 구분해 선택합니다.</p></div><label class="mini">경로 선택 <select id="aiRoute">${options(KG.routes.map(r=>[r.id,r.label]),ks.route)}</select></label></div><p>${ev(route.level)} ${esc(route.note)}</p><ol class="ai-route">${route.nodes.map(id=>{const n=byId.get(id);return `<li><button data-kg-focus="${esc(id)}"><b>${esc(n.label)}</b><small>${esc(n.summary)}</small></button></li>`;}).join('')}</ol></section><section class="ai-section"><h3>핵심 규정 · 적용 범위 확인</h3><p>법적 적용은 사업 종류와 현행 원문으로 확인합니다. 점선 연결은 적용 검토를 돕는 제안입니다.</p><div class="ai-rules">${rules.map(n=>`<article class="panel">${ev(n.level)}<h4>${esc(n.label)}</h4><p>시행 ${esc(n.date)} · ${esc(n.summary)}</p><div class="kg-actions">${nodeLink(n)}<a class="btn" href="${safeHref(n.url)}" target="_blank" rel="noopener noreferrer">공식 원문 ↗</a></div></article>`).join('')}</div></section><section class="ai-section"><h3>사업 관리에서 함께 볼 점검사항</h3><p>${ev('model')} 법정 의무 목록을 대체하지 않는 실무 점검 제안입니다.</p><div class="ai-controls">${CONTROL_IDS.map(id=>nodeLink(byId.get(id))).join('')}</div></section>`;
 $('aiRoute').onchange=e=>{ks.route=e.target.value;renderAI();};
}
function renderSchema(){
 $('content').innerHTML=`<div class="kg-heading"><div><p class="eyebrow">SCHEMA · PROVENANCE</p><h2>온톨로지 구조와 검증 범위</h2><p>개체 유형과 관계의 출발·도착 유형을 정의하고, 관계마다 근거를 기록합니다.</p></div><button class="btn primary" data-kg-export="jsonld">JSON-LD 다운로드</button></div><div class="schema-grid">${KG.types.map(t=>`<section class="panel"><h3>${esc(t.label)}</h3><code>${esc(t.id)}</code><p>${graphData().nodes.filter(n=>n.type===t.id).length}개 개체</p></section>`).join('')}</div><section class="ai-section"><h3>관계 사전</h3><div class="table-scroll"><table><thead><tr><th>관계</th><th>출발 유형 (중 하나)</th><th>도착 유형 (중 하나)</th></tr></thead><tbody>${KG.relations.map(r=>`<tr><td><b>${esc(r.label)}</b><br><code>${esc(r.id)}</code></td><td>${r.domain.map(t=>esc(TYPE.get(t))).join(' · ')}</td><td>${r.range.map(t=>esc(TYPE.get(t))).join(' · ')}</td></tr>`).join('')}</tbody></table></div><div class="context"><strong>검증 범위</strong><p>${esc(KG.meta.validation)} JSON-LD에는 개체·관계·스키마와 RDF 진술 단위의 출처를 포함합니다. 내 관리사업은 기기 내 기록이며 다운로드에 함께 포함됩니다.</p></div></section><section class="ai-section"><h3>근거 수준</h3><p>${ev('source')} 공식 문서에서 확인한 범위의 관계</p><p>${ev('original')} 기존 제도 지도의 인용·절차, 원본 기준일 유지</p><p>${ev('model')} 실무 탐색을 위한 편집·관리 제안</p><p>${ev('user')} 사용자가 이 기기에 기록한 사업</p></section><section class="ai-section"><h3>국방 AI 공식 자료와 확인 한계</h3><div class="evidence-grid">${KG.sources.filter(s=>!s.id.startsWith('original-')).map(s=>`<section class="panel">${sourceHtml([s.id])}</section>`).join('')}</div></section>`;
}
function jsonLD(){
 const g=graphData(),context={dm:KG.meta.namespace,rdf:'http://www.w3.org/1999/02/22-rdf-syntax-ns#',rdfs:'http://www.w3.org/2000/01/rdf-schema#',owl:'http://www.w3.org/2002/07/owl#',prov:'http://www.w3.org/ns/prov#',dct:'http://purl.org/dc/terms/'};
 const uri=id=>'dm:'+id, ref=id=>({'@id':uri(id)}), union=types=>types.length===1?ref(types[0]):{'@type':'owl:Class','owl:unionOf':{'@list':types.map(ref)}};
 return {'@context':context,'@graph':[
  {'@id':KG.meta.namespace,'@type':'owl:Ontology','dct:title':'국방·방위사업 온톨로지','owl:versionInfo':KG.meta.version,'dct:description':KG.meta.scope},
  ...KG.types.map(t=>({'@id':uri(t.id),'@type':'owl:Class','rdfs:label':t.label})),
  ...KG.relations.map(r=>({'@id':uri(r.id),'@type':'owl:ObjectProperty','rdfs:label':r.label,'rdfs:domain':union(r.domain),'rdfs:range':union(r.range)})),
  ...KG.sources.map(s=>({'@id':uri('source-'+s.id),'@type':'prov:Entity','dct:title':s.title,'dct:source':{'@id':s.url},'dct:description':s.note,'dm:sourceDate':s.date,'dm:checkedOn':s.checkedOn})),
  ...g.nodes.map(n=>({'@id':uri(n.id),'@type':uri(n.type),'rdfs:label':n.label,'dct:description':n.summary,'dm:evidenceLevel':n.level,'dm:aiHighlight':n.ai,'prov:wasDerivedFrom':n.sources.map(id=>ref('source-'+id))})),
  ...g.edges.map(e=>({'@id':uri(e.id),'@type':'rdf:Statement','rdf:subject':ref(e.source),'rdf:predicate':ref(e.predicate),'rdf:object':ref(e.target),'dm:evidenceLevel':e.level,'rdfs:comment':e.note,'prov:wasDerivedFrom':e.sources.map(id=>ref('source-'+id))}))
 ]}; // Reified statements preserve proposed relations without asserting them as authoritative facts.
}
function renderProjects(){
 const p=projects.find(p=>p.id===ks.edit),byId=new Map(KG.nodes.map(n=>[n.id,n]));
 $('content').innerHTML=`<div class="kg-heading"><div><p class="eyebrow">LOCAL PROJECT REGISTER</p><h2>내 국방 AI 관리사업</h2><p>사업경로·관리 단계·점검 결과를 기록하면 지식그래프의 사업 개체로 연결됩니다.</p></div><div class="kg-actions"><button class="btn" id="projectBackup">사업 기록 백업</button><label class="btn restore-label">백업 복원(추가)<input type="file" id="projectRestore" accept=".json,application/json" aria-label="관리사업 JSON 백업 복원"></label></div></div><div class="project-notice">기록은 <b>현재 브라우저에만 저장</b>되며 서버로 전송되지 않습니다. 다른 기기에는 자동 동기화되지 않습니다. 브라우저 데이터 삭제에 대비해 백업하세요. 공개 서비스에서 쓰는 개인 메모 기능이므로 비밀·개인정보는 입력하지 마세요. 점검 완료는 법적 적합성 인증이 아닙니다.</div>${storageWarning?`<p class="detail-note legal-alert">${esc(storageWarning)}</p>`:''}<div class="project-layout"><section class="panel"><h3>${p?'관리사업 수정':'관리사업 추가'}</h3><form id="projectForm" class="project-form"><label>사업명<input name="title" required maxlength="120" value="${esc(p?.title||'')}" placeholder="예: 공개 데이터 기반 행정 AI 검토"></label><label>참고 사업경로<select name="program">${options(KG.nodes.filter(n=>n.type==='Program').map(n=>[n.id,n.label]),p?.program||'program-ax')}</select></label><label>현재 관리 단계 · 공통 관리모형<select name="stage">${options(KG.routes[0].nodes.map(id=>[id,byId.get(id).label]),p?.stage||'ai-need')}</select></label><label>내 관리상태<select name="status">${options(STATUS.map(s=>[s,s]),p?.status||'검토')}</select></label><label>담당 역할 (선택)<input name="owner" maxlength="80" value="${esc(p?.owner||'')}" placeholder="개인 이름 대신 담당 역할"></label><label>검토 메모 (선택)<textarea name="notes" maxlength="1000">${esc(p?.notes||'')}</textarea></label><fieldset><legend>내가 확인한 점검사항</legend>${CONTROL_IDS.map(id=>`<label class="check-label"><input type="checkbox" name="checks" value="${id}" ${p?.checks.includes(id)?'checked':''}>${esc(byId.get(id).label)}</label>`).join('')}</fieldset><div class="kg-actions"><button class="btn primary" type="submit">${p?'변경 저장':'사업 저장'}</button>${p?'<button class="btn" type="button" id="projectCancel">수정 취소</button>':''}</div></form></section><section aria-label="저장된 관리사업"><div class="kg-bar">현재 기기 ${projects.length} / 50개 · 백업은 내 입력만 포함</div>${projects.map(p=>`<article class="panel project-record">${ev('user')} <span class="project-status">${esc(p.status)}</span><h3>${esc(p.title)}</h3><p>${esc(byId.get(p.program).label)}<br>단계: ${esc(byId.get(p.stage).label)}${p.owner?'<br>담당 역할: '+esc(p.owner):''}</p><p class="mini">내 점검 ${p.checks.length} / ${CONTROL_IDS.length} · ${p.checks.map(id=>esc(byId.get(id).label)).join(' · ')||'확인 전'}</p><p class="project-note">${esc(p.notes)}</p><div class="kg-actions"><button class="btn primary" data-kg-focus="${esc(p.id)}">연결 보기</button><button class="btn" data-project-edit="${esc(p.id)}">수정</button><button class="btn" data-project-delete="${esc(p.id)}">삭제</button></div></article>`).join('')||'<div class="empty">등록된 관리사업이 없습니다.<br>사업을 추가하면 프로그램·단계와 연결됩니다.</div>'}</section></div>`;
 $('projectForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),record={id:p?.id||'local-'+crypto.randomUUID(),title:f.get('title'),program:f.get('program'),stage:f.get('stage'),status:f.get('status'),owner:f.get('owner'),notes:f.get('notes'),checks:f.getAll('checks')};try{const next=checkedProjects([...projects.filter(x=>x.id!==record.id),record]);if(persistProjects(next)){ks.edit='';renderProjects();toast('이 브라우저에 저장했습니다.');}}catch(err){toast(err.message);}};
 $('projectRestore').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>200000)throw Error('백업 파일은 200 KB 이하로 제한합니다.');const data=JSON.parse(await file.text());if(data.schema!=='defense-projects-v2')throw Error('지원하는 사업 백업 형식이 아닙니다.');const incoming=checkedProjects(data.projects);if(incoming.some(p=>projects.some(x=>x.id===p.id)))throw Error('현재 기록과 중복된 ID가 있습니다. 기존 기록을 보존했습니다.');const next=checkedProjects([...projects,...incoming]);if(persistProjects(next)){renderProjects();toast(incoming.length+'개 사업을 추가 복원했습니다.');}}catch(err){toast('복원 실패: '+err.message);e.target.value='';}};
}
// Event delegation keeps all data as escaped text and never creates inline handlers.
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.kg)kgOpen(b.dataset.kg);
 if(b.dataset.kgFocus)kgOpen(b.dataset.kgFocus,true);
 if(b.dataset.kgExport){const ld=b.dataset.kgExport==='jsonld';download(JSON.stringify(ld?jsonLD():{...KG,...graphData()},null,2),ld?'defense-ontology.jsonld':'defense-knowledge-graph.json',ld?'application/ld+json':'application/json');}
 if(b.dataset.projectEdit){ks.edit=b.dataset.projectEdit;renderProjects();$('projectForm').scrollIntoView({block:'start'});}
 if(b.dataset.projectDelete){const p=projects.find(x=>x.id===b.dataset.projectDelete);if(p&&confirm('“'+p.title+'” 기록을 이 브라우저에서 삭제하시겠습니까?')){if(persistProjects(projects.filter(x=>x.id!==p.id))){if(ks.edit===p.id)ks.edit='';renderProjects();}}}
 if(b.id==='projectCancel'){ks.edit='';renderProjects();}
 if(b.id==='projectBackup')download(JSON.stringify({schema:'defense-projects-v2',exportedOn:new Date().toISOString(),projects},null,2),'defense-projects-backup.json','application/json');
 if(b.id==='kgReset'){Object.assign(ks,{scope:'core',type:'all',level:'all',query:'',focus:'',depth:1,page:0,selected:'program-rapid'});renderGraph();}
 if(b.id==='kgDepth'){ks.depth=ks.depth===1?2:1;ks.page=0;drawGraph();}
 if(b.id==='kgUnfocus'){ks.focus='';ks.page=0;drawGraph();}
 if(b.id==='kgPrev'||b.id==='kgNext'){ks.page+=b.id==='kgPrev'?-1:1;drawGraph();}
});
