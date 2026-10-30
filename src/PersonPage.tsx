import { useState } from 'react'
import {
  currentAssignment,
  expiryState,
  isStaleCriteria,
  personView,
  type Dataset,
  type ExpiryState,
  type PersonSkillRow,
} from './calc'
import { cancelRecord, openCertificate } from './data'
import { goBack, teamHref } from './router'
import type { Certificate } from './types'
import { LevelBadge, Unrated, today } from './ui'

export function PersonPage({
  data,
  personId,
  onEvaluate,
  onTransfer,
  onAddRecord,
  onToast,
}: {
  data: Dataset
  personId: string
  onEvaluate: (personId: string, skillId: string) => void
  onTransfer: (personId: string) => void
  onAddRecord: (kind: 'license' | 'training') => void
  onToast: (message: string) => void
}) {
  const [extraSkill, setExtraSkill] = useState('')
  const [cancelling, setCancelling] = useState<string>()
  const person = data.persons.find((p) => p.id === personId)
  if (!person) return <p className="empty">人財が見つかりません。</p>

  const view = personView(data, personId)
  const cur = currentAssignment(data.assignments, personId)
  const skillName = (id: string) => data.skills.find((s) => s.id === id)
  const orgName = (id: string) => data.orgs.find((o) => o.id === id)?.name ?? id

  const history = data.assessments
    .filter((a) => a.personId === personId)
    .sort((a, b) => b.assessedOn.localeCompare(a.assessedOn) || b.createdAt - a.createdAt)
  const assignments = data.assignments
    .filter((a) => a.personId === personId)
    .sort((a, b) => b.startDate.localeCompare(a.startDate))

  const licenses = data.personLicenses
    .filter((l) => l.personId === personId && l.isActive)
    .sort((a, b) => b.acquiredOn.localeCompare(a.acquiredOn) || b.createdAt - a.createdAt)
  const trainings = data.trainings
    .filter((t) => t.personId === personId && t.isActive)
    .sort((a, b) => b.attendedOn.localeCompare(a.attendedOn) || b.createdAt - a.createdAt)
  const todayIso = today()

  async function cancel(kind: 'personLicenses' | 'trainings', id: string, name: string) {
    try {
      await cancelRecord(kind, id)
      onToast(`「${name}」を取り消しました`)
    } catch (err) {
      onToast(`取り消せませんでした。もう一度お試しください。(${(err as Error).message})`)
    } finally {
      setCancelling(undefined)
    }
  }

  const shownIds = new Set([...view.required, ...view.retained].map((r) => r.skill.id))
  const otherSkills = data.skills.filter((s) => s.isActive && !shownIds.has(s.id))


  return (
    <>
      <button
        type="button"
        className="back-btn"
        onClick={() => goBack(view.currentOrg ? teamHref(view.currentOrg.id) : '#/team')}
      >
        <span aria-hidden="true">←</span> 戻る
      </button>
      <header className="page-head person-head">
        <div>
          <h1>{person.name}</h1>
          <p className="muted">
            現所属:{' '}
            {view.currentOrg && cur ? <a href={teamHref(view.currentOrg.id)}>{view.currentOrg.name}</a> : '未所属'}
          </p>
        </div>
        <button type="button" className="btn" onClick={() => onTransfer(personId)}>
          異動する
        </button>
      </header>

      <section aria-labelledby="req-title">
        <h2 id="req-title">現所属の要求スキル</h2>
        {view.required.length === 0 ? (
          <p className="empty">現所属に要求スキルが登録されていません。</p>
        ) : (
          <SkillTable rows={view.required} personId={personId} onEvaluate={onEvaluate} showRequirement />
        )}
      </section>

      <section aria-labelledby="ret-title">
        <h2 id="ret-title">現所属外で保持しているスキル</h2>
        {view.retained.length === 0 ? (
          <p className="empty">該当するスキルはありません。</p>
        ) : (
          <SkillTable rows={view.retained} personId={personId} onEvaluate={onEvaluate} />
        )}
        {otherSkills.length > 0 && (
          <div className="add-skill">
            <label htmlFor="extra">別のスキルを評価する</label>
            <select id="extra" value={extraSkill} onChange={(e) => setExtraSkill(e.target.value)}>
              <option value="">スキルを選択…</option>
              {otherSkills.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn"
              disabled={!extraSkill}
              onClick={() => {
                onEvaluate(personId, extraSkill)
                setExtraSkill('')
              }}
            >
              評価を登録
            </button>
          </div>
        )}
      </section>

      <section aria-labelledby="lic-title">
        <div className="section-head">
          <h2 id="lic-title">資格・免許</h2>
          <button type="button" className="btn small" onClick={() => onAddRecord('license')}>
            登録
          </button>
        </div>
        {licenses.length === 0 ? (
          <p className="empty">登録された資格・免許はありません。</p>
        ) : (
          <div className="table-wrap">
            <table className="list">
              <thead>
                <tr>
                  <th scope="col">資格・免許</th>
                  <th scope="col">取得日</th>
                  <th scope="col">有効期限</th>
                  <th scope="col">証明書</th>
                  <th scope="col">
                    <span className="sr-only">操作</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {licenses.map((l) => (
                  <tr key={l.id}>
                    <td>{l.name}</td>
                    <td>{l.acquiredOn}</td>
                    <td>
                      {l.expiresOn ?? <span className="muted">なし</span>}
                      <ExpiryTag state={expiryState(l.expiresOn, todayIso)} />
                    </td>
                    <td>
                      <CertificateLink cert={l.certificate} onError={onToast} />
                    </td>
                    <td className="actions">
                      <CancelButton
                        id={l.id}
                        cancelling={cancelling}
                        setCancelling={setCancelling}
                        onConfirm={() => cancel('personLicenses', l.id, l.name)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="trn-title">
        <div className="section-head">
          <h2 id="trn-title">研修受講履歴</h2>
          <button type="button" className="btn small" onClick={() => onAddRecord('training')}>
            登録
          </button>
        </div>
        {trainings.length === 0 ? (
          <p className="empty">登録された研修受講履歴はありません。</p>
        ) : (
          <div className="table-wrap">
            <table className="list">
              <thead>
                <tr>
                  <th scope="col">研修名</th>
                  <th scope="col">受講日</th>
                  <th scope="col">修了状況</th>
                  <th scope="col">証明書</th>
                  <th scope="col">
                    <span className="sr-only">操作</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {trainings.map((t) => (
                  <tr key={t.id}>
                    <td>{t.name}</td>
                    <td>{t.attendedOn}</td>
                    <td>{t.completion}</td>
                    <td>
                      <CertificateLink cert={t.certificate} onError={onToast} />
                    </td>
                    <td className="actions">
                      <CancelButton
                        id={t.id}
                        cancelling={cancelling}
                        setCancelling={setCancelling}
                        onConfirm={() => cancel('trainings', t.id, t.name)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="hist-title">
        <h2 id="hist-title">評価履歴</h2>
        {history.length === 0 ? (
          <p className="empty">まだ評価がありません。</p>
        ) : (
          <div className="table-wrap">
            <table className="list">
              <thead>
                <tr>
                  <th scope="col">評価日</th>
                  <th scope="col">スキル</th>
                  <th scope="col">レベル</th>
                  <th scope="col">評価者</th>
                  <th scope="col">根拠</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td>{h.assessedOn}</td>
                    <td>
                      {skillName(h.skillId)?.name ?? h.skillId}
                      <span className="tag">v{h.skillVersion ?? 1}</span>
                      {isStaleCriteria(data, h) && <span className="tag tag-draft">旧基準</span>}
                    </td>
                    <td>
                      <LevelBadge level={h.level} />
                    </td>
                    <td>{h.assessor}</td>
                    <td className="basis-cell">{h.basis || <span className="muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="asg-title">
        <h2 id="asg-title">所属履歴</h2>
        <ul className="timeline">
          {assignments.map((a) => (
            <li key={a.id}>
              <b>{orgName(a.orgId)}</b>
              <span className="muted">
                {a.startDate} 〜 {a.endDate ?? '現在'}
              </span>
              {a.endDate === null && <span className="tag tag-official">現所属</span>}
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

function SkillTable({
  rows,
  personId,
  onEvaluate,
  showRequirement,
}: {
  rows: PersonSkillRow[]
  personId: string
  onEvaluate: (personId: string, skillId: string) => void
  showRequirement?: boolean
}) {
  return (
    <div className="table-wrap">
      <table className="list">
        <thead>
          <tr>
            <th scope="col">スキル</th>
            <th scope="col">基準</th>
            <th scope="col">現在のレベル</th>
            {showRequirement && <th scope="col">判定</th>}
            <th scope="col">
              <span className="sr-only">操作</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.skill.id}>
              <td>
                {r.skill.name}
                {r.skill.important && <span className="tag tag-important">コア</span>}
              </td>
              <td className="criteria-cell">{r.skill.criteria}</td>
              <td>
                {r.level ? <LevelBadge level={r.level} /> : <Unrated />}
              </td>
              {showRequirement && (
                <td>
                  {r.achieved ? (
                    <span className="status status-ok">
                      <span aria-hidden="true">✓</span> 達成
                    </span>
                  ) : (
                    <span className="status status-short">
                      <span aria-hidden="true">▲</span> 未達
                    </span>
                  )}
                </td>
              )}
              <td className="actions">
                <button type="button" className="btn small" onClick={() => onEvaluate(personId, r.skill.id)}>
                  評価する
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ExpiryTag({ state }: { state: ExpiryState }) {
  if (state === 'expired') return <span className="tag tag-expired">期限切れ</span>
  if (state === 'soon') return <span className="tag tag-draft">まもなく期限</span>
  return null
}

function CertificateLink({ cert, onError }: { cert: Certificate | null; onError: (message: string) => void }) {
  if (!cert) return <span className="muted">—</span>
  return (
    <button
      type="button"
      className="link-btn"
      onClick={() =>
        openCertificate(cert).catch((err: Error) => onError(`証明書を開けませんでした。(${err.message})`))
      }
    >
      {cert.name}
    </button>
  )
}

/** 物理削除はしないので「取り消す」。誤クリック防止に2段階にする */
function CancelButton({
  id,
  cancelling,
  setCancelling,
  onConfirm,
}: {
  id: string
  cancelling: string | undefined
  setCancelling: (id: string | undefined) => void
  onConfirm: () => void
}) {
  if (cancelling !== id) {
    return (
      <button type="button" className="btn small" onClick={() => setCancelling(id)}>
        取り消す
      </button>
    )
  }
  return (
    <>
      <button type="button" className="btn small danger" onClick={onConfirm}>
        取り消す（確定）
      </button>{' '}
      <button type="button" className="btn small" onClick={() => setCancelling(undefined)}>
        戻る
      </button>
    </>
  )
}
