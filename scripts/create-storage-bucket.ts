/**
 * @file scripts/create-storage-bucket.ts
 * @description
 * Supabase Storage에 avatars 버킷을 생성하는 스크립트
 * 실행: npx tsx scripts/create-storage-bucket.ts
 */

import { Pool } from "pg";
import * as dotenv from "dotenv";

// .env.local 파일 로드
dotenv.config({ path: ".env.local" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const client = await pool.connect();

  try {
    console.log("Supabase Storage 버킷 생성 시작...\n");

    // 버킷 존재 여부 확인
    const checkResult = await client.query(
      `SELECT id FROM storage.buckets WHERE id = 'avatars'`
    );

    if (checkResult.rows.length > 0) {
      console.log("✅ 'avatars' 버킷이 이미 존재합니다.");
    } else {
      // 버킷 생성
      await client.query(`
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
          'avatars',
          'avatars',
          true,
          5242880,
          ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
        )
      `);
      console.log("✅ 'avatars' 버킷 생성 완료!");
    }

    // 기존 정책 확인
    const policyCheck = await client.query(`
      SELECT policyname FROM pg_policies
      WHERE tablename = 'objects' AND schemaname = 'storage'
      AND policyname LIKE '%avatars%'
    `);

    if (policyCheck.rows.length > 0) {
      console.log("✅ 스토리지 정책이 이미 존재합니다.");
      console.log("   기존 정책:", policyCheck.rows.map(r => r.policyname).join(", "));
    } else {
      // SELECT 정책 (공개 읽기)
      await client.query(`
        CREATE POLICY "avatars_public_read"
        ON storage.objects FOR SELECT
        TO public
        USING (bucket_id = 'avatars')
      `);
      console.log("✅ 공개 읽기 정책 생성 완료!");

      // INSERT 정책 (인증된 사용자 업로드)
      await client.query(`
        CREATE POLICY "avatars_authenticated_insert"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'avatars')
      `);
      console.log("✅ 인증 업로드 정책 생성 완료!");

      // UPDATE 정책 (본인 파일 수정)
      await client.query(`
        CREATE POLICY "avatars_authenticated_update"
        ON storage.objects FOR UPDATE
        TO authenticated
        USING (bucket_id = 'avatars')
        WITH CHECK (bucket_id = 'avatars')
      `);
      console.log("✅ 파일 수정 정책 생성 완료!");

      // DELETE 정책 (본인 파일 삭제)
      await client.query(`
        CREATE POLICY "avatars_authenticated_delete"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (bucket_id = 'avatars')
      `);
      console.log("✅ 파일 삭제 정책 생성 완료!");
    }

    console.log("\n🎉 모든 설정 완료! 이제 이미지 업로드가 가능합니다.");

  } catch (error) {
    console.error("❌ 오류 발생:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
