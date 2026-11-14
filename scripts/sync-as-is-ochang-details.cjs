/**
 * @file scripts/sync-as-is-ochang-details.cjs
 * @description 검증한 오창 AS-IS 상세 배치를 운영 DB에 보존·추가 동기화합니다.
 * 초보자 가이드:
 * - 로컬: node scripts/sync-as-is-ochang-details.cjs --verify-local
 * - 운영: 앱 밖 백업 폴더에 이 파일과 입력 JSON을 두고 --production으로 먼저 대조합니다.
 * - 운영 --apply는 직전 대조 백업 해시가 현재 DB와 같은 경우에만 추가합니다.
 * - 기존 항목·다른 배치·흐름도 충돌은 자동 덮어쓰기하지 않고 중단합니다.
 */
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const production = process.argv.includes('--production');
const local = process.argv.includes('--verify-local');
const apply = process.argv.includes('--apply');
if (production === local || (apply && !production)) throw new Error('대상 모드를 정확하게 지정하세요.');
const root = production ? 'D:/Project/WBSMaster' : path.resolve(__dirname, '..');
const req = createRequire(path.join(root, 'package.json'));
const { PrismaClient } = req('@prisma/client');
const { PrismaPg } = req('@prisma/adapter-pg');
const { Pool } = req('pg');
const sections = ['processDefinitions','flowChartDetails','responsibilities','interviews','issues',
  'documents','documentAnalyses','functions','screens','interfaces','dataModels','codeDefinitions'];
const includeUnit = Object.fromEntries(sections.map(k => [k,{orderBy:{id:'asc'}}]));
const include = { items:{orderBy:{id:'asc'},include:{unitAnalysis:{include:includeUnit}}} };
// PostgreSQL JSONB는 객체 키 순서를 바꾸므로 배열 순서는 유지하고 객체 키만 정렬한다.
const canonical = x => Array.isArray(x) ? x.map(canonical) :
  x && typeof x === 'object' && !(x instanceof Date) ?
    Object.fromEntries(Object.keys(x).sort().map(k => [k,canonical(x[k])])) : x;
const hash = x => crypto.createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(canonical(x))).digest('hex');
let prisma, pool;
const sameRow = (actual, expected) => Object.entries(expected).every(([k,v]) => JSON.stringify(actual[k]) === JSON.stringify(v));

async function main() {
  const env = req('dotenv').parse(await fs.readFile(path.join(root,'.env.local')));
  const url = new URL(env.DATABASE_URL);
  if (!['127.0.0.1','localhost'].includes(url.hostname) || url.port !== (production?'5432':'55432') || url.pathname !== '/wbsmaster') {
    throw new Error('승인된 대상 DB와 다릅니다.');
  }
  if (production && path.resolve(__dirname).toLowerCase().startsWith(path.resolve(root).toLowerCase()+path.sep)) {
    throw new Error('운영 백업과 실행 파일은 앱 폴더 밖에 두세요.');
  }
  const raw = await fs.readFile(path.join(__dirname,'as-is-ochang-details.json'),'utf8');
  const data = JSON.parse(raw);
  const payloadHash = hash(raw);
  pool = new Pool({connectionString:env.DATABASE_URL});
  prisma = new PrismaClient({adapter:new PrismaPg(pool)});
  const projects = await prisma.project.findMany({where:{name:data.projectName},select:{id:true,name:true}});
  if (projects.length!==1 || projects[0].id!=='38f0613b-3048-48c2-9354-b1dc6c9f1a7d') throw new Error('대상 프로젝트 불일치');
  const where={projectId_businessUnit:{projectId:projects[0].id,businessUnit:'POLE'}};
  const before=await prisma.asIsOverview.findUnique({where,include});
  if (!before || before.items.length!==43) throw new Error('총괄 43건 조건 불일치');
  const expected={}, present={}, conflicts=[];
  for(const key of sections){expected[key]=0;present[key]=0;}
  for(const u of data.units) {
    const item=before.items.find(i=>i.asIsManagementNo===u.managementNo);
    if(!item)throw new Error('관리번호 없음: '+u.managementNo);
    const a=item.unitAnalysis;
    for(const k of sections) {
      const rows=u[k]||[], current=a?.[k]||[];
      expected[k]+=rows.length;
      if(rows.length && current.some(r=>!r.remarks?.includes(data.batch))) conflicts.push(u.managementNo+'/'+k+'/기존 다른 자료');
      const batch=current.filter(r=>r.remarks?.includes(data.batch));
      present[k]+=batch.length;
      if(batch.length && (batch.length!==rows.length || rows.some(r=>!batch.some(c=>sameRow(c,r))))) conflicts.push(u.managementNo+'/'+k+'/배치 내용 다름');
      if(rows.some(r=>!r.remarks?.includes(data.batch)||!r.remarks.includes('출처:')))throw new Error('출처 누락');
    }
    if(u.flowChartData && a?.flowChartData?.nodes?.length && hash(a.flowChartData)!==hash(u.flowChartData))conflicts.push(u.managementNo+'/흐름도 충돌');
  }
  const existingTotal=Object.values(present).reduce((a,b)=>a+b,0);
  const desiredTotal=Object.values(expected).reduce((a,b)=>a+b,0);
  if(existingTotal && existingTotal!==desiredTotal)conflicts.push('배치 일부만 존재');
  const summary={target:`${url.hostname}:${url.port}${url.pathname}`,project:projects[0],payloadHash,
    overviewItems:before.items.length,unitAnalyses:before.items.filter(i=>i.unitAnalysis).length,
    expected,present,flows:data.units.filter(u=>u.flowChartData).length,conflicts};
  console.log(JSON.stringify(summary,null,2));
  if(conflicts.length)throw new Error('충돌이 있어 자동 동기화를 중단합니다.');
  if(local) {
    if(existingTotal!==desiredTotal)throw new Error('로컬 상세가 입력 자료와 다름');
    for(const u of data.units)if(u.flowChartData && hash(before.items.find(i=>i.asIsManagementNo===u.managementNo).unitAnalysis.flowChartData)!==hash(u.flowChartData))throw new Error('로컬 흐름도 불일치');
    console.log('LOCAL_PAYLOAD_VERIFIED');return;
  }
  if(existingTotal===desiredTotal){console.log('ALREADY_SYNCHRONIZED');return;}
  if(!apply) {
    await fs.writeFile(path.join(__dirname,'before.json'),JSON.stringify(before,null,2),'utf8');
    await fs.writeFile(path.join(__dirname,'preflight.json'),JSON.stringify({...summary,beforeHash:hash(before)},null,2),'utf8');
    console.log('PRODUCTION_BACKUP_READY');return;
  }
  const preflight=JSON.parse(await fs.readFile(path.join(__dirname,'preflight.json'),'utf8'));
  if(preflight.payloadHash!==payloadHash || preflight.beforeHash!==hash(before))throw new Error('대조 이후 원본 또는 운영 데이터 변경');
  await prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${projects[0].id}))`;
    if(hash(await tx.asIsOverview.findUnique({where,include}))!==preflight.beforeHash)throw new Error('동시 변경');
    for(const u of data.units) {
      const item=before.items.find(i=>i.asIsManagementNo===u.managementNo);
      const additions={};
      for(const k of sections)if(u[k]?.length)additions[k]={create:u[k]};
      if(u.flowChartData && !item.unitAnalysis?.flowChartData?.nodes?.length)additions.flowChartData=u.flowChartData;
      await tx.asIsUnitAnalysis.upsert({where:{overviewItemId:item.id},update:additions,
        create:{...additions,overviewItem:{connect:{id:item.id}}}});
    }
    const after=await tx.asIsOverview.findUniqueOrThrow({where,include});
    const {items:oldItems,...oldOverview}=before,{items:newItems,...newOverview}=after;
    if(hash(oldOverview)!==hash(newOverview))throw new Error('기존 총괄 변경');
    for(const old of oldItems) {
      const now=newItems.find(i=>i.id===old.id);
      const {unitAnalysis:oldUnit,...oldFields}=old,{unitAnalysis:newUnit,...newFields}=now;
      if(hash(oldFields)!==hash(newFields))throw new Error('기존 총괄 항목 변경');
      if(oldUnit)for(const k of sections)for(const row of oldUnit[k]){
        if(hash(row)!==hash(newUnit?.[k].find(r=>r.id===row.id)))throw new Error('기존 상세 행 변경');
      }
      if(oldUnit?.flowChartData?.nodes?.length && hash(oldUnit.flowChartData)!==hash(newUnit.flowChartData))throw new Error('기존 흐름도 변경');
      if(oldUnit?.swimlaneData && hash(oldUnit.swimlaneData)!==hash(newUnit.swimlaneData))throw new Error('기존 Swimlane 변경');
    }
    for(const u of data.units) {
      const a=after.items.find(i=>i.asIsManagementNo===u.managementNo).unitAnalysis;
      for(const k of sections){
        const rows=u[k]||[],batch=a[k].filter(r=>r.remarks?.includes(data.batch));
        if(batch.length!==rows.length || rows.some(r=>!batch.some(c=>sameRow(c,r))))throw new Error('추가 내용 불일치');
      }
      if(u.flowChartData && hash(a.flowChartData)!==hash(u.flowChartData))throw new Error('흐름도 내용 불일치');
    }
  },{timeout:60000,isolationLevel:'Serializable'});
  const after=await prisma.asIsOverview.findUniqueOrThrow({where,include});
  await fs.writeFile(path.join(__dirname,'after.json'),JSON.stringify(after,null,2),'utf8');
  await fs.writeFile(path.join(__dirname,'receipt.json'),JSON.stringify({...summary,beforeHash:hash(before),
    afterHash:hash(after),completedAt:new Date().toISOString(),unitAnalysesAfter:after.items.filter(i=>i.unitAnalysis).length},null,2),'utf8');
  console.log('PRODUCTION_SYNC_VERIFIED');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(async()=>{
  if(prisma)await prisma.$disconnect();if(pool)await pool.end();
});
