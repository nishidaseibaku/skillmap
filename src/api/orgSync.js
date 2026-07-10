import { fetchMasterItems } from './masterApi';

/**
 * master-manager のマスタ構造に基づく組織（部門/チーム/社員）同期ロジック。
 *
 * 確定した連携契約:
 *  - 部門    = departments マスタ       … item.values = { code, name }
 *  - チーム  = department-teams マスタ   … item.values = { code, name, parentDeptCode }
 *              parentDeptCode は親部門の code
 *  - 個人    = /employees               … custom.deptCode / custom.teamCode（いずれもマスタの code）
 *  - join キーは常にマスタ項目の code（id(ランダム文字列)は使わない）
 *
 * アプリ側ドキュメントID:
 *  - departments/{dept_<code>}
 *  - teams/{team_<code>}                （チームマスタ由来）
 *  - teams/{team_dept_<code>}           （teamCode 未設定者の受け皿＝部門直属チーム）
 *  - members/{employee.id}              （社員の不変UUID）
 *
 * 保持するアプリ固有データ: チームの skills、社員の skillLevels
 */

const DEPT_KEY = 'deptCode';
const TEAM_KEY = 'teamCode';

/** Callable/REST のレスポンスから items 配列を取り出す（{data:[...],meta} 形に対応） */
function normalizeItems(resp) {
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp?.data)) return resp.data;
  return [];
}

/** 部門マスタ・チームマスタの項目を取得 */
export async function fetchOrgMasters() {
  const [deptResp, teamResp] = await Promise.all([
    fetchMasterItems('departments').catch(() => null),
    fetchMasterItems('department-teams').catch(() => null),
  ]);
  return {
    deptItems: normalizeItems(deptResp),
    teamItems: normalizeItems(teamResp),
  };
}

/**
 * 社員・マスタ項目・既存データから、投入すべき組織構成を組み立てる純粋関数。
 *
 * @returns {{ departments, teams, memberUpserts, memberDeletes }}
 */
export function buildOrgPlan({
  employees,
  deptItems = [],
  teamItems = [],
  existingTeams = [],
  existingMembers = [],
}) {
  const teamsById = new Map(existingTeams.map((t) => [t.id, t]));
  const membersById = new Map(existingMembers.map((m) => [m.id, m]));

  const deptIdOf = (code) => `dept_${code}`;
  const teamIdOf = (code) => `team_${code}`;
  const catchAllTeamIdOf = (deptCode) => `team_dept_${deptCode}`;

  // --- 部門 ---
  const deptNameByCode = new Map();
  const departments = [];
  for (const it of deptItems) {
    const code = it?.values?.code != null ? String(it.values.code) : null;
    if (!code) continue;
    const name = it.values.name || code;
    deptNameByCode.set(code, name);
    departments.push({ id: deptIdOf(code), name });
  }

  // --- チーム（マスタ由来） ---
  const teams = [];
  const teamCodeSet = new Set();
  for (const it of teamItems) {
    const code = it?.values?.code != null ? String(it.values.code) : null;
    if (!code) continue;
    teamCodeSet.add(code);
    const parent = it.values.parentDeptCode != null ? String(it.values.parentDeptCode) : null;
    const id = teamIdOf(code);
    teams.push({
      id,
      name: it.values.name || code,
      departmentId: parent ? deptIdOf(parent) : null,
      skills: teamsById.get(id)?.skills ?? [], // スキル定義を保持
    });
  }

  // teamCode 未設定者の受け皿（部門直属チーム）を必要に応じて生成
  const catchAll = new Map(); // deptCode -> team doc

  const ensureCatchAll = (deptCode) => {
    if (catchAll.has(deptCode)) return catchAll.get(deptCode);
    const id = catchAllTeamIdOf(deptCode);
    const doc = {
      id,
      name: `${deptNameByCode.get(deptCode) || deptCode}（未分類）`,
      departmentId: deptIdOf(deptCode),
      skills: teamsById.get(id)?.skills ?? [],
    };
    catchAll.set(deptCode, doc);
    return doc;
  };

  // --- 社員 ---
  const memberUpserts = [];
  const fetchedIds = new Set();

  for (const emp of employees) {
    if (emp.status === 'deleted') continue; // 下の delete 処理で除去
    fetchedIds.add(emp.id);

    const deptCode = emp?.custom?.[DEPT_KEY] ? String(emp.custom[DEPT_KEY]) : null;
    const teamCode = emp?.custom?.[TEAM_KEY] ? String(emp.custom[TEAM_KEY]) : null;
    const prev = membersById.get(emp.id);

    let teamId;
    if (teamCode && teamCodeSet.has(teamCode)) {
      teamId = teamIdOf(teamCode); // 正式なチームに割当
    } else if (teamCode) {
      teamId = teamIdOf(teamCode); // マスタ未取込でも teamCode があれば仮割当
    } else if (deptCode) {
      ensureCatchAll(deptCode); // 部門直属チームへ
      teamId = catchAllTeamIdOf(deptCode);
    } else {
      teamId = prev?.teamId ?? null; // 手動割当を尊重
    }

    memberUpserts.push({
      id: emp.id,
      data: {
        name: emp.displayName,
        email: emp.email || null,
        userPrincipalName: emp.userPrincipalName || null,
        deptCode,
        teamCode,
        custom: emp.custom || {},
        status: emp.status,
        teamId,
        skillLevels: prev?.skillLevels ?? {}, // 習得状況を保持
        syncedAt: new Date().toISOString(),
      },
    });
  }

  // 取得スコープ（表示ON）から外れた既存社員はローカルからも削除
  const memberDeletes = existingMembers
    .map((m) => m.id)
    .filter((id) => !fetchedIds.has(id));

  return {
    departments,
    teams: [...teams, ...catchAll.values()],
    memberUpserts,
    memberDeletes,
  };
}
