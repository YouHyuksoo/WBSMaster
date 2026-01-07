/**
 * @file scripts/reset-requirements.js
 * @description 기존 요구사항 데이터 삭제 스크립트
 * 실행: node scripts/reset-requirements.js
 */

require('dotenv').config();
const { Client } = require('pg');

async function main() {
  console.log('🗑️  기존 요구사항 데이터 삭제 시작...');

  const client = new Client({
    connectionString: process.env.DIRECT_URL
  });

  try {
    await client.connect();
    console.log('✅ 데이터베이스 연결 성공');

    // 기존 요구사항 삭제
    const result = await client.query('DELETE FROM public.requirements');
    console.log(`✅ ${result.rowCount}개 요구사항 삭제 완료`);

    console.log('🎉 완료!');
  } catch (error) {
    console.error('❌ 에러 발생:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

main();
