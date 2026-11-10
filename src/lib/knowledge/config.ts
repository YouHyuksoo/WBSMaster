/**
 * @file src/lib/knowledge/config.ts
 * @description 지식 서버 연결 설정과 프로젝트 격리 키입니다.
 * 초보자 가이드:
 * - 설정이 모두 있어야 활성화됩니다. 비밀값을 클라이언트에 보내지 않습니다.
 * - sourceId는 DB별 고유하고 영구적인 식별자입니다. 운영 중 변경하지 않습니다.
 */
export interface KnowledgeConfig { baseUrl: string; sourceId: string; key: string }

export function knowledgeConfig(env: Record<string, string | undefined> = process.env): KnowledgeConfig | null {
  const baseUrl = env.KNOWLEDGE_API_URL?.replace(/\/$/, "");
  const sourceId = env.KNOWLEDGE_SOURCE_ID;
  const key = env.KNOWLEDGE_API_KEY;
  if (!baseUrl && !sourceId && !key) return null;
  if (!baseUrl || !sourceId || !key) throw new Error("지식관리 연결 설정 3개를 모두 지정해 주세요.");
  const url = new URL(baseUrl);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("KNOWLEDGE_API_URL은 인증정보 없는 HTTP(S) 서버 주소여야 합니다.");
  }
  if (!/^[a-zA-Z0-9_-]{1,48}$/.test(sourceId)) throw new Error("KNOWLEDGE_SOURCE_ID 형식이 잘못됐습니다.");
  return { baseUrl, sourceId, key };
}

export function knowledgeProject(config: KnowledgeConfig, projectId: string): string {
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(projectId)) throw new Error("프로젝트 ID 형식이 잘못됐습니다.");
  // 구분자 충돌을 피하기 위해 구성 요소의 길이도 포함한다.
  return `wbs_${config.sourceId.length}_${config.sourceId}_${projectId}`;
}
