/**
 * @file scripts/package-jisung-ui.mjs
 * @description 공용 UI 소스를 배포 가능한 고정 npm 패키지로 묶습니다.
 * 초보자 가이드:
 * - node scripts/package-jisung-ui.mjs C:/Project/jisung-ui
 * - 원본 저장소는 읽기만 하며 WBS 전용 메타데이터를 임시 폴더에 적용합니다.
 */
import { mkdtemp, readFile, writeFile, cp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join, dirname, basename } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const source = process.argv[2];
if (!source) throw new Error("jisung-ui 원본 경로를 지정해주세요.");
const root = process.cwd();
const original = JSON.parse(await readFile(join(source, "package.json"), "utf8"));
if (original.name !== "@jisung/ui") throw new Error("@jisung/ui 원본이 아닙니다.");
const stage = await mkdtemp(join(tmpdir(), "wbs-jisung-ui-"));
try {
  await cp(join(source, "src"), join(stage, "src"), { recursive: true,
    filter: path => !/\.(test|spec)\.[cm]?[jt]sx?$/.test(path) });
  await cp(join(source, "scripts"), join(stage, "scripts"), { recursive: true,
    filter: path => !/\.(test|spec)\.[cm]?[jt]sx?$/.test(path) });
  const metadata = { ...original };
  delete metadata.devDependencies;
  delete metadata.scripts;
  const pkg = { ...metadata, version: `${original.version}-wbs.1`,
    exports: { ...original.exports, "./data-grid": "./src/data-grid/DataGrid.tsx" },
    peerDependencies: { ...original.peerDependencies, next: "^15.2.0 || ^16.0.0" },
  };
  await writeFile(join(stage, "package.json"), JSON.stringify(pkg, null, 2) + "\n");
  const destination = resolve(root, "vendor");
  await mkdir(destination, { recursive: true });
  // npm-cli.js를 Node로 직접 실행해 Windows 셸 인수 변형을 피한다.
  const npmCli = join(process.execPath, "..", "node_modules", "npm", "bin", "npm-cli.js");
  const result = JSON.parse(execFileSync(process.execPath, [npmCli, "pack", "--json", "--pack-destination", destination], { cwd: stage, encoding: "utf8" }))[0];
  const archive = await readFile(join(destination, result.filename));
  await writeFile(join(destination, "jisung-ui-manifest.json"), JSON.stringify({
    sourcePackage: original.name, sourceVersion: original.version, archive: result.filename,
    sha256: createHash("sha256").update(archive).digest("hex"),
    adaptations: ["DataGrid 직접 가져오기 경로 공개", "WBSMaster Next.js 16 호환 범위 선언"],
  }, null, 2) + "\n");
  console.log(result.filename);
} finally {
  if (dirname(resolve(stage)) !== resolve(tmpdir()) || !basename(stage).startsWith("wbs-jisung-ui-")) {
    throw new Error("임시 패키지 경로 검증에 실패했습니다.");
  }
  await rm(stage, { recursive: true, force: true });
}
