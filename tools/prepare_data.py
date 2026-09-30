"""Adapt selected Korea100 records; preserve provenance and original legal dates."""
import json,pathlib,subprocess
ROOT=pathlib.Path(__file__).resolve().parents[1]
SOURCE=ROOT.parent/'reference-repo'
configs=[
('defense-procurement','방위사업청','직접 소관','획득·전력화','국방조달·방위사업 입찰','소요와 공고를 연결하고, 계약·품질보증·납품까지 읽습니다.','선행연구·추진방법 결정, 계약 및 품질보증 관리'),
('defense-rnd-force-integration','방위사업청','직접 소관','획득·전력화','방위사업 연구개발·전력화','소요결정, 획득, 시험평가와 성능개량의 관계를 읽습니다.','합참·각 군 소요와 방위사업청의 획득 업무 연계'),
('defense-facility-project-plan-completion','국방부','직접 소관','시설·보호','국방·군사시설 사업','사업계획에서 실시계획·관계기관 협의·준공까지 확인합니다.','국방·군사시설 사업계획과 실시계획 승인'),
('military-facility-protection-zone-release','국방부','직접 소관','시설·보호','군사시설 보호구역 변경·해제','관할부대 검토, 심의와 변경·해제 고시를 연결합니다.','군사기지·군사시설 보호구역의 지정·변경·해제'),
('military-airport-relocation-site-selection','국방부','직접 소관','이전·재산','군 공항 이전·지원','후보지, 주민투표, 부지 선정과 지원사업의 접점을 읽습니다.','군 공항 이전부지 선정 및 이전주변지역 지원 절차'),
('military-airfield-noise-measures-compensation','국방부','직접 소관','주민·투자','군용비행장 소음대책·보상','소음대책지역 지정부터 보상금 결정과 이의절차까지 확인합니다.','소음영향 조사·지역 지정·대책 수립, 지자체 보상업무 연계'),
('national-property-disuse-contribution-concession','국방부','공동·연계','이전·재산','국방재산 용도폐지·기부 대 양여','대체시설 기부와 종전 국방재산의 양여·이전을 연결합니다.','국방부 소관 재산의 용도폐지·기부 대 양여 관련 업무'),
('tk-integrated-airport','국방부','공동·연계','이전·재산','대구경북통합신공항 군 공항 이전','통합신공항 제도 중 군 공항 이전에 해당하는 절차를 발췌했습니다.','군 공항 이전사업의 사업계획·실시계획 승인'),
('foreign-investment-national-security-review','국방부','공동·연계','주민·투자','방위산업체 외국인투자 협의','외국인투자 허가 과정의 국방부 협의 지점을 확인합니다.','산업통상부의 방위산업체 투자 허가에 대한 사전 협의')]
items=[]
for index,(slug,owner,scope,group,title,desc,role) in enumerate(configs,1):
 d=json.loads((SOURCE/'web/data/institutions'/f'{slug}.json').read_text())
 c=d['canvas']; p=d['process']; v=d.get('verification',{})
 nodes=[{k:n[k] for k in ['id','name','actor','action','stage','type','output_documents','deadline','legal_basis'] if k in n} for n in p['nodes']]
 note='원본의 한 장 요약과 공개 절차를 재구성했습니다. 단계·화살표는 업무구조 설명이며 실제 사업의 진행 상태가 아닙니다.'
 if slug=='tk-integrated-airport':
  nodes=[n for n in nodes if n['id'] in ['P03','P05','P11']]
  c['purpose']=desc;c['procedure']=[n['name'] for n in nodes]
  c['docsFlow']='군 공항 이전사업 시행자 관련 문서 · 군 공항 사업계획·실시계획 승인 문서 · 이전주변지역 지원사업 문서'
  c['authorities']=[a for a in c['authorities'] if '국토교통부' not in a['name']]
  note='군 공항 이전 관련 3개 단계만 발췌했습니다. 민간공항·종전부지 개발 절차는 원본에서 확인하십시오. 발췌 단계 사이의 생략된 절차를 직접 연결하지 않았습니다.'
 if slug=='foreign-investment-national-security-review':
  nodes=[n for n in nodes if n['id']=='P08'];c['purpose']=desc;c['procedure']=[nodes[0]['name']]
  c['authorities']=[{'name':'산업통상부장관','role':'방위산업체 외국인투자 허가 담당'},{'name':'국방부장관','role':'허가 전 사전 협의·의견 회신'}]
  c['moneyFlow']='투자허가 및 국방부 협의 절차입니다. 국방부의 재정지원 사업을 의미하지 않습니다.'
  c['docsFlow']='허가 신청자료 · 국방부 협의 요청·회신 · 허가 또는 불허 통지'
  c['bottlenecks']=['방위산업체 해당 여부와 투자 형태 확인','허가 전 협의자료 및 보완요구 확인','법정 처리기간·연장 사유 및 통지 기준 확인']
  note='원본 「외국인투자 국가안보 심사」 중 방위산업체 투자허가·국방부 협의 단계만 발췌했습니다. 일반 국가안보 심사 전체를 국방부 소관으로 분류하지 않습니다.'
 if slug=='defense-rnd-force-integration': note+=' 원본은 상위 획득 흐름을 제시하며, 탐색개발·체계개발 등 연구개발의 세부 절차 전체를 망라하지 않습니다.'
 if slug in ['defense-facility-project-plan-completion','military-facility-protection-zone-release','military-airport-relocation-site-selection','national-property-disuse-contribution-concession']:
  note+=' 원본의 군 공항 이전 적용 사례를 포함하므로 모든 시설사업에 동일하게 적용되는 절차로 해석하지 않습니다.'
 if slug=='military-facility-protection-zone-release':
  for n in nodes:
   for k in ['actor','action']: n[k]=n.get(k,'').replace('광주특별시','관계 지방자치단체')
  c=json.loads(json.dumps(c,ensure_ascii=False).replace('광주특별시','관계 지방자치단체'))
 if slug=='military-airfield-noise-measures-compensation':
  c['bottlenecks']=['소음대책지역 지정 고시와 실제 거주지역의 일치 여부','보상대상 기간·거주사실·산정자료 확인','보상금 결정 통지와 이의신청 절차·기한 확인']
  c['moneyFlow']='보상대상·보상금액은 법령상 요건과 소음대책지역, 거주기간 등 개별 사실관계에 따라 산정됩니다. 구체적인 금액은 관할 지방자치단체 공고·결정에서 확인하십시오.'
 for a in c['authorities']:
  if '해당 레인 업무' in a['role']:
   tasks=[n['name'] for n in nodes if n['actor']==a['name']]
   a['role']=' / '.join(tasks) if tasks else '관계기관 협의와 사업 문서 인계에 참여(원본 참여기관)'
 ids={n['id'] for n in nodes}
 edges=[e for e in p['edges'] if e['source'] in ids and e['target'] in ids]
 sources=v.get('sources',[])
 for src in sources:
  if src.get('lawId'): src['officialUrl']='https://www.law.go.kr/LSW/lsInfoP.do?lsId='+src['lawId']
 legal_note='이 대시보드는 원본 법령 기준일의 제도 요약을 제공합니다. 현행 조문 전체의 의미·적용 요건을 재검증한 자료는 아닙니다.'
 if owner=='방위사업청':legal_note='방위사업법 현행 표제에서 2026-09-11 시행본(법률 제21429호)을 확인했습니다. 원본은 2026-07 기준이므로 세부 절차·조문은 개정 영향 재검토가 필요합니다.'
 items.append(dict(id=f'D{index:02}',slug=slug,title=title,originalTitle=d['name'],description=desc,owner=owner,scope=scope,group=group,role=role,sourceDate=d['asOfDate'],originalUrl='https://hosungseo.github.io/korea100/model/'+slug+'/',canvas=c,nodes=nodes,edges=edges,sources=sources,notes=note,legalNote=legal_note,originalVerification={'status':v.get('status'),'date':v.get('verifiedAt'),'scope':v.get('scope')},checks=d.get('fieldVerification',[])[:5]))
# Relationships are explicitly editorial navigation links, not statutory dependencies.
rels=[('D01','D02','획득·시험평가 연계'),('D03','D04','시설·보호구역 검토'),('D03','D05','이전시설 사업'),('D05','D07','기부 대 양여'),('D05','D08','특별법 적용 사례'),('D05','D06','소음·주민지원 검토'),('D01','D09','방산업체 관련 절차')]
meta={'title':'한 장으로 끝내는 국방·방위사업 제도 지도','version':'1.0.0','builtAt':'2026-10-01','sourceRepo':'https://github.com/hosungseo/korea100','sourceCommit':subprocess.check_output(['git','-C',str(SOURCE),'rev-parse','HEAD'],text=True).strip(),'sourceTotal':660,'selection':'국방부·방위사업청의 직접 소관 6개와 국방부 역할이 명시된 공동·연계 3개. 병무청 단독업무, 일반 사이버보안, 일반 이전계획 제외.','verification':'원본 기준일 유지; 현행 법령 표제 일부 확인; 현행 조문 전수검증 미실시','relationships':[{'source':s,'target':t,'label':l} for s,t,l in rels]}
(ROOT/'data/institutions.json').write_text(json.dumps({'meta':meta,'items':items},ensure_ascii=False,indent=2))
print('Saved',len(items),'institutions',sum(len(i['nodes']) for i in items),'nodes')
