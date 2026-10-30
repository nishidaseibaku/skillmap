import { useEffect, useState } from 'react'
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, storage } from './firebase'
import type { Dataset } from './calc'
import type { Assessment, Certificate, Completion, Level, Skill } from './types'

const NAMES = [
  'persons',
  'orgs',
  'assignments',
  'skills',
  'skillVersions',
  'requirements',
  'assessments',
  'personLicenses',
  'trainings',
] as const

const empty = (): Dataset => ({
  persons: [],
  orgs: [],
  assignments: [],
  skills: [],
  skillVersions: [],
  requirements: [],
  assessments: [],
  personLicenses: [],
  trainings: [],
})

export type LoadState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; data: Dataset }

/**
 * 全コレクションをリアルタイム購読する。
 * MVP はパイロット1チーム規模を想定し全件購読とする(§8.3 のページング設計は規模拡大時に導入)。
 * 保存すると購読経由で画面が自動更新される。
 */
export function useDataset(retryKey: number): LoadState {
  const [state, setState] = useState<LoadState>({ phase: 'loading' })

  useEffect(() => {
    setState({ phase: 'loading' })
    const acc = empty() as unknown as Record<string, unknown[]>
    const seen = new Set<string>()
    let failed = false
    const unsubs = NAMES.map((name) =>
      onSnapshot(
        collection(db, name),
        (snap) => {
          acc[name] = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
          seen.add(name)
          if (!failed && seen.size === NAMES.length) {
            setState({ phase: 'ready', data: { ...(acc as unknown as Dataset) } })
          }
        },
        (err) => {
          failed = true
          setState({ phase: 'error', message: err.message })
        },
      ),
    )
    return () => unsubs.forEach((u) => u())
  }, [retryKey])

  return state
}

export interface NewAssessment {
  personId: string
  skillId: string
  level: Level
  assessedOn: string
  assessor: string
  basis: string
  skillVersion: number
}

/** 評価は上書きせず必ず新規ドキュメントとして追記する(§4) */
export async function addAssessment(a: NewAssessment): Promise<void> {
  const body: Omit<Assessment, 'id'> = { ...a, createdAt: Date.now() }
  await addDoc(collection(db, 'assessments'), { ...body, serverCreatedAt: serverTimestamp() })
}

/** 異動: 現所属を終了し新しい所属履歴を開始する(物理削除しない)。2書込みを原子的に行う */
export async function transferPerson(args: {
  personId: string
  currentAssignmentId: string | undefined
  toOrgId: string
  date: string
}): Promise<void> {
  const batch = writeBatch(db)
  if (args.currentAssignmentId) {
    batch.update(doc(db, 'assignments', args.currentAssignmentId), { endDate: args.date })
  }
  batch.set(doc(collection(db, 'assignments')), {
    personId: args.personId,
    orgId: args.toOrgId,
    startDate: args.date,
    endDate: null,
  })
  await batch.commit()
}

export interface SkillInput {
  name: string
  criteria: string
  important: boolean
}

// スキルの管理は各チームのスキル一覧画面で行う。
// スキル本体(skills)とチームの要求(requirements: 適正人数)をあわせて扱う。
// 削除は物理削除せず、チームの要求を無効(isActive: false)にして「外す」(§4)。評価履歴は残る。
const MASTERY_LEVEL = 3 // 習得判定はすべてのスキルでレベル3以上

/** 新しいスキルを作り、このチームの要求スキルとして登録する */
export async function createSkillForTeam(args: {
  skill: SkillInput
  orgId: string
  requiredCount: number
  order: number
}): Promise<void> {
  const batch = writeBatch(db)
  const skillRef = doc(collection(db, 'skills'))
  batch.set(skillRef, { ...args.skill, isActive: true, version: 1 })
  batch.set(doc(collection(db, 'skillVersions')), {
    skillId: skillRef.id,
    version: 1,
    ...args.skill,
    createdAt: Date.now(),
  })
  batch.set(doc(collection(db, 'requirements')), {
    orgId: args.orgId,
    skillId: skillRef.id,
    requiredCount: args.requiredCount,
    masteryLevel: MASTERY_LEVEL,
    isActive: true,
    order: args.order,
  })
  await batch.commit()
}

/** 既存のスキルをこのチームの要求スキルにする(外したものを戻す場合は既存の要求を再有効化) */
export async function linkSkillToTeam(args: {
  skillId: string
  orgId: string
  requiredCount: number
  order: number
  existingRequirementId?: string
}): Promise<void> {
  if (args.existingRequirementId) {
    await updateDoc(doc(db, 'requirements', args.existingRequirementId), {
      isActive: true,
      requiredCount: args.requiredCount,
      order: args.order,
    })
  } else {
    await addDoc(collection(db, 'requirements'), {
      orgId: args.orgId,
      skillId: args.skillId,
      requiredCount: args.requiredCount,
      masteryLevel: MASTERY_LEVEL,
      isActive: true,
      order: args.order,
    })
  }
}

/**
 * スキルの内容が変わっていれば新しい版を追記し、skills を最新版の内容に更新する。
 * 版は上書きしない。変更が無ければ適正人数だけ更新する。戻り値は新しい版番号(変更なしは undefined)。
 */
export async function updateSkillAndRequirement(args: {
  current: Skill
  skill: SkillInput
  requirementId: string
  requiredCount: number
}): Promise<number | undefined> {
  const { current, skill } = args
  const changed =
    current.name !== skill.name ||
    current.criteria !== skill.criteria ||
    current.important !== skill.important
  const batch = writeBatch(db)
  let version: number | undefined
  if (changed) {
    version = current.version + 1
    batch.set(doc(collection(db, 'skillVersions')), {
      skillId: current.id,
      version,
      ...skill,
      createdAt: Date.now(),
    })
    batch.update(doc(db, 'skills', current.id), { ...skill, version })
  }
  batch.update(doc(db, 'requirements', args.requirementId), { requiredCount: args.requiredCount })
  await batch.commit()
  return version
}

/** このチームの要求スキルから外す */
export async function removeSkillFromTeam(requirementId: string): Promise<void> {
  await updateDoc(doc(db, 'requirements', requirementId), { isActive: false })
}

/** スキルの並び順を保存する(渡した順に 1,2,3…)。1回の書込みで原子的に更新する */
export async function reorderRequirements(orderedRequirementIds: string[]): Promise<void> {
  const batch = writeBatch(db)
  orderedRequirementIds.forEach((id, i) => batch.update(doc(db, 'requirements', id), { order: i + 1 }))
  await batch.commit()
}

// ---- 資格・免許 / 研修受講履歴(人に紐づく) ----
// 物理削除はしない。誤登録は「取り消し」(isActive=false)、更新(再取得)は新しい記録を追加する。

export const MAX_CERTIFICATE_BYTES = 10 * 1024 * 1024

/** 証明書ファイルを Cloud Storage に保存し、Firestore に持たせる参照を返す */
export async function uploadCertificate(personId: string, file: File): Promise<Certificate> {
  try {
    ref(storage, 'check')
  } catch {
    throw new Error('証明書の保存先(Cloud Storage)が有効になっていません。証明書なしで登録するか、管理者に有効化を依頼してください')
  }
  const path = `certificates/${personId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
  await uploadBytes(ref(storage, path), file, { contentType: file.type || undefined })
  return { path, name: file.name }
}

export async function openCertificate(cert: Certificate): Promise<void> {
  window.open(await getDownloadURL(ref(storage, cert.path)), '_blank', 'noopener')
}

export async function addLicense(args: {
  personId: string
  name: string
  acquiredOn: string
  expiresOn: string | null
  file: File | null
}): Promise<void> {
  const certificate = args.file ? await uploadCertificate(args.personId, args.file) : null
  await addDoc(collection(db, 'personLicenses'), {
    personId: args.personId,
    name: args.name,
    acquiredOn: args.acquiredOn,
    expiresOn: args.expiresOn,
    certificate,
    isActive: true,
    createdAt: Date.now(),
  })
}

export async function addTraining(args: {
  personId: string
  name: string
  attendedOn: string
  completion: Completion
  file: File | null
}): Promise<void> {
  const certificate = args.file ? await uploadCertificate(args.personId, args.file) : null
  await addDoc(collection(db, 'trainings'), {
    personId: args.personId,
    name: args.name,
    attendedOn: args.attendedOn,
    completion: args.completion,
    certificate,
    isActive: true,
    createdAt: Date.now(),
  })
}

export async function cancelRecord(kind: 'personLicenses' | 'trainings', id: string): Promise<void> {
  await updateDoc(doc(db, kind, id), { isActive: false })
}
