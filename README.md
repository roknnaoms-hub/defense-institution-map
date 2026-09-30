# 국방·방위사업 제도 지도

국방부·방위사업청 관련 제도를 담당기관, 법적 근거, 절차, 문서와 연결하는 정적 대시보드입니다.

- 원본: https://hosungseo.github.io/korea100/
- 원본 저장소: https://github.com/hosungseo/korea100
- 원본 커밋: `e9161bd3b2fe3121d2de9823a61d8a9bf6765205`
- 편집일: 2026-10-01 / 버전: 1.0.0
- 수록: 직접 소관 6개 + 공동·연계 3개, 총 69개 업무단계
- 저장소: `roknnaoms-hub/defense-institution-map`
- 서비스 주소: https://roknnaoms-hub.github.io/defense-institution-map/
- 현재 상태: GitHub Pages 게시 완료. 2026-10-01 공개 주소 HTTP 200 및 검증된 대시보드 파일과의 일치를 확인했습니다.
- 배포 방식: `main` 브랜치의 루트(`/`)에서 자동 게시합니다.

## 실행

`index.html`을 브라우저에서 열면 작동합니다. 별도 설치, API 키, 서버 또는 외부 CDN이 필요하지 않습니다. 공식 원문 링크를 여는 동작에는 인터넷 연결이 필요합니다.

## 제공 기능

제도 지도, 제도 대장, 키워드·기관·분야별 검색, 최대 3개 비교, 관심 제도 저장, 상세 요약, 단계별 업무구조와 보완 경로, 법령·출처, 실무 확인사항, 제도별 주소, CSV·JSON 내려받기, 인쇄/PDF, 글자 확대, 모바일 대응.

관심 제도는 브라우저에 저장됩니다. 실시간 입찰·사업진도·신청접수 기능은 없습니다. 지도상의 분류와 관련 제도 링크는 업무 이해를 위한 편집이며 법정 선후행 의무를 의미하지 않습니다.

## 자료 범위와 한계

원본 660개 항목 중 국방부·방위사업청 직접 소관 6개와 국방부 역할이 명시된 연계 3개를 선별했습니다. 병무청 단독업무, 일반 사이버보안, 중앙기관 이전계획은 제외했습니다. 국방 제도 전체를 망라한 목록은 아닙니다.

| 구분 | 제도 |
| --- | --- |
| 방위사업청 직접 | 국방조달·방위사업 입찰, 방위사업 연구개발·전력화 |
| 국방부 직접 | 국방·군사시설 사업, 군사시설 보호구역 변경·해제, 군 공항 이전·지원, 군용비행장 소음대책·보상 |
| 국방부 공동·연계 | 국방재산 용도폐지·기부 대 양여, 대구경북통합신공항 군 공항 이전, 방위산업체 외국인투자 협의 |

통합신공항은 군 공항 관련 3단계, 외국인투자는 국방부 협의 1단계만 발췌했습니다. 발췌로 빠진 중간 절차를 연결하지 않습니다. 시설·이전 관련 원본의 군 공항 사례와 적용범위를 각 상세 화면에 명시했습니다.

원본 기준일은 2026년 7~8월입니다. 원본 작성자의 조문 검증 기록을 이번 편집자의 현행 검증 결과로 표시하지 않습니다. 방위사업법 현행 표제(2026-09-11 시행, 법률 제21429호)를 확인했으나 세부 조문·절차의 개정 영향은 전수 검증하지 않았습니다. 실무 적용 시 법령과 담당기관 공고를 확인해야 합니다.

공식 확인 링크:
- 방위사업법: https://www.law.go.kr/LSW/lsInfoP.do?lsId=010107
- 국방ㆍ군사시설 사업에 관한 법률: https://www.law.go.kr/LSW/lsInfoP.do?lsId=000934
- 군사기지 및 군사시설 보호법: https://www.law.go.kr/LSW/lsInfoP.do?lsId=010596

## GitHub Pages 운영

이 저장소는 Settings → Pages → Deploy from a branch → `main` / `(root)` 설정으로 운영합니다.

1. `data/institutions.json` 또는 `template.html`을 수정합니다.
2. `python tools/build.py`로 `index.html`을 재생성하고 검증합니다.
3. 변경 파일을 `main`에 올리면 GitHub Pages가 자동으로 다시 배포합니다.
4. Actions의 `pages build and deployment` 결과와 공개 서비스 주소를 확인합니다.

현재 저장소에는 별도 Actions 배포 workflow가 필요하지 않습니다.

## 편집과 재생성

`data/institutions.json`을 수정한 후 `python tools/build.py`를 실행하면 단일 파일 `index.html`이 생성됩니다. UI 코드는 `template.html`에 있습니다.

`tools/prepare_data.py`는 상위 경로의 `reference-repo`에 있는 원본 저장소에서 최초 데이터를 추출하는 스크립트입니다. 일반 수정 시에는 실행할 필요가 없습니다. 이를 실행하면 편집한 데이터가 다시 생성되므로 먼저 변경분을 보관하십시오.

검증: Node.js와 Playwright(Chromium 설치)가 있는 환경에서 `node tools/verify.cjs`를 실행합니다.

## 출처·라이선스

원본 데이터와 구조의 저작권: Copyright (c) 2026 Hoseong Seo. MIT License를 함께 보존합니다. 국방·방위사업 범위로 선별·재구성한 비공식 참고자료입니다.

한국어 기본 글꼴이 없는 환경을 위해 Noto Sans CJK KR 글꼴의 필요한 문자만 포함한 WOFF를 내장했습니다. 글꼴은 SIL Open Font License 1.1을 따릅니다. 출처: https://github.com/notofonts/noto-cjk / `FONT-LICENSE.txt`.

GitHub Pages 설정 참고: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
