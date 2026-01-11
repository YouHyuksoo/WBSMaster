import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const units = await prisma.customerRequirement.groupBy({
    by: ['businessUnit'],
    _count: { businessUnit: true },
    orderBy: { _count: { businessUnit: 'desc' } }
  });
  console.log('=== 실제 등록된 사업부 목록 ===');
  units.forEach(u => {
    console.log(`${u.businessUnit}: ${u._count.businessUnit}건`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
