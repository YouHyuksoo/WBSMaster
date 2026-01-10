/**
 * @file scripts/update-avatars.mjs
 * @description
 * 사용자 아바타를 어벤져스 캐릭터로 업데이트하는 스크립트
 * 실행: node scripts/update-avatars.mjs
 */

import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

// 환경 변수 로드 (prisma가 읽기 전에)
config({ path: '.env.local' });

// Prisma Client 초기화 (환경변수에서 DATABASE_URL 자동 로드)
const prisma = new PrismaClient();

// 어벤져스 캐릭터 아바타 (DiceBear lorelei 스타일 - 귀여운 캐릭터)
const avengersAvatars = [
  { name: 'Iron Man', seed: 'tony-stark-ironman' },
  { name: 'Captain America', seed: 'steve-rogers-cap' },
  { name: 'Thor', seed: 'thor-odinson-asgard' },
  { name: 'Hulk', seed: 'bruce-banner-hulk' },
  { name: 'Black Widow', seed: 'natasha-romanoff' },
  { name: 'Hawkeye', seed: 'clint-barton-hawk' },
  { name: 'Spider-Man', seed: 'peter-parker-spidey' },
  { name: 'Black Panther', seed: 'tchalla-wakanda' },
  { name: 'Doctor Strange', seed: 'stephen-strange' },
  { name: 'Ant-Man', seed: 'scott-lang-antman' },
  { name: 'Scarlet Witch', seed: 'wanda-maximoff' },
  { name: 'Vision', seed: 'vision-avenger' },
];

// DiceBear 아바타 URL 생성 (lorelei 스타일)
function generateAvatarUrl(seed) {
  return `https://api.dicebear.com/7.x/lorelei/svg?seed=${seed}`;
}

async function main() {
  console.log('🦸 어벤져스 아바타 업데이트 스크립트 시작\n');
  console.log('사용자 목록 조회 중...');

  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, avatar: true }
  });

  console.log(`총 ${users.length}명의 사용자 발견\n`);

  if (users.length === 0) {
    console.log('업데이트할 사용자가 없습니다.');
    return;
  }

  // 각 사용자에게 무작위로 어벤져스 아바타 할당
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const avatar = avengersAvatars[i % avengersAvatars.length];
    const avatarUrl = generateAvatarUrl(avatar.seed);

    await prisma.user.update({
      where: { id: user.id },
      data: { avatar: avatarUrl }
    });

    console.log(`✓ ${user.name || user.email} → ${avatar.name} 아바타 적용`);
  }

  console.log('\n🎉 모든 사용자 아바타 업데이트 완료!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
