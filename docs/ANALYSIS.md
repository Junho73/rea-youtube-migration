# REA 분석 기록: YouTube 웹 (검색·무한 스크롤)

- 분석일: 2026-10-31
- 도구: REA (rea-agents) 6.8.0, Node.js 24.22.2, macOS (M1, 8GB)
- 대상: youtube.com 메인 + 검색 결과 페이지 (비로그인, 크롬 시크릿 창)
- 수집 방식: 사람이 직접 브라우징한 뒤 Chrome DevTools에서 HAR(sanitized)로 저장 → REA가 **오프라인**으로 분석
  (REA가 YouTube 서버에 직접 접속하지 않음. 녹화된 URL을 다시 요청하지 않음)

## 1. 실행한 명령

```bash
# 1) 네트워크 캡처 분석 (Evidence ev_4efacff3…)
rea inspect-web-network-capture youtube_api.har har --detail summary --evidence_output evidence_network

# 2) 캡처에 들어 있던 스크립트 정적 분석 (Evidence ev_02f3b594…)
rea analyze-javascript-application scripts --artifact-format directory \
  --source-paths-json selected.json --detail summary --evidence_output evidence_js
```

## 2. 전처리 (REA 입력 조건 맞추기)

| 문제 | 원인 | 조치 |
|---|---|---|
| 원본 HAR 82.8MB | 이미지·CSS·영상 조각 포함, REA 입력 한도 32MB | 이미지/폰트/오디오/영상/CSS 제외, JS 본문은 별도 폴더로 분리 → 11.1MB |
| `pageTimings.onContentLoad` null | Chrome HAR 출력 | -1로 치환 (HAR 규격값) |
| `serverIPAddress` 빈 문자열 | Chrome HAR 출력 | 필드 제거 |
| `timings.blocked` 음수 | Chrome HAR 출력 | 선택 항목 제거, 필수 항목 0 |
| player `base.js` 분석 300초 초과 | 단일 파일이 매우 큼 | 분석 범위에서 제외 (플레이어는 이번 범위 밖) |

## 3. 네트워크 분석 결과 (152건 전수, coverage complete)

- 요청 유형: fetch 66, xhr 32, script 29, preflight 11, image 6, document 5
- 호스트: www.youtube.com 106, suggestqueries-clients6.youtube.com 22, googlevideo.com 10, doubleclick.net 5 …
- REA 레다크션: 인증 헤더·쿠키 없음 (sanitized HAR + 비로그인)

### 내부 API (`/youtubei/v1/*`, 모두 POST + JSON)

| API | 호출 | 요청 키 | 의미 |
|---|---|---|---|
| search | 3 | 첫 호출 `query`, 이후 `continuation` | 검색 + 토큰 기반 페이지네이션 |
| player | 10 | `videoId`, `playbackContext` | 썸네일 hover 미리보기 재생 정보 |
| log_event | 8 | `events` | 사용 로그 |
| guide | 1 | `context` | 왼쪽 메뉴 |
| feedback, notification_registration | 각 1 | | |

모든 요청 본문에 `context.client` (clientName, clientVersion, hl, gl, 화면 크기, OS 등 25+ 필드)가 공통으로 들어감.

### 확인된 설계 패턴

1. **토큰 기반 무한 스크롤**: 첫 검색 응답 끝의 `continuationItemRenderer`가 다음 토큰을 갖고, 스크롤 시 `{continuation: 토큰}`만 보내 `appendContinuationItemsAction`으로 항목을 덧붙임 (2회 관측, 각 26개 섹션 항목).
2. **서버 주도 UI (Server-Driven UI)**: 응답이 데이터가 아니라 "어떤 컴포넌트로 그릴지"를 키 이름(`videoRenderer`, `shortsLockupViewModel`, `searchFilterRenderer` …)으로 내려보냄. `*Renderer` → `*ViewModel` 신규 형식이 혼재(전환 중으로 추정).
3. **자동완성**: 한 검색어 입력에 suggest 요청 11건(+CORS preflight 11건) = 키 입력마다 호출.
4. **비로그인 홈 피드 비어 있음**: 홈 HTML의 초기 데이터에 `feedNudgeRenderer`(검색 유도)만 있고 추천 영상 목록 없음.
5. **SSR + SPA 혼합**: 첫 화면은 HTML 안 `ytInitialData`로, 이후 화면은 fetch로 전환.

## 4. 스크립트 정적 분석 결과

- 입력 24개 파일 / 20.3MB 텍스트, AST 노드 221,595개 방문, 파싱 실패 0
- 애플리케이션 그래프: 노드 420 (모듈 참조 365, 엔드포인트 후보 19, 소스맵 3) / 간선 463 (imports 382)
- 의미 그래프: 노드 52,410 / 관계 51,913 (data-flow 34,795, call-flow 8,119, closure 5,879)
- 엔드포인트 후보 예: 인증 쿠키 이름(SAPISID, __Secure-1PAPISID), 원격 재생 설정 키 → 문자열 후보라 실제 엔드포인트가 아닌 것이 섞임
- 한계: 메인 번들 2개는 1GB 힙 한도 초과로 의미 분석 미완료, 미확인(unknown) 23,136건. 난독화된 대형 번들에서는 정적 분석보다 **네트워크 분석이 훨씬 유용**했음.

## 5. 마이그레이션 설계 (클린룸)

| 관측 (원본) | 재구현 (이 저장소) |
|---|---|
| `query` → 첫 페이지, `continuation` → 다음 페이지 | `search(query)`, `next(token)` (`src/api/mockServer.js`) |
| 키 이름으로 컴포넌트 결정 | `type` → 컴포넌트 레지스트리 (`ItemRenderer.jsx`) |
| 스크롤 끝 감지 후 토큰 요청 | `IntersectionObserver` 센티넬 (`App.jsx`) |
| 키 입력마다 suggest 호출 | 200ms 디바운스 + `<datalist>` (`SearchBar.jsx`) |
| 검색 결과 중간 쇼츠 선반 | `shorts_shelf` 타입 (`ShortsShelf.jsx`) |

YouTube 코드·데이터·스키마 이름은 사용하지 않았고, 관측한 **동작 패턴만** 우리 코드로 새로 구현함.
