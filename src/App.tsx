import { useCallback, useState } from 'react'
import { type Dataset } from './calc'
import { useDataset } from './data'
import { useRoute, teamHref } from './router'
import { AssessmentDialog } from './AssessmentDialog'
import { PersonPage } from './PersonPage'
import { TeamPage } from './TeamPage'
import { PersonRecordDialog } from './PersonRecordDialog'
import { TeamSkillDialog } from './TeamSkillDialog'
import { TransferDialog } from './TransferDialog'
import { Toasts } from './ui'

type DialogState =
  | { kind: 'assess'; personId: string; skillId: string }
  | { kind: 'transfer'; personId: string }
  | { kind: 'record'; recordKind: 'license' | 'training'; personId: string }
  | { kind: 'teamSkill'; orgId: string; requirementId?: string }
  | undefined

export default function App() {
  const [retryKey, setRetryKey] = useState(0)
  const state = useDataset(retryKey)
  const route = useRoute()
  const [dialog, setDialog] = useState<DialogState>()
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([])

  const toast = useCallback((text: string) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500)
  }, [])

  if (state.phase === 'loading') {
    return (
      <div className="center-screen" role="status">
        <div className="spinner" aria-hidden="true" />
        読み込み中…
      </div>
    )
  }
  if (state.phase === 'error') {
    return (
      <div className="center-screen" role="alert">
        <h1>データを読み込めませんでした</h1>
        <p className="muted">{state.message}</p>
        <p className="muted">Firestore エミュレーターが起動しているか確認してください（npm run emulators）。</p>
        <button className="btn primary" onClick={() => setRetryKey((k) => k + 1)}>
          再読み込み
        </button>
      </div>
    )
  }

  const data = state.data
  const orgs = data.orgs.filter((o) => o.isActive).sort((a, b) => a.name.localeCompare(b.name, 'ja'))

  if (data.persons.length === 0) {
    return (
      <div className="center-screen">
        <h1>データがまだありません</h1>
        <p className="muted">サンプルデータを投入してください。</p>
        <code>npm run seed</code>
        <button className="btn" onClick={() => setRetryKey((k) => k + 1)}>
          再読み込み
        </button>
      </div>
    )
  }

  // チーム画面でチーム未指定なら、先頭のチームを表示する
  const teamId = route.page === 'team' ? (route.id ?? orgs[0]?.id) : undefined
  const activeTeamId =
    route.page === 'person' ? currentTeamOf(data, route.id) : route.page === 'team' ? teamId : undefined

  return (
    <div className="layout">
      <a className="skip-link" href="#main">
        本文へ移動
      </a>
      <nav className="sidebar" aria-label="チーム">
        <div className="brand">
          スキルマップ
        </div>
        <h2 className="nav-title">チーム</h2>
        <ul>
          {orgs.map((o) => {
            return (
              <li key={o.id}>
                <a href={teamHref(o.id)} aria-current={o.id === activeTeamId ? 'page' : undefined}>
                  <span>{o.name}</span>
                </a>
              </li>
            )
          })}
        </ul>
      </nav>

      <main id="main" className="main">
        {route.page === 'person' ? (
          <PersonPage
            data={data}
            personId={route.id}
            onEvaluate={(personId, skillId) => setDialog({ kind: 'assess', personId, skillId })}
            onTransfer={(personId) => setDialog({ kind: 'transfer', personId })}
            onAddRecord={(recordKind) => setDialog({ kind: 'record', recordKind, personId: route.id })}
            onToast={toast}
          />
        ) : teamId ? (
          <TeamPage
            data={data}
            orgId={teamId}
            onEvaluate={(personId, skillId) => setDialog({ kind: 'assess', personId, skillId })}
            onAddSkill={() => setDialog({ kind: 'teamSkill', orgId: teamId })}
            onEditSkill={(requirementId) => setDialog({ kind: 'teamSkill', orgId: teamId, requirementId })}
            onToast={toast}
          />
        ) : (
          <p className="empty">チームが登録されていません。</p>
        )}
      </main>

      {dialog?.kind === 'assess' && (
        <AssessmentDialog
          data={data}
          personId={dialog.personId}
          skillId={dialog.skillId}
          onClose={() => setDialog(undefined)}
          onSaved={toast}
        />
      )}
      {dialog?.kind === 'transfer' && (
        <TransferDialog
          data={data}
          personId={dialog.personId}
          onClose={() => setDialog(undefined)}
          onSaved={toast}
        />
      )}
      {dialog?.kind === 'record' && (
        <PersonRecordDialog
          kind={dialog.recordKind}
          person={data.persons.find((p) => p.id === dialog.personId)!}
          onClose={() => setDialog(undefined)}
          onSaved={toast}
        />
      )}
      {dialog?.kind === 'teamSkill' && (
        <TeamSkillDialog
          data={data}
          orgId={dialog.orgId}
          requirementId={dialog.requirementId}
          onClose={() => setDialog(undefined)}
          onSaved={toast}
        />
      )}
      <Toasts items={toasts} />
    </div>
  )
}

function currentTeamOf(data: Dataset, personId: string): string | undefined {
  return data.assignments.find((a) => a.personId === personId && a.endDate === null)?.orgId
}
