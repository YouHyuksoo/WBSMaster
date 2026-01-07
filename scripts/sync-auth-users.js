/**
 * @file scripts/sync-auth-users.js
 * @description Supabase Auth 사용자를 public.users 테이블과 동기화하는 스크립트
 * 실행: node scripts/sync-auth-users.js
 */

require('dotenv').config();
const { Client } = require('pg');

async function main() {
  console.log('🔄 Supabase Auth 사용자 동기화 시작...');

  // DIRECT_URL 사용 (Pooler는 DDL 명령 제한 있음)
  const client = new Client({
    connectionString: process.env.DIRECT_URL
  });

  try {
    await client.connect();
    console.log('✅ 데이터베이스 연결 성공');

    // 1. 트리거 함수 생성 (Prisma는 camelCase 컬럼명 사용)
    await client.query(`
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO public.users (id, email, name, avatar, role, "createdAt", "updatedAt")
        VALUES (
          NEW.id,
          NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
          NEW.raw_user_meta_data->>'avatar_url',
          'MEMBER',
          NOW(),
          NOW()
        );
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);
    console.log('✅ 트리거 함수 생성 완료');

    // 2. 기존 트리거 삭제
    await client.query(`
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    `);
    console.log('✅ 기존 트리거 삭제 완료');

    // 3. 새 트리거 생성
    await client.query(`
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    `);
    console.log('✅ 새 트리거 생성 완료');

    // 4. 기존 사용자 동기화 (Prisma는 camelCase 컬럼명 사용)
    const result = await client.query(`
      INSERT INTO public.users (id, email, name, avatar, role, "createdAt", "updatedAt")
      SELECT
        id,
        email,
        COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name'),
        raw_user_meta_data->>'avatar_url',
        'MEMBER',
        NOW(),
        NOW()
      FROM auth.users
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log(`✅ 기존 사용자 동기화 완료 (${result.rowCount}명 추가)`);

    console.log('🎉 모든 작업 완료!');
  } catch (error) {
    console.error('❌ 에러 발생:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

main();
