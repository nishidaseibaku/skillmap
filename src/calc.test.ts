import { describe, expect, it } from 'vitest'
import { activeMembers, currentAssessment, expiryState, teamStats, isStaleCriteria, moveId, personView, teamSkillRows, type Dataset } from './calc'
import type { Assessment } from './types'

let seq = 0
const assess = (p: Partial<Assessment> & Pick<Assessment, 'personId' | 'skillId' | 'level'>): Assessment => ({
  id: `a${++seq}`,
  assessedOn: '2026-10-01',
  assessor: 'x',
  basis: '',
  createdAt: seq,
  ...p,
})

const base = (): Dataset => ({
  persons: [
    { id: 'p1', empNo: '001', name: 'A', employmentType: '正社員', isActive: true },
    { id: 'p2', empNo: '002', name: 'B', employmentType: '正社員', isActive: true },
    { id: 'p3', empNo: '003', name: 'C', employmentType: '正社員', isActive: false },
  ],
  orgs: [
    { id: 'o1', name: '1チーム', isActive: true },
    { id: 'o2', name: '2チーム', isActive: true },
  ],
  assignments: [
    { id: 'g1', personId: 'p1', orgId: 'o1', startDate: '2026-04-01', endDate: null },
    { id: 'g2', personId: 'p2', orgId: 'o1', startDate: '2026-04-01', endDate: null },
    { id: 'g3', personId: 'p3', orgId: 'o1', startDate: '2026-04-01', endDate: null },
  ],
  skillVersions: [],
  skills: [
    { id: 's1', name: '重要', criteria: '', important: true, isActive: true, version: 1 },
    { id: 's2', name: '通常', criteria: '', important: false, isActive: true, version: 1 },
  ],
  requirements: [
    { id: 'r1', orgId: 'o1', skillId: 's1', requiredCount: 2, masteryLevel: 3, isActive: true },
    { id: 'r2', orgId: 'o1', skillId: 's2', requiredCount: 2, masteryLevel: 3, isActive: true },
  ],
  assessments: [],
  personLicenses: [],
  trainings: [],
})

describe('currentAssessment', () => {
  it('評価日が最新の評価を返し、同日なら後から登録したものを返す', () => {
    const a = [
      assess({ personId: 'p1', skillId: 's1', level: 2, assessedOn: '2026-09-01' }),
      assess({ personId: 'p1', skillId: 's1', level: 4, assessedOn: '2026-10-01' }),
      assess({ personId: 'p1', skillId: 's1', level: 3, assessedOn: '2026-10-01' }),
      assess({ personId: 'p1', skillId: 's1', level: 1, assessedOn: '2026-08-01' }),
    ]
    expect(currentAssessment(a, 'p1', 's1')?.level).toBe(3)
  })
  it('評価が無ければ undefined(未評価)', () => {
    expect(currentAssessment([], 'p1', 's1')).toBeUndefined()
  })
})

describe('teamSkillRows', () => {
  it('在籍者のみ数え、習得判定レベル以上を習得者とする', () => {
    const d = base()
    d.assessments = [
      assess({ personId: 'p1', skillId: 's2', level: 3 }),
      assess({ personId: 'p2', skillId: 's2', level: 2 }), // 未達
      assess({ personId: 'p3', skillId: 's2', level: 4 }), // 非在籍
    ]
    const row = teamSkillRows(d, 'o1').find((r) => r.skill.id === 's2')!
    expect(row.masteredCount).toBe(1)
    expect(row.shortage).toBe(1)
    expect(row.status).toBe('short')
  })
  it('習得者0名は none、重要スキルで1名は single', () => {
    const d = base()
    d.assessments = [assess({ personId: 'p1', skillId: 's1', level: 3 })]
    const rows = teamSkillRows(d, 'o1')
    expect(rows.find((r) => r.skill.id === 's1')!.status).toBe('single')
    expect(rows.find((r) => r.skill.id === 's2')!.status).toBe('none')
  })
  it('適正人数を満たせば ok、不足は負にならない', () => {
    const d = base()
    d.assessments = [
      assess({ personId: 'p1', skillId: 's2', level: 3 }),
      assess({ personId: 'p2', skillId: 's2', level: 4 }),
    ]
    d.requirements[1].requiredCount = 1
    const row = teamSkillRows(d, 'o1').find((r) => r.skill.id === 's2')!
    expect(row.shortage).toBe(0)
    expect(row.status).toBe('ok')
  })
})

describe('異動後の扱い', () => {
  it('旧所属で得たスキルは消えず、現所属外として保持される', () => {
    const d = base()
    d.assessments = [assess({ personId: 'p1', skillId: 's1', level: 4 })]
    // p1 を o2 へ異動(o2 の要求スキルは s2 のみ)
    d.assignments[0].endDate = '2026-10-15'
    d.assignments.push({ id: 'g4', personId: 'p1', orgId: 'o2', startDate: '2026-10-15', endDate: null })
    d.requirements.push({ id: 'r3', orgId: 'o2', skillId: 's2', requiredCount: 1, masteryLevel: 3, isActive: true })

    const v = personView(d, 'p1')
    expect(v.currentOrg?.id).toBe('o2')
    expect(v.required.map((r) => r.skill.id)).toEqual(['s2'])
    expect(v.retained.map((r) => [r.skill.id, r.level])).toEqual([['s1', 4]])
    // 旧チームの習得人数からは外れる
    expect(activeMembers(d.persons, d.assignments, 'o1').map((p) => p.id)).toEqual(['p2'])
  })
})

describe('スキルの版', () => {
  it('評価時点から基準が変わっていれば旧基準、名称だけの変更では旧基準にしない', () => {
    const d = base()
    d.skillVersions = [
      { id: 'v1', skillId: 's1', version: 1, name: '重要', criteria: '旧', important: true, createdAt: 1 },
      { id: 'v2', skillId: 's1', version: 2, name: '重要', criteria: '新', important: true, createdAt: 2 },
    ]
    d.skills[0] = { ...d.skills[0], criteria: '新', version: 2 }
    const old = assess({ personId: 'p1', skillId: 's1', level: 3, skillVersion: 1 })
    const cur = assess({ personId: 'p2', skillId: 's1', level: 3, skillVersion: 2 })
    expect(isStaleCriteria(d, old)).toBe(true)
    expect(isStaleCriteria(d, cur)).toBe(false)
    // 版の記録が無い評価は判定しない
    expect(isStaleCriteria(d, assess({ personId: 'p1', skillId: 's2', level: 3 }))).toBe(false)
  })
})

describe('スキルの並び順', () => {
  it('order が小さい順に並び、order 未設定は末尾', () => {
    const d = base()
    d.requirements[0].order = 2
    d.requirements[1].order = 1
    expect(teamSkillRows(d, 'o1').map((r) => r.skill.id)).toEqual(['s2', 's1'])
    delete d.requirements[1].order
    expect(teamSkillRows(d, 'o1').map((r) => r.skill.id)).toEqual(['s1', 's2'])
  })
  it('moveId は対象の前後へ移動する', () => {
    expect(moveId(['a', 'b', 'c'], 'a', 'c', true)).toEqual(['b', 'c', 'a'])
    expect(moveId(['a', 'b', 'c'], 'c', 'a', false)).toEqual(['c', 'a', 'b'])
    expect(moveId(['a', 'b', 'c'], 'b', 'b', true)).toEqual(['a', 'b', 'c'])
  })
})

describe('資格の有効期限', () => {
  it('期限切れ・60日以内・それ以外・期限なしを判定する', () => {
    expect(expiryState('2026-10-29', '2026-10-30')).toBe('expired')
    expect(expiryState('2026-10-30', '2026-10-30')).toBe('soon')
    expect(expiryState('2026-12-29', '2026-10-30')).toBe('soon')
    expect(expiryState('2026-12-30', '2026-10-30')).toBe('ok')
    expect(expiryState(null, '2026-10-30')).toBe('none')
  })
})

describe('チームの集計', () => {
  it('コアスキル充足率は、習得者が適正人数に達したコアスキルの割合', () => {
    const d = base()
    d.skills.push({ id: 's3', name: 'コア2', criteria: '', important: true, isActive: true, version: 1 })
    d.requirements.push({ id: 'r3', orgId: 'o1', skillId: 's3', requiredCount: 1, masteryLevel: 3, isActive: true })
    // s1(コア, 適正2) は1名のみ → 未充足 / s3(コア, 適正1) は1名 → 充足 / s2 は非コア
    d.assessments = [
      assess({ personId: 'p1', skillId: 's1', level: 3 }),
      assess({ personId: 'p1', skillId: 's3', level: 4 }),
    ]
    const stat = teamStats(teamSkillRows(d, 'o1'))[0]
    expect(stat.rate).toBe(0.5)
    expect(stat.detail).toBe('充足 1 / コア 2')
  })
  it('コアスキルが無ければ算出しない', () => {
    const d = base()
    d.skills[0] = { ...d.skills[0], important: false }
    expect(teamStats(teamSkillRows(d, 'o1'))[0].rate).toBeUndefined()
  })
})
