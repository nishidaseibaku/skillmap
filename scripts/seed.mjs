// ローカルエミュレーター用のサンプルデータ投入(架空のデータ)。実行のたびに全データを消してから入れ直す。
import { initializeApp } from 'firebase/app'
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getDocs,
  getFirestore,
  limit,
  query,
  setDoc,
  terminate,
} from 'firebase/firestore'

// 既定はローカルのエミュレーター(全消去して投入)。SEED_TARGET=prod のときは .env.production の実プロジェクトへ
// 追記のみで投入する(消去しない。既存データを壊さないよう、投入先の自分用コレクションが空であることを確認する)。
const PROD = process.env.SEED_TARGET === 'prod'
const HOST = '127.0.0.1'
const PORT = 8080

let app
let db
if (PROD) {
  const env = Object.fromEntries(
    (await import('node:fs')).readFileSync('.env.production', 'utf8')
      .split(/\r?\n/)
      .filter((l) => l.includes('=') && !l.startsWith('#'))
      .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
  )
  app = initializeApp({
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    apiKey: env.VITE_FIREBASE_API_KEY,
    appId: env.VITE_FIREBASE_APP_ID,
  })
  db = getFirestore(app)
  for (const c of ['persons', 'orgs', 'skills', 'assessments']) {
    const snap = await getDocs(query(collection(db, c), limit(1)))
    if (!snap.empty) {
      console.error(`投入先に既に ${c} のデータがあります。上書きを避けるため中止しました。`)
      process.exit(1)
    }
  }
  console.log(`本番(${env.VITE_FIREBASE_PROJECT_ID})へ追記投入します`)
} else {
  const PROJECT = 'demo-skill-map'
  const clearRes = await fetch(
    `http://${HOST}:${PORT}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`,
    { method: 'DELETE' },
  ).catch(() => undefined)
  if (!clearRes?.ok) {
    console.error('Firestore エミュレーターに接続できません。先に `npm run emulators` を起動してください。')
    process.exit(1)
  }
  app = initializeApp({ projectId: PROJECT, apiKey: 'demo' })
  db = getFirestore(app)
  connectFirestoreEmulator(db, HOST, PORT)
}

const put = (col, id, data) => setDoc(doc(db, col, id), data)

const orgs = [
  { id: 'org-1', name: '製麦第1チーム', isActive: true },
  { id: 'org-2', name: '品質管理チーム', isActive: true },
]

const persons = [
  { id: 'p-001', empNo: '1001', name: '佐藤 一郎', employmentType: '正社員', isActive: true },
  { id: 'p-002', empNo: '1002', name: '鈴木 花子', employmentType: '正社員', isActive: true },
  { id: 'p-003', empNo: '1003', name: '高橋 健', employmentType: '正社員', isActive: true },
  { id: 'p-004', empNo: '1004', name: '田中 美咲', employmentType: 'パート', isActive: true },
  { id: 'p-005', empNo: '2001', name: '伊藤 誠', employmentType: '正社員', isActive: true },
  { id: 'p-006', empNo: '2002', name: '渡辺 優', employmentType: '正社員', isActive: true },
  { id: 'p-007', empNo: '1005', name: '山本 大輔', employmentType: '正社員', isActive: true },
  { id: 'p-008', empNo: '1006', name: '中島 彩', employmentType: '正社員', isActive: true },
  { id: 'p-009', empNo: '1007', name: '小林 拓也', employmentType: '派遣', isActive: true },
  { id: 'p-010', empNo: '1008', name: '加藤 里奈', employmentType: 'パート', isActive: true },
]

const assignments = [
  { id: 'g-1', personId: 'p-001', orgId: 'org-1', startDate: '2024-04-01', endDate: null },
  { id: 'g-2', personId: 'p-002', orgId: 'org-1', startDate: '2023-04-01', endDate: null },
  { id: 'g-3', personId: 'p-003', orgId: 'org-1', startDate: '2025-04-01', endDate: null },
  { id: 'g-4', personId: 'p-004', orgId: 'org-1', startDate: '2026-04-01', endDate: null },
  // 渡辺さんは製麦から品質管理へ異動済み(旧所属のスキルが保持されることの確認用)
  { id: 'g-5a', personId: 'p-006', orgId: 'org-1', startDate: '2022-04-01', endDate: '2026-04-01' },
  { id: 'g-5b', personId: 'p-006', orgId: 'org-2', startDate: '2026-04-01', endDate: null },
  { id: 'g-6', personId: 'p-005', orgId: 'org-2', startDate: '2021-04-01', endDate: null },
  { id: 'g-7', personId: 'p-007', orgId: 'org-1', startDate: '2022-04-01', endDate: null },
  { id: 'g-8', personId: 'p-008', orgId: 'org-1', startDate: '2024-10-01', endDate: null },
  { id: 'g-9', personId: 'p-009', orgId: 'org-1', startDate: '2026-07-01', endDate: null },
  { id: 'g-10', personId: 'p-010', orgId: 'org-1', startDate: '2026-09-01', endDate: null },
]

const skills = [
  { id: 'sk-1', name: '浸麦槽の水位・水温管理', criteria: '手順書通りに設定し、異常時に報告できる', important: true, isActive: true, version: 2 },
  { id: 'sk-2', name: '発芽室の温湿度管理', criteria: '温湿度の記録と調整が単独でできる', important: false, isActive: true, version: 1 },
  { id: 'sk-3', name: 'キルンの温度プロファイル設定', criteria: '品種ごとのプロファイルを選択・調整できる', important: true, isActive: true, version: 1 },
  { id: 'sk-4', name: '出荷検品', criteria: '検品基準に沿って判定・記録できる', important: false, isActive: true, version: 1 },
  { id: 'sk-5', name: '水分・窒素分の分析', criteria: '分析手順を単独で実施し結果を判定できる', important: true, isActive: true, version: 1 },
  { id: 'sk-6', name: '官能検査', criteria: '基準サンプルとの差を判定できる', important: false, isActive: true, version: 1 },
]

// スキルの版(追記のみ)。sk-1 は基準を見直して v2 になっている(旧基準で評価済みの例)
const skillVersions = [
  ...skills
    .filter((s) => s.id !== 'sk-1')
    .map((s) => ({ ...s, skillId: s.id, version: 1, createdAt: 1_690_000_000_000, id: `${s.id}-v1` })),
  { id: 'sk-1-v1', skillId: 'sk-1', version: 1, name: '浸麦槽の水位・水温管理', criteria: '手順書通りに設定できる', important: true, createdAt: 1_690_000_000_000 },
  { id: 'sk-1-v2', skillId: 'sk-1', version: 2, name: '浸麦槽の水位・水温管理', criteria: '手順書通りに設定し、異常時に報告できる', important: true, createdAt: 1_790_000_000_000 },
]

const requirements = [
  { id: 'r-1', orgId: 'org-1', skillId: 'sk-1', requiredCount: 3, masteryLevel: 3, isActive: true, order: 1 },
  { id: 'r-2', orgId: 'org-1', skillId: 'sk-2', requiredCount: 2, masteryLevel: 3, isActive: true, order: 2 },
  { id: 'r-3', orgId: 'org-1', skillId: 'sk-3', requiredCount: 2, masteryLevel: 3, isActive: true, order: 3 },
  { id: 'r-4', orgId: 'org-1', skillId: 'sk-4', requiredCount: 2, masteryLevel: 3, isActive: true, order: 4 },
  { id: 'r-5', orgId: 'org-2', skillId: 'sk-5', requiredCount: 2, masteryLevel: 3, isActive: true, order: 1 },
  { id: 'r-6', orgId: 'org-2', skillId: 'sk-6', requiredCount: 2, masteryLevel: 3, isActive: true, order: 2 },
  { id: 'r-7', orgId: 'org-2', skillId: 'sk-4', requiredCount: 1, masteryLevel: 3, isActive: true, order: 3 },
]

let t = 0
const A = (personId, skillId, level, assessedOn, assessor, basis) => ({
  id: `as-${String(++t).padStart(3, '0')}`,
  personId,
  skillId,
  level,
  assessedOn,
  assessor,
  basis,
  createdAt: 1_700_000_000_000 + t,
  // sk-1 は基準見直し(v2)前の評価なので v1。それ以外は v1 のまま
  skillVersion: 1,
})

const assessments = [
  A('p-001', 'sk-1', 4, '2026-06-10', '山田 課長', '新人への指導を担当し、手順の説明も的確だった'),
  A('p-001', 'sk-2', 3, '2026-06-10', '山田 課長', '単独で毎日の記録と調整を実施'),
  A('p-001', 'sk-3', 3, '2026-06-10', '山田 課長', '品種切替時のプロファイル設定を単独で完了'),
  A('p-001', 'sk-4', 3, '2026-06-10', '山田 課長', '検品基準に沿って判定できる'),
  A('p-002', 'sk-1', 3, '2026-06-12', '山田 課長', '単独で運用できている'),
  A('p-002', 'sk-2', 4, '2026-06-12', '山田 課長', '他メンバーに温湿度調整のコツを指導'),
  A('p-002', 'sk-4', 2, '2026-03-01', '山田 課長', '指導を受けながら実施'),
  A('p-002', 'sk-4', 3, '2026-09-20', '山田 課長', '半年間の作業観察で単独実施を確認'),
  A('p-003', 'sk-1', 2, '2026-06-15', '山田 課長', '先輩の指導のもとで実施'),
  A('p-003', 'sk-2', 3, '2026-06-15', '山田 課長', '単独で実施'),
  A('p-003', 'sk-3', 1, '2026-06-15', '山田 課長', '補助作業のみ'),
  A('p-004', 'sk-4', 1, '2026-09-30', '山田 課長', '入社半年。検品の補助から開始'),
  // 渡辺さん: 旧所属(製麦)で取得したスキルと、現所属(品質管理)でのスキル
  A('p-006', 'sk-1', 3, '2025-09-01', '山田 課長', '製麦在籍時に単独運用'),
  A('p-006', 'sk-3', 4, '2025-09-01', '山田 課長', '製麦在籍時に指導者として認定'),
  A('p-006', 'sk-5', 2, '2026-08-01', '中村 主任', '異動後の研修中。指導を受けながら分析'),
  A('p-007', 'sk-1', 3, '2026-06-20', '山田 課長', '単独で運用できている'),
  A('p-007', 'sk-2', 2, '2026-06-20', '山田 課長', '指導を受けながら実施'),
  A('p-007', 'sk-3', 4, '2026-06-20', '山田 課長', '新人にプロファイル設定を指導'),
  A('p-007', 'sk-4', 3, '2026-06-20', '山田 課長', '検品を単独で実施'),
  A('p-008', 'sk-1', 3, '2026-07-05', '山田 課長', '単独で運用できている'),
  A('p-008', 'sk-2', 3, '2026-07-05', '山田 課長', '単独で実施'),
  A('p-008', 'sk-4', 4, '2026-07-05', '山田 課長', '検品の指導役を担当'),
  A('p-009', 'sk-2', 1, '2026-08-10', '山田 課長', '補助作業から開始'),
  A('p-009', 'sk-4', 2, '2026-09-10', '山田 課長', '指導を受けながら検品'),
  A('p-010', 'sk-4', 1, '2026-09-30', '山田 課長', '入社1か月。補助作業のみ'),
  A('p-005', 'sk-5', 4, '2026-05-20', '中村 主任', '分析担当として他メンバーを指導'),
  A('p-005', 'sk-6', 3, '2026-05-20', '中村 主任', '基準サンプルとの差を単独で判定'),
  A('p-005', 'sk-4', 3, '2026-05-20', '中村 主任', '出荷検品を単独で実施'),
]

// 資格・免許と研修受講履歴(人に紐づく。証明書ファイルはサンプルには付けない)。日付は実行日からの相対
const d = (offsetDays) => new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10)
const licenseRows = [
  ['p-001', '危険物取扱者 乙種4類', -900, 1500],
  ['p-001', 'フォークリフト運転技能講習', -1800, null],
  ['p-002', '食品衛生責任者', -700, -20], // 期限切れの例
  ['p-003', '玉掛け技能講習', -500, 30], // まもなく期限の例
  ['p-005', '品質管理検定(QC検定)2級', -1200, null],
]
const licenses = licenseRows.map(([personId, name, acq, exp], i) => ({
  id: `lic-${i + 1}`,
  personId,
  name,
  acquiredOn: d(acq),
  expiresOn: exp === null ? null : d(exp),
  certificate: null,
  isActive: true,
  createdAt: 1_700_000_000_000 + i,
}))
const trainingRows = [
  ['p-001', '新人指導者研修', -300, '修了'],
  ['p-002', 'HACCP基礎研修', -200, '修了'],
  ['p-003', '安全衛生教育', -60, '修了'],
  ['p-004', '新入社員研修', -150, '受講中'],
  ['p-005', '官能評価トレーニング', -400, '修了'],
]
const trainings = trainingRows.map(([personId, name, at, completion], i) => ({
  id: `trn-${i + 1}`,
  personId,
  name,
  attendedOn: d(at),
  completion,
  certificate: null,
  isActive: true,
  createdAt: 1_700_000_000_000 + i,
}))

const jobs = []
for (const l of licenses) jobs.push(put('personLicenses', l.id, strip(l)))
for (const t of trainings) jobs.push(put('trainings', t.id, strip(t)))
for (const o of orgs) jobs.push(put('orgs', o.id, strip(o)))
for (const p of persons) jobs.push(put('persons', p.id, strip(p)))
for (const a of assignments) jobs.push(put('assignments', a.id, strip(a)))
for (const s of skills) jobs.push(put('skills', s.id, strip(s)))
for (const v of skillVersions) jobs.push(put('skillVersions', v.id, strip(v)))
for (const r of requirements) jobs.push(put('requirements', r.id, strip(r)))
for (const a of assessments) jobs.push(put('assessments', a.id, strip(a)))
await Promise.all(jobs)

function strip({ id: _id, ...rest }) {
  return rest
}

console.log(
  `投入完了: チーム${orgs.length} / 人財${persons.length} / 所属履歴${assignments.length} / スキル${skills.length}（版${skillVersions.length}） / 要求${requirements.length} / 評価${assessments.length} / 資格${licenses.length} / 研修${trainings.length}`,
)
await terminate(db)
process.exit(0)
