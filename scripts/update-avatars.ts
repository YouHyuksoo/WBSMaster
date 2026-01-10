/**
 * @file scripts/update-avatars.ts
 * @description
 * 사용자 아바타를 어벤져스 캐릭터로 업데이트하는 스크립트
 * 실행: npx tsx scripts/update-avatars.ts
 */

// 환경 변수 로드
import { config } from 'dotenv';
config({ path: '.env.local' });

import { prisma } from '../src/lib/prisma';

// 어벤져스 캐릭터 아바타 URL (DiceBear superhero 스타일 사용)
const avengersAvatars = [
  { name: 'Iron Man', seed: 'ironman', color: 'b91c1c' },
  { name: 'Captain America', seed: 'captainamerica', color: '1d4ed8' },
  { name: 'Thor', seed: 'thor', color: '7c3aed' },
  { name: 'Hulk', seed: 'hulk', color: '15803d' },
  { name: 'Black Widow', seed: 'blackwidow', color: '171717' },
  { name: 'Hawkeye', seed: 'hawkeye', color: '7c2d12' },
  { name: 'Spider-Man', seed: 'spiderman', color: 'dc2626' },
  { name: 'Black Panther', seed: 'blackpanther', color: '1e1b4b' },
  { name: 'Doctor Strange', seed: 'doctorstrange', color: '9333ea' },
  { name: 'Ant-Man', seed: 'antman', color: 'b91c1c' },
  { name: 'Scarlet Witch', seed: 'scarletwitch', color: 'be123c' },
  { name: 'Vision', seed: 'vision', color: '65a30d' },
];

// DiceBear 아바타 URL 생성 (bottts 스타일 - 로봇 느낌)
function generateAvatarUrl(seed: string, color: string): string {
  return `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${seed}&backgroundColor=${color}`;
}

async function main() {
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
    const avatarUrl = generateAvatarUrl(avatar.seed, avatar.color);

    await prisma.user.update({
      where: { id: user.id },
      data: { avatar: avatarUrl }
    });

    console.log(`✓ ${user.name || user.email} → ${avatar.name} 아바타 적용`);
  }

  console.log('\n모든 사용자 아바타 업데이트 완료!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
