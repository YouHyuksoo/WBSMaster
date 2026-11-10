# WBS Master

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

프로젝트 담당자가 프로젝트별 업무를 관리한다. 사용자 정의는 2026-11-09 대화에서 확인했다.

## Product Purpose

작업 분류 체계(WBS), 일정, 진척, 이슈, 요구사항을 한 웹 업무 도구에서 관리한다.

## Capabilities and Constraints

- Next.js 16, React 19, Prisma 7, PostgreSQL을 사용하는 기존 프로젝트다.
- 대부분의 업무 데이터는 프로젝트 단위로 조회한다. 인증과 프로젝트 권한을 유지한다.
- 파일 업로드는 서버 로컬 디스크를 사용한다.
- 이번 Live 대상은 기존 `/dashboard`이며 현재 동작과 실제 업무 데이터를 보존한다.

## Brand Commitments

기존 WBS Master 이름, 한국어 업무 용어, 현재 디자인을 유지한다. 사용자는 프로젝트 카드의 낮은 높이와 입체적인 그림자를 요청했다.

## Evidence on Hand

`AGENTS.md`, `DESIGN_GUIDELINE.md`, `src/app/globals.css`, `src/app/dashboard/page.tsx`와 카드 컴포넌트. 배포 상태나 성능 수치를 이 기록에서 주장하지 않는다.

## Product Principles

- 업무 정보를 빠르게 훑어볼 수 있게 한다.
- 실제 데이터와 기능을 유지하면서 필요한 범위만 개선한다.
- 불필요한 설명으로 업무 공간을 늘리지 않는다.
