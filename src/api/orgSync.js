import { fetchMasters, fetchMasterItems } from './masterApi';

/**
 * 部門マスタの解決と、部門／チーム／社員割当プランの構築。
 *
 * master-manager の /masters の詳細スキーマは非公開のため、
 * 「社員の custom.deptCode と一致する項目を持つマスタ」を実データ照合で特定する
 * 防御的な方式を採る。これによりマスタ定義のフィールド名に依存しない。
 */

const DEPT_KEY = 'deptCode';
const ROOT_DEPARTMENT_ID = 'all';
const ROOT_DEPARTMENT_NAME = '全社';

/** マスタ項目リストから id -> 表示名 のマップを作る */
function itemsToNameMap(items) {
  const map = new Map();
  for (const it of items || []) {
    const name = it?.values?.name || it?.values?.code || it?.id;
    if (it?.id != null) map.set(String(it.id), name);
  }
  return map;
}

/** /masters のレスポンスからマスタ定義の配列を取り出す（構造揺れを吸収） */
function extractMasterDefs(mastersResp) {
  const raw = mastersResp?.masters || mastersResp?.data || mastersResp || [];
  const list = Array.isArray(raw) ? raw : [];
  return list
    .map((m) => ({
      masterId: m.masterId || m.id || m.key,
      name: m.name,
    }))
    .filter((m) => m.masterId);
}

/**
 * 社員の deptCode 集合を最もよくカバーするマスタを部門マスタとみなし、
 * deptCode -> 部門名 のマップを返す。特定できなければ空マップ。
 */
export async function resolveDeptCodeNames(employees) {
  const codes = new Set(
    employees.map((e) => e?.custom?.[DEPT_KEY]).filter(Boolean).map(String),
  );
  if (codes.size === 0) return new Map();

  let defs = [];
  try {
    defs = extractMasterDefs(await fetchMasters());
  } catch {
    return new Map(); // マスタ定義が取れなくても deptCode 自体で代替できる
  }

  let best = new Map();
  let bestHit = 0;
  for (const def of defs) {
    let items;
    try {
      const resp = await fetchMasterItems(def.masterId);
      items = resp?.data || resp?.items || resp;
    } catch {
      continue;
    }
    const map = itemsToNameMap(items);
    let hit = 0;
    for (const c of codes) if (map.has(c)) hit++;
    if (hit > bestHit) {
      bestHit = hit;
      best = map;
    }
    if (hit === codes.size) break; // 全カバーなら確定
  }
  return best;
}

/**
 * 社員一覧と deptCode->名称マップから、投入すべき組織構成を組み立てる純粋関数。
 * 既存の teams（skills 保持用）と members（skillLevels 保持用）を渡す。
 *
 * @returns {{ department, teams, memberUpserts, memberDeletes }}
 */
export function buildOrgPlan({ employees, deptNames, existingTeams = [], existingMembers = [] }) {
  const teamsById = new Map(existingTeams.map((t) => [t.id, t]));
  const membersById = new Map(existingMembers.map((m) => [m.id, m]));

  const department = { id: ROOT_DEPARTMENT_ID, name: ROOT_DEPARTMENT_NAME };

  // 出現する deptCode ごとにチームを作る
  const teamMap = new Map(); // deptCode -> team doc
  const memberUpserts = [];
  const memberDeletes = [];

  for (const emp of employees) {
    if (emp.status === 'deleted') {
      if (membersById.has(emp.id)) memberDeletes.push(emp.id);
      continue;
    }
    const code = emp?.custom?.[DEPT_KEY] ? String(emp.custom[DEPT_KEY]) : null;
    const prev = membersById.get(emp.id);
    // deptCode があれば自動割当。無ければ手動割当（既存 teamId）を尊重
    let teamId = prev?.teamId ?? null;

    if (code) {
      teamId = `team_${code}`;
      if (!teamMap.has(code)) {
        const existing = teamsById.get(teamId);
        teamMap.set(code, {
          id: teamId,
          name: deptNames.get(code) || code,
          departmentId: ROOT_DEPARTMENT_ID,
          skills: existing?.skills ?? [], // スキル定義は保持
        });
      }
    }

    memberUpserts.push({
      id: emp.id,
      data: {
        name: emp.displayName,
        email: emp.email || null,
        userPrincipalName: emp.userPrincipalName || null,
        deptCode: code,
        custom: emp.custom || {},
        status: emp.status,
        teamId, // deptCode で自動割当
        skillLevels: prev?.skillLevels ?? {}, // 習得状況は保持
        syncedAt: new Date().toISOString(),
      },
    });
  }

  return {
    department,
    teams: [...teamMap.values()],
    memberUpserts,
    memberDeletes,
  };
}
