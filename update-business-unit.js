const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.processVerificationItem.updateMany({
      data: {
        businessUnit: 'V_IVI',
      },
    });
    
    console.log(`✅ ${result.count}개 항목의 businessUnit을 V_IVI로 업데이트했습니다.`);
  } catch (error) {
    console.error('❌ 업데이트 실패:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
