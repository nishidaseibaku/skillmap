// 要件定義書 §5 の論理モデルのうち、MVP で使う最小限の項目。
// 「未評価」は評価が1件も無い状態で表現し、レベル0・空欄・ハイフンは使わない(§2 の曖昧さ対策)。

export type Level = 1 | 2 | 3 | 4

export interface Person {
  id: string
  empNo: string
  name: string
  employmentType: string
  isActive: boolean
}

export interface Org {
  id: string
  name: string
  isActive: boolean
}

/** 所属履歴。endDate が null のものが現所属(現在地)。 */
export interface Assignment {
  id: string
  personId: string
  orgId: string
  startDate: string
  endDate: string | null
}

export interface Skill {
  id: string
  name: string
  criteria: string
  /** 重要スキル。習得者が1名以下だと属人化として警告する */
  important: boolean
  isActive: boolean
  /** 現在の版番号。内容(名称・基準・コア)を変更するたびに +1 する */
  version: number
}

/** スキルの版。内容を変更するたびに追記し、上書きしない(§4) */
export interface SkillVersion {
  id: string
  skillId: string
  version: number
  name: string
  criteria: string
  important: boolean
  createdAt: number
}

/** チーム要求スキル。適正人数と習得判定レベルはチームごとに持つ */
export interface Requirement {
  id: string
  orgId: string
  skillId: string
  requiredCount: number
  masteryLevel: Level
  isActive: boolean
  /** チーム内の表示順(小さいほど上)。未設定の古いデータは末尾に名称順で並べる */
  order?: number
}

/** スキル評価。追記専用(上書きせず履歴として積む) */
export interface Assessment {
  id: string
  personId: string
  skillId: string
  level: Level
  assessedOn: string
  assessor: string
  basis: string
  /** 評価時点のスキルの版。未記録の古いデータは版1とみなす */
  skillVersion?: number
  createdAt: number
}

/** 証明書ファイル(Cloud Storage上のパスと元のファイル名)。ファイル本体は Firestore に持たない */
export interface Certificate {
  path: string
  name: string
}

/** 資格・免許。人に紐づく。更新(再取得)は新しい記録として追加し、誤登録は「取り消し」(isActive=false) で扱う */
export interface PersonLicense {
  id: string
  personId: string
  name: string
  acquiredOn: string
  /** 有効期限。期限の無い資格は null */
  expiresOn: string | null
  certificate: Certificate | null
  isActive: boolean
  createdAt: number
}

export type Completion = '修了' | '受講中' | '未修了'
export const COMPLETIONS: Completion[] = ['修了', '受講中', '未修了']

/** 研修受講履歴。人に紐づく */
export interface Training {
  id: string
  personId: string
  name: string
  attendedOn: string
  completion: Completion
  certificate: Certificate | null
  isActive: boolean
  createdAt: number
}

export const LEVELS: { level: Level; short: string; description: string }[] = [
  { level: 1, short: '補助', description: '補助ができる' },
  { level: 2, short: '指導下', description: '指導を受けながらできる' },
  { level: 3, short: '単独', description: '単独でできる' },
  { level: 4, short: '指導可', description: '他の人に指導できる' },
]

export const levelShort = (l: Level) => LEVELS[l - 1].short
