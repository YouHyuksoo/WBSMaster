# 미완료 작업 기록: 문서 소스 추적 검증

- 작성일: 2026-11-14
- 작성자: codex-docs-cleanup
- 현재 상태: 검증대기
- 작업 범위: 문서 정리 후 sources 및 verifiedCommit 확인

## 완료한 것

- 문서 위치·명명·manifest 및 확인 가능한 참조를 정리했다. 전체 결과는 `C:/Project/docs-cleanup-report.md`와 `C:/Project/docs-cleanup-progress.md`를 참조한다.

## 미완료 / 남은 것

| 문서 | 미확정 |
|---|---|
| `docs/design/list-page-style.md` | verifiedCommit 미확정 |
| `docs/design/overview.md` | sources 미확정, verifiedCommit 미확정 |
| `docs/guides/deployment.md` | verifiedCommit 미확정 |

## 변경 파일

- 위 문서의 위치·추적 필드 및 참조: 전체 계획 파일에서 원경로와 새경로를 확인한다.

## 검증 상태

- 실행함: 문서 구조·파일명·원본 해시·이동 경로 검사.
- 실행 못함: 각 문서 본문 전체와 소스 대조. 실제 소스 확인 없이 verifiedCommit을 채우지 않았다. 서버·DB는 실행하지 않았다.

## 중단 사유

- 명확한 소스 또는 소스 대조 커밋을 확인하지 못한 항목은 사용자의 지시에 따라 빈 값으로 남겼다.

## 다음 작업자가 바로 할 일

1. 현재 HEAD와 문서를 다시 읽고 설명 대상 소스를 확인한다.
2. 문서 전체와 소스를 대조한 뒤 확인된 sources와 verifiedCommit만 기록한다.

## 주의사항

- 기록형 원본, 고객 데이터, 다른 세션의 변경과 기존 협업 잠금을 보존한다.
