"""Create a provenance-aware domain graph from institutions and curated AI evidence."""
import hashlib,json,pathlib
R=pathlib.Path(__file__).resolve().parents[1]
D=json.loads((R/'data/institutions.json').read_text())
T=[('Institution','제도'),('Program','사업·프로그램'),('Organization','기관·역할 주체'),('Process','프로세스'),('Regulation','법령·사업규정'),('Artifact','산출물·데이터'),('Control','관리 점검사항'),('Project','내 관리사업')]
rels=[
 ('hasProcess','절차 포함',['Institution','Program'],['Process']),
 ('responsible','담당·참여',['Institution','Program','Process','Project'],['Organization']),
 ('governedBy','근거·적용 검토',['Institution','Program','Process','Control'],['Regulation']),
 ('produces','산출',['Process'],['Artifact']),
 ('precedes','후속 단계',['Process'],['Process']),
 ('requires','점검사항',['Process','Program','Project'],['Control']),
 ('relatedTo','연계',['Institution','Program','Process','Regulation','Control'],['Institution','Program','Process','Regulation','Control']),
 ('partOf','소속',['Organization'],['Organization']),
 ('usesProgram','사업경로 참조',['Project'],['Program']),
 ('currentStage','관리 단계',['Project'],['Process'])]
G={'meta':{'version':'2.0.0','reviewedOn':'2026-10-01','namespace':'https://roknnaoms-hub.github.io/defense-institution-map/ontology#','scope':'공개 제도 9개와 공개 근거에 기반한 국방 AI 사업경로. 공식 사업대장·실시간 법령 서비스가 아닙니다.','validation':'ID·참조·정의역/치역 검증. 자동 OWL 추론이나 법률 적합성 판정은 수행하지 않습니다.'},'types':[{'id':a,'label':b} for a,b in T],'relations':[{'id':a,'label':b,'domain':c,'range':d} for a,b,c,d in rels],'sources':[],'nodes':[],'edges':[],'routes':[]}
N={};E=set()
def sid(prefix,label):return prefix+'-'+hashlib.sha256(label.encode()).hexdigest()[:12]
def source(id,title,url,date,note):
 G['sources'].append(dict(id=id,title=title,url=url,date=date,checkedOn='2026-10-01',note=note));return id
def node(id,type,label,summary='',ai=False,level='model',refs=None,**kw):
 if id in N:
  N[id]['ai']|=ai;N[id]['sources']=list(dict.fromkeys(N[id]['sources']+(refs or [])));return id
 n=dict(id=id,type=type,label=label,summary=summary,ai=ai,level=level,sources=refs or [],**kw);N[id]=n;G['nodes'].append(n);return id
def edge(a,p,b,level='model',refs=None,note=''):
 k=(a,p,b)
 if k not in E:G['edges'].append(dict(id='e-'+str(len(E)+1),source=a,predicate=p,target=b,level=level,sources=refs or [],note=note));E.add(k)
source('ai-rule','국방데이터·인공지능업무 훈령','https://www.law.go.kr/admRulLsInfoP.do?admRulSeq=2100000276642','2026-03-30','국방부훈령 제3154호 표제 및 검색 본문 확인. 전문 조문 전수대조는 하지 않음.')
source('data-rule','국방데이터 관리 훈령','https://www.law.go.kr/admRulLsInfoP.do?admRulSeq=2100000273654','2026-02-01','국방부훈령 제3130호. 제7~10조·제18조의 공개 검색 본문과 표제를 확인.')
source('fast-rule','신속시범사업 업무관리 지침','https://www.law.go.kr/admRulLsInfoP.do?admRulSeq=2100000274620','2026-02-10','방위사업청예규 제1041호 표제 및 목적 조항 확인.')
source('fast-guide','방위사업청 신속시범사업 안내','https://www.dapa.go.kr/dapa/page/selectPage.do?menuSeq=3078&pageSeq=3198','2026 공모 안내','공식 안내의 사업 범위·5단계 절차 확인. 게시된 공모 일정은 현재 접수 중임을 뜻하지 않음.')
source('ax-notice','2026 AI 응용제품 신속 상용화 지원(국방) 공고','https://mnd.go.kr/mnd/155/subview.do?enc=Zm5jdDF8QEB8JTJGYmJzJTJGbW5kJTJGMjYzNzQlMkZJXzEzMTc5ODcyJTJGYXJ0Y2xWaWV3LmRvJTNG','2026-04-30','공식 공고 검색 본문 확인. 6월 1일 접수 마감 경과. 첨부 RFP·규정 ZIP 전문은 미대조.')
source('innov100','방산혁신기업 수출 관련 공식 보도자료','https://www.dapa.go.kr/dapa/doc/selectDoc.do?bbsSeq=326&currentPageNo=1&docSeq=58339&menuSeq=3069&recordCountPerPage=10','2026-03-26','국방 첨단기술 중 인공지능 분야를 포함한 기업 육성 사업임을 확인. 현재 기업 수·선정 상태는 표시하지 않음.')
source('org-rule','국방부와 그 소속기관 직제 시행규칙 제11조의2','https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=02&joNo=0011&lsiSeq=289203&urlMode=lsScJoRltInfoR','2026-08-28','국방부령 제1221호. 국방인공지능기획국의 과별 정책·데이터·유무인복합 업무 확인.')
for a,l in [('org-mnd','국방부'),('org-dapa','방위사업청'),('org-jcs','합동참모본부'),('org-forces','각 군·수요군'),('org-rapid','국방신속획득기술연구원'),('org-ai','국방인공지능기획국'),('org-industry','산학연·사업수행기관')]:
 refs=['org-rule'] if a in ('org-mnd','org-ai') else ['fast-guide']
 node(a,'Organization',l,'공개 근거에서 해당 역할·참여 범위를 확인한 기관입니다.',True,'source',refs)
edge('org-ai','partOf','org-mnd','source',['org-rule'],'직제 시행규칙 제11조의2')
ALIAS={'국방부':'org-mnd','국방부장관':'org-mnd','방위사업청':'org-dapa','방위사업청장':'org-dapa','합참':'org-jcs','수요군':'org-forces'}
for i in D['items']:
 ref=source('original-'+i['id'],i['title']+' 원본 구조',i['originalUrl'],i['sourceDate'],'기존 대시보드의 원본 기준일 유지. 이번 업데이트에서 현행 조문 전체를 재검증하지 않음.')
 iid=node('inst-'+i['id'],'Institution',i['title'],i['description'],i['id'] in ['D01','D02'],'original',[ref],institutionId=i['id'])
 owner=ALIAS.get(i['owner']) or node(sid('org',i['owner']),'Organization',i['owner'],'원본 담당기관 표기',False,'original',[ref])
 edge(iid,'responsible',owner,'original',[ref],i['role'])
 for law in i['sources']:
  rid=node(sid('reg',law['law']),'Regulation',law['law'],'기존 원본이 인용한 근거. 세부 적용은 사업 유형·현행 조문 확인 필요.',False,'original',[ref],url=law['officialUrl'],date=law.get('effectiveOn') or law.get('promulgatedOn'))
  edge(iid,'governedBy',rid,'original',[ref],'원본의 인용관계이며 모든 사업에 대한 일괄 적용 판정이 아닙니다.')
 for n in i['nodes']:
  pid=node('proc-'+i['id']+'-'+n['id'],'Process',n['name'],n.get('action',n['stage']),False,'original',[ref],institutionId=i['id'],stage=n['stage'])
  edge(iid,'hasProcess',pid,'original',[ref])
  aid=ALIAS.get(n['actor']) or node(sid('actor',n['actor']),'Organization',n['actor'],'원본의 담당 역할 표기입니다. 복수 기관의 묶음일 수 있습니다.',False,'original',[ref])
  edge(pid,'responsible',aid,'original',[ref])
  for doc in n.get('output_documents',[]):
   did=node(sid('doc',doc),'Artifact',doc,'원본에 기재된 단계별 산출물.',False,'original',[ref]);edge(pid,'produces',did,'original',[ref])
  for law in n.get('legal_basis',[]):
   rid=node(sid('reg',law['law']),'Regulation',law['law'],'원본 조문 인용관계.',False,'original',[ref]);edge(pid,'governedBy',rid,'original',[ref],law.get('article',''))
 for e in i['edges']:edge('proc-'+i['id']+'-'+e['source'],'precedes','proc-'+i['id']+'-'+e['target'],'original',[ref],('보완·회귀: ' if e.get('type')=='loop' else '')+(e.get('label') or ''))
for r in D['meta']['relationships']:edge('inst-'+r['source'],'relatedTo','inst-'+r['target'],'model',[],r['label']+' — 기존 편집상 연계')
for id,label,desc,refs,date in [
 ('rule-ai','국방데이터·인공지능업무 훈령','데이터·AI 거버넌스와 확산 기반을 다루는 규정. 사업 소요의 필요성·중복성·기술 타당성을 검토하는 관점으로 연결합니다.',['ai-rule'],'2026-03-30'),
 ('rule-data','국방데이터 관리 훈령','분류·수집·정제·가공 등 데이터 생애주기와 국방빅데이터 선도사업의 근거를 다룹니다.',['data-rule'],'2026-02-01'),
 ('rule-fast','신속시범사업 업무관리 지침','해당 사업경로의 선정·수행·시험 및 관리 기준입니다. 일반 AI 사업 전체에 자동 적용하지 않습니다.',['fast-rule'],'2026-02-10'),
 ('rule-org','국방부 직제 시행규칙','국방인공지능기획국의 정책·데이터·유무인복합 분야 역할 근거입니다.',['org-rule'],'2026-08-28')]:
 node(id,'Regulation',label,desc,True,'source',refs,date=date,url=next(s['url'] for s in G['sources'] if s['id']==refs[0]))
programs=[
 ('program-ax','AX-Sprint 국방','AI 응용제품의 국방 분야 상용화 지원 경로. 2026년 공고의 사업 범위만 반영했으며 개별 과제 선정·계약 현황은 수록하지 않습니다.','공고 마감 경과 · 선정현황 미확인',['ax-notice'],'org-mnd'),
 ('program-bigdata','국방빅데이터 선도사업','AI 학습에 쓸 데이터와 데이터 기반 의사결정 서비스의 구축 경로. 개별 과제 진행률을 의미하지 않습니다.','훈령상 사업 정의 확인',['data-rule'],'org-mnd'),
 ('program-rapid','신속시범사업 · AI 적용','AI 등 첨단기술 시제품의 군 적용을 검토하는 획득 경로. AI 전용 사업이 아니며 정식 획득 연계에는 별도 판단이 필요합니다.','AI 포함 공모분야 · 개별사업 미수록',['fast-guide','fast-rule'],'org-dapa'),
 ('program-innov','방산혁신기업100 · AI 분야','국방 첨단기술 분야 중 AI 기업의 성장 지원 경로. 무기체계 획득 절차와 구분해 봅니다.','AI 포함 육성사업 · 선정현황 미수록',['innov100'],'org-dapa'),
 ('program-platform','국방 지능형 플랫폼','훈령상 공통 AI·데이터 활용 기반의 구축 근거입니다. 현재 구축 완료 또는 개통을 확인한 사업 현황이 아닙니다.','훈령상 추진 근거 · 운영현황 미확인',['ai-rule'],'org-mnd')]
for id,label,summary,status,refs,owner in programs:
 node(id,'Program',label,summary,True,'source',refs,status=status)
 edge(id,'responsible',owner,'source',refs,'공개 근거의 사업 소관·관련기관')
 edge(id,'relatedTo','inst-D02','model',[],'개별 사업이 획득·전력화 대상인지 분류할 때 참고하는 연결이며 자동 적용 아님')
for p,r,refs in [('program-bigdata','rule-data',['data-rule']),('program-platform','rule-ai',['ai-rule']),('program-rapid','rule-fast',['fast-rule'])]:edge(p,'governedBy',r,'source',refs)
for p in ['program-ax','program-innov']:edge(p,'governedBy','rule-ai','model',[],'개별 공고의 법적 근거를 대체하지 않는 국방 AI 정책 검토 연결')
edge('rule-org','relatedTo','rule-ai','model',[],'정책 담당 조직과 업무 규정의 탐색 연결')
# Explicitly proposed management stages, never labelled a statutory uniform workflow.
stages=[
 ('need','문제·소요 정의','임무·사용자·기대효과를 정의하고 중복 개발 가능성을 검토합니다.','소요·적용성 검토서','org-forces','rule-ai'),
 ('route','사업경로·적용규정 결정','상용화 지원, 데이터 사업, 신속시범, 일반 획득 등 사업 유형을 구분합니다.','사업경로·규정 적용표','org-mnd','rule-ai'),
 ('data','데이터 확보·품질관리','수집 권한·보안 분류·정제·추적성 및 학습/검증 분리를 점검합니다.','데이터 명세·품질 점검표','org-forces','rule-data'),
 ('contract','제안·계약 준비','해당 공고의 평가·계약 방식과 산출물·권리·검수 조건을 확인합니다.','제안·계약 요구사항 목록','org-dapa','rule-ai'),
 ('develop','모델 개발·형상관리','데이터·모델·코드 버전을 함께 기록하고 변경 근거를 남깁니다.','모델 명세·변경이력','org-forces','rule-data'),
 ('test','시험·신뢰성 검증','성능뿐 아니라 실패조건·강건성·사람의 검토와 운용 제약을 확인합니다.','시험 시나리오·결과서','org-forces','rule-ai'),
 ('operate','시범운용·현장확인','사용자 환경에서 효과·제약을 확인하고 사업경로별 후속 결정을 기록합니다.','운용 평가·인수기록','org-forces','rule-fast'),
 ('improve','성과·재학습·개량','오류·데이터 변화·성능저하를 살피고 변경 시 재검증 여부를 정합니다.','운영·재검증 기록','org-forces','rule-data')]
for key,label,summary,artifact,owner,rule in stages:
 pid=node('ai-'+key,'Process',label,summary,True,'model',[],stage='공통 관리모형(제안)')
 did=node('ai-doc-'+key,'Artifact',artifact,'실무 기록을 위한 제안 산출물입니다. 법정 서식명이나 필수 제출서류로 단정하지 않습니다.',True,'model')
 edge(pid,'produces',did);edge(pid,'responsible',owner,'model',[],'업무 검토용 역할 예시. 실제 사업분장에 맞춰 확인 필요')
 edge(pid,'governedBy',rule,'model',[],'점검할 규정의 탐색 연결. 이 단계의 법정 의무·담당을 확정하는 관계가 아님')
for a,b in zip(stages,stages[1:]):edge('ai-'+a[0],'precedes','ai-'+b[0],'model',[],'관리 단계의 제안 순서')
edge('ai-improve','precedes','ai-data','model',[],'데이터·모델 변경 시 재검토하는 관리 순환')
for p,*_ in programs:
 for key in ['need','route','data','test','improve']:edge(p,'hasProcess','ai-'+key,'model',[],'공통 관리 관점 연결 — 해당 공고의 실제 절차와 별도')
controls=[
 ('security','보안·접근권한','자료 등급, 접근 주체, 외부 제공 승인과 보호조치를 확인합니다.','data','rule-data'),
 ('quality','데이터 품질·추적성','출처·정제·표본 구성·오류 및 데이터 분할 이력을 남깁니다.','data','rule-data'),
 ('rights','데이터·모델 권리','사용·재사용·납품·재학습 권리와 제3자 라이선스를 계약별로 확인합니다.','contract','rule-ai'),
 ('trust','신뢰성·사람의 감독','성능 한계와 오류 대응, 사람의 검토 지점을 시험계획에 포함하도록 권고합니다.','test','rule-ai'),
 ('version','형상·변경·재검증','학습데이터·모델·코드와 시험 결과를 버전 단위로 연결합니다.','improve','rule-data')]
for key,label,summary,stage,rule in controls:
 cid=node('control-'+key,'Control',label,summary,True,'model');edge('ai-'+stage,'requires',cid);edge(cid,'governedBy',rule,'model',[],'실무 점검 제안. 조문별 의무 판단과 구분')
# Source-confirmed rapid pathway, separated from the proposed AI lifecycle.
rapid=[('proposal','기술·사업 제안','산학연의 기술·사업 제안','org-industry'),('development','시제품 연구개발','사업수행기관과 신속원의 개발 단계','org-rapid'),('proof','성능입증·군 활용성 평가','군에서 성능과 활용성을 확인','org-forces'),('requirement','후속 소요 판단','시험 결과 이후 소요 연계 여부 판단','org-jcs'),('field','양산·운용 연계','소요·별도 후속절차에 따른 연계','org-dapa')]
for key,label,summary,owner in rapid:
 pid=node('rapid-'+key,'Process',label,summary,True,'source',['fast-guide'],stage='신속시범사업 공식 안내 요약')
 edge('program-rapid','hasProcess',pid,'source',['fast-guide']);edge(pid,'responsible',owner,'source',['fast-guide']);edge(pid,'governedBy','rule-fast','source',['fast-rule'])
edge('rapid-development','responsible','org-industry','source',['fast-guide'])
edge('rapid-field','responsible','org-forces','source',['fast-guide'])
for a,b in zip(rapid,rapid[1:]):edge('rapid-'+a[0],'precedes','rapid-'+b[0],'source',['fast-guide'],'공식 안내 순서의 요약. 소요·양산은 자동 확정 아님')
G['routes']=[{'id':'ai-management','label':'국방 AI 공통 관리모형','level':'model','note':'실무 관리를 위한 제안 흐름입니다. 모든 사업에 동일하게 적용되는 법정 절차가 아닙니다.','nodes':['ai-'+s[0] for s in stages]}, {'id':'rapid-official','label':'신속시범사업 공식 경로','level':'source','note':'공식 안내의 5단계 요약입니다. 후속 소요·양산은 별도 판단이 필요합니다.','nodes':['rapid-'+s[0] for s in rapid]}]
# Machine-checkable constraints ensure the diagram cannot invent unresolved edges.
relation_map={r['id']:r for r in G['relations']};source_ids={s['id'] for s in G['sources']}
for n in G['nodes']:assert set(n['sources'])<=source_ids
for e in G['edges']:
 assert e['source'] in N and e['target'] in N and e['predicate'] in relation_map
 rel=relation_map[e['predicate']];assert N[e['source']]['type'] in rel['domain'] and N[e['target']]['type'] in rel['range']
 assert set(e['sources'])<=source_ids
 if e['level'] in ('source','original'):assert e['sources']
(R/'data/ontology.json').write_text(json.dumps(G,ensure_ascii=False,indent=2)+'\n')
print('Ontology:',len(G['nodes']),'nodes,',len(G['edges']),'edges,',len(G['sources']),'sources')
