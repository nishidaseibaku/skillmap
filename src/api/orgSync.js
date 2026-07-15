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
 *  - teams/{team_<code>}                （チームマスタ由来のみ）
 *  - members/{employee.id}              （社員の不変UUID）
 *
 * teamCode が空の社員は「未所属」（teamId=null）。擬似チームは生成しない。
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
  existingDepartments = [],
  existingTeams = [],
  existingMembers = [],
}) {
  const teamsById = new Map(existingTeams.map((t) => [t.id, t]));
  const membersById = new Map(existingMembers.map((m) => [m.id, m]));

  const deptIdOf = (code) => `dept_${code}`;
  const teamIdOf = (code) => `team_${code}`;

  // --- 部門 ---
  const departments = [];
  for (const it of deptItems) {
    const code = it?.values?.code != null ? String(it.values.code) : null;
    if (!code) continue;
    departments.push({ id: deptIdOf(code), name: it.values.name || code });
  }

  // --- チーム（マスタ由来のみ・フラット） ---
  // 部門への割り当ては保持しない。部門↔チームの対応は表示時に
  // 「その部門の社員(deptCode一致)が持つ teamCode」から都度導出する。
  const teams = [];
  for (const it of teamItems) {
    const code = it?.values?.code != null ? String(it.values.code) : null;
    if (!code) continue;
    const id = teamIdOf(code);
    teams.push({
      id,
      code,
      name: it.values.name || code,
      skills: teamsById.get(id)?.skills ?? [], // スキル定義を保持
    });
  }

  // --- 社員 ---
  const memberUpserts = [];
  const fetchedIds = new Set();

  for (const emp of employees) {
    if (emp.status === 'deleted') continue; // 下の delete 処理で除去
    fetchedIds.add(emp.id);

    const deptCode = emp?.custom?.[DEPT_KEY] ? String(emp.custom[DEPT_KEY]) : null;
    const teamCode = emp?.custom?.[TEAM_KEY] ? String(emp.custom[TEAM_KEY]) : null;

    // 所属はマスタの teamCode を正とする。空なら「未所属」。
    const teamId = teamCode ? teamIdOf(teamCode) : null;
    const prev = membersById.get(emp.id);

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

  // 部門・チームもマスタを正とし、マスタに無いものは削除
  const deptIds = new Set(departments.map((d) => d.id));
  const teamIds = new Set(teams.map((t) => t.id));
  const departmentDeletes = existingDepartments.map((d) => d.id).filter((id) => !deptIds.has(id));
  const teamDeletes = existingTeams.map((t) => t.id).filter((id) => !teamIds.has(id));

  return {
    departments,
    teams,
    memberUpserts,
    memberDeletes,
    departmentDeletes,
    teamDeletes,
  };
}
