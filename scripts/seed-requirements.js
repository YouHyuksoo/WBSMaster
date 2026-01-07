/**
 * @file scripts/seed-requirements.js
 * @description 요구사항 테스트 데이터 삽입 스크립트 (요청자/담당자 포함)
 * 실행: node scripts/seed-requirements.js
 */

require('dotenv').config();
const { Client } = require('pg');
const { randomUUID } = require('crypto');

// 요구사항 상태 enum
const statuses = ['DRAFT', 'APPROVED', 'REJECTED', 'IMPLEMENTED'];

// 우선순위 enum
const priorities = ['MUST', 'SHOULD', 'COULD', 'WONT'];

// 카테고리 목록
const categories = ['인증/보안', 'UI/UX', 'API', '데이터베이스', '성능', '알림', '통합', '문서화'];

// 가짜 요구사항 데이터 생성
const fakeRequirements = [
  { title: '로그인 페이지 UI 개선', description: '로그인 폼 디자인을 최신 트렌드에 맞게 수정', category: 'UI/UX' },
  { title: '회원가입 이메일 인증 추가', description: '회원가입 시 이메일 인증 절차 도입', category: '인증/보안' },
  { title: '대시보드 차트 기능 구현', description: '프로젝트 진행률을 시각화하는 차트 추가', category: 'UI/UX' },
  { title: '다크모드 지원', description: '전체 애플리케이션에 다크모드 테마 적용', category: 'UI/UX' },
  { title: '알림 시스템 구축', description: '실시간 알림 기능 (웹소켓 기반)', category: '알림' },
  { title: '파일 업로드 기능', description: '프로젝트에 파일 첨부 기능 추가 (최대 10MB)', category: 'API' },
  { title: '검색 기능 고도화', description: '전체 텍스트 검색 및 필터링 기능 강화', category: 'API' },
  { title: '모바일 반응형 개선', description: '태블릿/모바일 환경에서의 UI 최적화', category: 'UI/UX' },
  { title: '권한 관리 시스템', description: '역할 기반 접근 제어(RBAC) 구현', category: '인증/보안' },
  { title: 'API 속도 개선', description: '데이터베이스 쿼리 최적화 및 캐싱 적용', category: '성능' },
  { title: '엑셀 내보내기 기능', description: '요구사항 목록을 Excel 파일로 다운로드', category: 'API' },
  { title: '일정 캘린더 뷰', description: '요구사항 마감일을 캘린더 형태로 시각화', category: 'UI/UX' },
  { title: '댓글 기능 추가', description: '요구사항별 댓글/토론 기능', category: 'API' },
  { title: '히스토리 추적', description: '요구사항 변경 이력 조회 기능', category: '데이터베이스' },
  { title: '대량 수정 기능', description: '여러 요구사항을 한 번에 수정하는 기능', category: 'API' },
  { title: 'Slack 연동', description: 'Slack 웹훅을 통한 알림 전송', category: '통합' },
  { title: '자동 백업 시스템', description: '매일 자동으로 데이터 백업', category: '데이터베이스' },
  { title: '사용자 활동 로그', description: '사용자별 활동 내역 기록 및 조회', category: '데이터베이스' },
  { title: '이중 인증(2FA)', description: 'OTP 기반 이중 인증 추가', category: '인증/보안' },
  { title: '성능 모니터링 대시보드', description: '시스템 성능 지표 실시간 모니터링', category: '성능' },
  { title: 'AI 요구사항 분석', description: 'AI를 활용한 요구사항 자동 분류 및 우선순위 제안', category: '통합' },
  { title: '다국어 지원', description: '영어, 일본어 등 다국어 UI 지원', category: 'UI/UX' },
];

// 가짜 사용자 데이터 (요청자/담당자용)
const fakeUsers = [
  { name: '김철수', email: 'kim@example.com' },
  { name: '이영희', email: 'lee@example.com' },
  { name: '박민수', email: 'park@example.com' },
  { name: '정수진', email: 'jung@example.com' },
  { name: '최동현', email: 'choi@example.com' },
];

async function main() {
  console.log('🔄 요구사항 테스트 데이터 삽입 시작...');

  const client = new Client({
    connectionString: process.env.DIRECT_URL
  });

  try {
    await client.connect();
    console.log('✅ 데이터베이스 연결 성공');

    // 1. 기존 사용자 조회
    let userResult = await client.query('SELECT id, name FROM public.users');
    let userIds = userResult.rows.map(u => u.id);

    // 2. 가짜 사용자 추가 (테스트용)
    if (userIds.length < 3) {
      console.log('📝 테스트 사용자 추가 중...');
      for (const user of fakeUsers) {
        const id = randomUUID();
        await client.query(`
          INSERT INTO public.users (id, email, name, role, "createdAt", "updatedAt")
          VALUES ($1, $2, $3, 'MEMBER', NOW(), NOW())
          ON CONFLICT (email) DO NOTHING
        `, [id, user.email, user.name]);
      }
      userResult = await client.query('SELECT id, name FROM public.users');
      userIds = userResult.rows.map(u => u.id);
      console.log(`✅ 사용자 ${userIds.length}명 준비 완료`);
    }

    // 3. 프로젝트가 있는지 확인, 없으면 생성
    let projectResult = await client.query('SELECT id FROM public.projects LIMIT 1');
    let projectId;

    if (projectResult.rows.length === 0) {
      const ownerId = userIds[0];
      const newProject = await client.query(`
        INSERT INTO public.projects (id, name, description, status, progress, "ownerId", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING id
      `, [randomUUID(), 'WBS 마스터 프로젝트', '테스트용 샘플 프로젝트입니다.', 'ACTIVE', 30, ownerId]);

      projectId = newProject.rows[0].id;
      console.log(`✅ 샘플 프로젝트 생성 완료 (ID: ${projectId})`);
    } else {
      projectId = projectResult.rows[0].id;
      console.log(`✅ 기존 프로젝트 사용 (ID: ${projectId})`);
    }

    // 4. 요구사항 삽입
    let insertedCount = 0;
    for (let i = 0; i < fakeRequirements.length; i++) {
      const req = fakeRequirements[i];
      const id = randomUUID();
      const code = `REQ-${String(i + 1).padStart(3, '0')}`; // REQ-001, REQ-002, ...
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const priority = priorities[Math.floor(Math.random() * priorities.length)];
      const isDelayed = Math.random() > 0.7; // 30% 확률로 지연

      // 요청자/담당자 랜덤 선택
      const requesterId = userIds[Math.floor(Math.random() * userIds.length)];
      const assigneeId = userIds[Math.floor(Math.random() * userIds.length)];

      // 요청일: 최근 30일 내 랜덤
      const requestDate = new Date();
      requestDate.setDate(requestDate.getDate() - Math.floor(Math.random() * 30));

      // 마감일: 요청일로부터 7~30일 후
      const dueDate = new Date(requestDate);
      dueDate.setDate(dueDate.getDate() + 7 + Math.floor(Math.random() * 23));

      await client.query(`
        INSERT INTO public.requirements (
          id, code, title, description, status, priority, category,
          "requestDate", "dueDate", "isDelayed", "projectId",
          "requesterId", "assigneeId", "createdAt", "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      `, [
        id, code, req.title, req.description, status, priority, req.category,
        requestDate, dueDate, isDelayed, projectId,
        requesterId, assigneeId
      ]);

      insertedCount++;
    }

    console.log(`✅ 요구사항 ${insertedCount}개 삽입 완료!`);
    console.log('🎉 모든 작업 완료!');

  } catch (error) {
    console.error('❌ 에러 발생:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

main();
