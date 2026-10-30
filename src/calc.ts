import type {
  Assessment,
  Assignment,
  Level,
  Org,
  Person,
  PersonLicense,
  Requirement,
  Skill,
  SkillVersion,
  Training,
} from './types'

export interface Dataset {
  persons: Person[]
  orgs: Org[]
  assignments: Assignment[]
  skills: Skill[]
  skillVersions: SkillVersion[]
  requirements: Requirement[]
  assessments: Assessment[]
  personLicenses: PersonLicense[]
  trainings: Training[]
}

/** 同一人物×スキルの最新の評価 */
export function currentAssessment(
  assessments: Assessment[],
  personId: string,
  skillId: string,
): Assessment | undefined {
  let best: Assessment | undefined
  for (const a of assessments) {
    if (a.personId !== personId || a.skillId !== skillId) continue
    if (
      !best ||
      a.assessedOn > best.assessedOn ||
      (a.assessedOn === best.assessedOn && a.createdAt > best.createdAt)
    ) {
      best = a
    }
  }
  return best
}

export function currentAssignment(assignments: Assignment[], personId: string): Assignment | undefined {
  return assignments.find((a) => a.personId === personId && a.endDate === null)
}

/** 現在そのチームに所属している在籍者(所属履歴が開いているもの) */
export function activeMembers(
  persons: Person[],
  assignments: Assignment[],
  orgId: string,
): Person[] {
  const ids = new Set(
    assignments.filter((a) => a.orgId === orgId && a.endDate === null).map((a) => a.personId),
  )
  return persons.filter((p) => p.isActive && ids.has(p.id)).sort((a, b) => a.empNo.localeCompare(b.empNo))
}

export type SkillStatus = 'none' | 'single' | 'short' | 'ok'

export interface TeamSkillRow {
  requirement: Requirement
  skill: Skill
  masteredCount: number
  /** Max(適正人数 − 習得人数, 0) */
  shortage: number
  status: SkillStatus
}

/**
 * チームのスキル行を作る。
 * - none  : 適正人数1以上で習得者0名(重大)
 * - single: 重要スキルで習得者1名以下(属人化)。none に該当するものは none を優先
 * - short : 適正人数に不足
 */
export function teamSkillRows(data: Dataset, orgId: string): TeamSkillRow[] {
  const members = activeMembers(data.persons, data.assignments, orgId)
  const skillById = new Map(data.skills.map((s) => [s.id, s]))
  const rows: TeamSkillRow[] = []
  for (const req of data.requirements) {
    if (req.orgId !== orgId || !req.isActive) continue
    const skill = skillById.get(req.skillId)
    if (!skill || !skill.isActive) continue
    const masteredCount = members.filter((m) => {
      const cur = currentAssessment(data.assessments, m.id, skill.id)
      return cur !== undefined && cur.level >= req.masteryLevel
    }).length
    const shortage = Math.max(req.requiredCount - masteredCount, 0)
    let status: SkillStatus = 'ok'
    if (req.requiredCount >= 1 && masteredCount === 0) status = 'none'
    else if (skill.important && masteredCount <= 1) status = 'single'
    else if (shortage > 0) status = 'short'
    rows.push({ requirement: req, skill, masteredCount, shortage, status })
  }
  return rows.sort(
    (a, b) =>
      (a.requirement.order ?? Infinity) - (b.requirement.order ?? Infinity) ||
      a.skill.name.localeCompare(b.skill.name, 'ja'),
  )
}

export interface PersonSkillRow {
  skill: Skill
  /** 現所属の要求。現所属外のスキルは undefined */
  requirement?: Requirement
  level?: Level
  achieved: boolean
}

export interface PersonView {
  currentOrg?: Org
  /** 現所属チームの要求スキル */
  required: PersonSkillRow[]
  /** 現所属の要求にはないが、評価を持つスキル(過去所属・他チームで取得した能力) */
  retained: PersonSkillRow[]
  /** 現所属の要求スキルのうち基準を満たす割合(0〜1)。要求が無ければ undefined */
  achievementRate?: number
}

export function personView(data: Dataset, personId: string): PersonView {
  const cur = currentAssignment(data.assignments, personId)
  const currentOrg = cur ? data.orgs.find((o) => o.id === cur.orgId) : undefined
  const reqBySkill = new Map(
    data.requirements.filter((r) => cur && r.orgId === cur.orgId && r.isActive).map((r) => [r.skillId, r]),
  )
  const mk = (skill: Skill): PersonSkillRow => {
    const requirement = reqBySkill.get(skill.id)
    const level = currentAssessment(data.assessments, personId, skill.id)?.level
    return {
      skill,
      requirement,
      level,
      achieved: requirement !== undefined && level !== undefined && level >= requirement.masteryLevel,
    }
  }
  const byName = (a: PersonSkillRow, b: PersonSkillRow) =>
    a.skill.name.localeCompare(b.skill.name, 'ja')

  const activeSkills = data.skills.filter((s) => s.isActive)
  const required = activeSkills.filter((s) => reqBySkill.has(s.id)).map(mk).sort(byName)
  const retained = activeSkills
    .filter((s) => !reqBySkill.has(s.id))
    .map(mk)
    .filter((r) => r.level !== undefined)
    .sort(byName)
  const achievementRate = required.length
    ? required.filter((r) => r.achieved).length / required.length
    : undefined
  return { currentOrg, required, retained, achievementRate }
}

export function summarize(rows: TeamSkillRow[]) {
  return {
    none: rows.filter((r) => r.status === 'none').length,
    single: rows.filter((r) => r.status === 'single').length,
    short: rows.filter((r) => r.shortage > 0).length,
    total: rows.length,
  }
}

/** 評価時点の版の基準。版の記録が無ければ undefined */
export function criteriaAt(data: Dataset, a: Assessment): string | undefined {
  const v = a.skillVersion ?? 1
  return data.skillVersions.find((x) => x.skillId === a.skillId && x.version === v)?.criteria
}

/** 評価時点から基準が変わっているか(名称・コアの変更だけでは旧基準にしない) */
export function isStaleCriteria(data: Dataset, a: Assessment): boolean {
  const skill = data.skills.find((s) => s.id === a.skillId)
  const then = criteriaAt(data, a)
  return skill !== undefined && then !== undefined && then !== skill.criteria
}

/** ids から from を取り出し、to の前(after=false)または後(after=true)へ移した並びを返す */
export function moveId(ids: string[], from: string, to: string, after: boolean): string[] {
  if (from === to) return ids
  const rest = ids.filter((x) => x !== from)
  const idx = rest.indexOf(to)
  if (idx < 0) return ids
  rest.splice(after ? idx + 1 : idx, 0, from)
  return rest
}

export type ExpiryState = 'none' | 'ok' | 'soon' | 'expired'

/** 有効期限の状態。期限切れ、または `soonDays` 日以内に切れるものを警告対象にする */
export function expiryState(expiresOn: string | null, todayIso: string, soonDays = 60): ExpiryState {
  if (!expiresOn) return 'none'
  if (expiresOn < todayIso) return 'expired'
  const diff = (Date.parse(expiresOn) - Date.parse(todayIso)) / 86_400_000
  return diff <= soonDays ? 'soon' : 'ok'
}

export interface TeamStat {
  key: string
  label: string
  /** 表示する値。算出できない場合は undefined(カードには「—」と出す) */
  rate?: number
  /** 値の内訳(例: 「充足 1 / コア 2」) */
  detail: string
}

/**
 * チーム上部のカードに出す集計値。新しい集計を足すときはここに追加する(画面側は配列を並べるだけ)。
 * コアスキル充足率: コアスキルのうち、習得者が適正人数に達しているものの割合。
 */
export function teamStats(rows: TeamSkillRow[]): TeamStat[] {
  const core = rows.filter((r) => r.skill.important)
  const fulfilled = core.filter((r) => r.masteredCount >= r.requirement.requiredCount)
  return [
    {
      key: 'core-fulfillment',
      label: 'コアスキル充足率',
      rate: core.length ? fulfilled.length / core.length : undefined,
      detail: core.length ? `充足 ${fulfilled.length} / コア ${core.length}` : 'コアスキルなし',
    },
  ]
}
