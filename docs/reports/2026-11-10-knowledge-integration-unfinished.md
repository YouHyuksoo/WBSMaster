# 채팅 지식관리 연결 구현·미완료 기록

- 기준: WBS HEAD `7f2c73c`, 지식관리 HEAD `9c94eef`. 기존 미커밋 변경은 유지했다.
- 상태: **로컬 코드 구현, 단위 검증 통과. DB 적용·운영 배포·실제 검색 확인 미완료.**
- 원래 합의: 기존 지식관리 재사용, 업무 변경 즉시 반영, 실패 큐 보관, 주기 스케줄 없음.

## 이번 변경

1. `src/lib/chat-tools/knowledge.ts`: `search_knowledge` 실제 등록. 서버가 프로젝트를 고정하며 임베딩·관계 검색 결과와 동기화 대기/장애를 전달한다.
2. `src/lib/knowledge/`: 서버 설정, HTTP 계약, LISTEN/NOTIFY 전송 작업자, 33개 모델의 수집 whitelist. 비밀번호·API 설정·개인 문서는 제외한다. 문서함은 메타데이터만 수집하며 첨부 파일 본문 수집은 하지 않는다.
3. `prisma/migrations/20261110000000_knowledge_outbox/migration.sql`: 원본 변경과 대기열 기록이 같은 트랜잭션에 들어간다. 직접 SQL·중첩 변경·import도 적용된다. 성공한 INSERT/UPDATE 뒤에 기록하고, 부모 DELETE 전 하위 자료의 프로젝트를 보존한다.
4. `src/instrumentation.ts`: 설정된 경우 시작 시 대기열 복구, 커밋 알림 수신. 실패할 때만 지연 재시도하며 주기 cron은 없다. 초기 전송으로 웹 서버 기동을 막지 않는다.
5. `scripts/knowledge-sync.ts`: 트리거 설치, 프로젝트 초기 색인, 수동 재전송. 기존 자료를 수정하거나 삭제하지 않는다.
6. `C:/Project/ai-knowledge-platform/app/business_*`: 관리자 인증이 필요한 `/api/business/records`, `/api/business/search`. 기존 Ollama와 Neo4j 연결을 재사용한다. 업무 레코드/관계/벡터는 Neo4j의 별도 BusinessRecord 레이블과 BusinessTenant 범위로 격리한다. 원본 PostgreSQL에 직접 접속하지 않는다.
7. 원본 이벤트의 단조 증가 revision, 중복 수집 확인, 삭제 tombstone, 프로젝트 삭제 후 후속 이벤트 거절, 동일 트랜잭션 그래프·벡터 저장을 구현했다.

## 검증 결과

- WBS 채팅·연동 관련 Vitest: **143 통과**, 전용 PostgreSQL 통합 테스트 **5 미실행**.
- 지식관리 관련 pytest: **81 통과** (업무 수집 15건 + 기존 AI Context/벡터/문서 검색 회귀).
- `npx prisma generate`, `npx tsc --noEmit`: 통과.
- 신규 Python 모듈 `compileall`: 통과.
- 테스트는 HTTP/임베딩/Neo4j 대역을 사용했다. 실제 Neo4j의 Cypher 실행·Ollama 임베딩 저장·채팅의 실제 모델 도구 호출을 검증한 것으로 해석하지 않는다.
- 실제 PostgreSQL 검증 시도: `.env.local`의 `127.0.0.1:55432/wbsmaster` 계정으로 별도 `wbsmaster_knowledge_eval_*` 생성 요청이 **42501(권한 부족)**로 거절됐다. 생성된 임시 DB는 없고 기존 업무 자료는 변경하지 않았다.
- 첫 pytest 실행의 기존 `.pytest_cache` 접근 거부 경고는 cache plugin 없이 재실행해 제거했다.

## 운영 읽기 확인

- 인벤토리 `jisung-idc`로 SSH 연결 확인. 운영 파일·설정·서비스는 변경하지 않았다.
- `AIKnowledgePlatform` 서비스 Running. `127.0.0.1:8787`, Ollama 11434, Neo4j 7687 리슨 확인.
- 운영 WBS는 `D:/Project/WBSMaster`, PostgreSQL `127.0.0.1:5432/wbsmaster`. 해당 앱 계정도 DB 생성 권한이 없다.
- 로컬·운영 WBS 모두 `KNOWLEDGE_API_URL`, `KNOWLEDGE_SOURCE_ID`, `KNOWLEDGE_API_KEY` 미설정.
- 지식관리 운영 `app/main.py` 원본 SHA256: `de83bd6c7c7d79fa60048b78074593a28f77b9b8f268ceb19eca53bd77cb533c`.
- `.knowledge-deploy/20261110/manifest.json`에 신규 모듈 4개와 운영 main.py 최소 수정 후보의 SHA256을 기록했다. 원격 main.py는 전체 로컬 버전으로 덮지 않고 import 3줄과 라우터 등록 1곳만 추가하도록 후보를 준비했다. **업로드는 하지 않았다.**

## 남은 작업과 재개 순서

1. 관리자에게 테스트 전용 DB를 받거나 기존 DB의 별도 격리 스키마 사용을 승인받아 실제 PostgreSQL 통합 테스트를 실행한다. `node scripts/verify-knowledge-integration.mjs --schema` 후보를 준비했으며, 승인 전에는 실행하지 않았다. 기존 업무 테이블에는 쓰지 않고 테스트가 만든 스키마만 제거한다.
2. 운영 지식관리의 실제 `KNOWLEDGE_ADMIN_KEY` 설정 경로를 값 노출 없이 확인한다. WBS 전용 영구 source ID를 정하고 ignored 환경 파일에 연결 설정을 넣는다. 로컬에서 8787로 바로 접근할 수 있다고 가정하지 않는다(운영은 loopback 리슨).
3. 배포 직전 운영 main.py 해시를 다시 확인하고 후보와 비교한다. `remotessh` 스킬의 업로드 전 승인·서비스 중지/재시작 승인 절차에 따라 진행한다.
4. 운영 지식관리 파일 백업 → 신규 모듈과 최소 main.py 변경 반영 → Python 검사 → 서비스 재시작 → 상태/파일 해시 확인.
5. WBS 코드·생성 Prisma Client·환경 설정 반영, 대기열 트리거 설치. 커밋/push는 별도 지시가 필요하다. 기존 Actions 자동배포를 무단으로 트리거하지 않는다.
6. 프로젝트 초기 backfill → 실제 전송 → Neo4j record/vector/관계 read-back → 의미 검색·프로젝트 격리·삭제·장애 복구 확인 → 실제 채팅 도구 호출 확인.
7. 웹 서버 재시작과 모델 호출이 필요한 검증은 승인 범위 안에서 실행한다. 테스트 목적으로 실제 업무 자료를 생성·삭제하지 않는다.

## 의심 / 프로브 / 결과 / 재발방지

- 의심: 변경 감시는 있어도 성공 여부·부모 삭제 시점을 구분하지 않으면 잘못된 수집 이벤트 또는 하위 삭제 누락이 생긴다.
- 프로브: 기존 첫 초안의 `BEFORE INSERT OR UPDATE OR DELETE`, 부모 SELECT로만 scope를 찾는 경로와 33개 대상 모델의 직접·간접 프로젝트 경로를 대조했다. 원래 초안에서 두 패턴이 잡혔다.
- 결과: INSERT/UPDATE는 AFTER, DELETE는 BEFORE로 분리하고 부모 삭제·프로젝트 이동 시 하위 자료를 선기록하도록 같은 트리거 유형 전체를 수정했다.
- 재발방지: 구조와 실제 PostgreSQL 통합 테스트(롤백·커밋 알림·연쇄 삭제·프로젝트 이동·ON CONFLICT·재전송)를 추가했다. 파일 계약 검사는 통과했지만, 실제 DB 생성 권한이 없어 원래 초안에 대한 DB RED 재현과 수정 후 GREEN 확인은 미완료다.
