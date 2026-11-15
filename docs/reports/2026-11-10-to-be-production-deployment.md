# TO-BE 설계 운영 반영 기록

- 요청: 로컬 TO-BE 화면·기능과 등록 데이터를 운영에 반영.
- 운영: 인벤토리 `jisung-idc`, `D:/Project/WBSMaster`, `https://wbs.jisheng.co.kr/dashboard/to-be`.
- 기준 HEAD: `bb35deaa38e656ac92582c9f1429ea9096787073` (로컬·운영 동일).
- 결과: TO-BE 관련 로컬 미커밋 파일 16개를 직접 반영하고 운영 빌드·재시작 완료. 채팅 등 다른 미커밋 작업은 제외.
- 검증 시 빌드 ID: `ZDcQu7vIxjzyARdpMTheo`, PM2 `wbs-master` online.

## 데이터와 구조

- 로컬: 총괄 1건, 업무·AS-IS 연결·개선 매핑·프로세스 각각 0건.
- 운영: 총괄 1건, 업무 0건. 복사할 업무 데이터가 없어 기존 총괄 ID와 내용을 유지했다.
- `20261110230000_to_be_unit_design/migration.sql`을 트랜잭션으로 적용: `ToBeFixResult`, `to_be_issue_fixes`, `to_be_processes` 추가.
- 적용 전후 기존 테이블 71개의 행 수 동일. 최종 조회에서 기존 TO-BE 데이터 내용도 백업과 동일.
- 운영 AS-IS 업무 43건 유지. 실제 업무 데이터의 삭제·덮어쓰기는 하지 않았다.

## 검증

- 로컬 TO-BE 단위 테스트: 2개 파일, 9개 테스트 통과. DB 모의 객체 사용.
- 운영 `npm run build`: Prisma Client 생성, 컴파일, TypeScript 검사, 페이지 생성 통과.
- 배포 파일 16개의 SHA-256이 전송 원본 및 최종 로컬 파일과 일치.
- EGO Lite에서 운영 총괄표의 0건 상태와 업무 추가 창·AS-IS 후보 표시 확인.
- 인증된 목록 API: HTTP 200, 업무 0건, AS-IS 후보 43건, SFR 후보 63건.
- 존재하지 않는 업무의 상세 조회 API: HTTP 404와 `TO-BE 업무를 찾을 수 없습니다.` 확인.
- 빌드 결과에 `/dashboard/to-be/[id]`, 상세 조회·설계 저장 API 경로 포함 확인.

## 미검증 및 다음 배포 주의

- 등록 업무가 없어 실제 상세 설계 화면의 데이터 표시와 저장·재조회는 미검증. 운영에 시험 데이터를 만들지 않았다. 실제 업무 등록 후 개요·개선 매핑·프로세스·흐름도 저장을 확인해야 한다.
- 커밋·푸시 요청이 없어 둘 다 수행하지 않았다. 현재는 운영에 직접 반영한 상태다. 다음 GitHub Actions 배포의 `git reset --hard origin/main`가 수정 파일을 되돌릴 수 있으므로, 다음 배포 전에 TO-BE 관련 변경을 커밋·푸시해야 한다.
- Node.js의 `module.register()` 사용 중단 예정 경고는 출력됐으나 두 번째 빌드는 종료 코드 0으로 완료됐다.

## 백업·증거

- 운영 백업: `D:/Project/WBSMaster-Backups/tobe-deploy-20261110/`.
- `source-before/`: 기존 소스, `next-before/`: 기존 정상 빌드.
- `db-before.json`: 적용 전 TO-BE 데이터와 전체 행 수, `db-result.json`: DB 반영 증거.
- `payload/manifest.json`: 파일별 SHA-256, `deployment-result.json`: 최종 성공, `verification.json`: 파일·DB·서비스 최종 검증.
- `build.stdout.log`, `build.stderr.log`: 최종 빌드 로그. `deploy.stderr.log`는 첫 시도의 복구 오류 기록이며 최종 빌드 오류가 아니다.
- 로컬 작업 스크립트·전송 명세: `backups/tobe-deploy-20261110/` (git 제외).

## 첫 배포 실패와 복구

첫 빌드는 이번 작업에서 만든 소스·빌드 백업이 프로젝트의 `**/*.ts` 검사에 포함되어 실패했다. 소스와 이전 빌드를 복원한 뒤 Prisma 재생성의 npm 안내 문구를 PowerShell이 오류로 처리해 자동 재시작이 중단됐다. WBS를 재시작하고 운영 화면·API HTTP 200을 확인한 다음, 백업을 프로젝트 밖으로 옮겨 재배포했다. 두 번째 배포는 성공했다.

의심: 배포 백업은 있지만 애플리케이션 타입 검사 범위와의 격리가 없다. 복구용 외부 명령은 있지만 표준 오류 안내와 종료 코드의 구분이 없다.

프로브: TypeScript 설정을 직접 해석해 이번 작업의 백업 파일 포함 여부를 검사하고, 배포 스크립트의 외부 명령·출력 처리도 대조했다. 원래 백업 경로의 파일 포함과 첫 빌드 오류를 확인했다.

결과: 소스·배포본·이전 빌드 백업을 모두 프로젝트 밖으로 이동. `src/app/api/backups` 등 기존 기능 파일은 이동 대상이 아니며 그대로 유지. 복구의 Prisma 명령도 `Start-Process`의 종료 코드로 판정하도록 수정.

재발방지: 배포 스크립트에 백업 경로가 프로젝트 하위이면 중단하는 검사와, 이번 배포 백업이 TypeScript 입력에 포함되면 중단하는 검사를 추가했다. 두 번째 시도에서 포함 파일 0개 및 전체 빌드 성공을 확인했다.
