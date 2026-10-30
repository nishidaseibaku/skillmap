import { useMemo, useState, type FormEvent } from 'react'
import { criteriaAt, currentAssessment, isStaleCriteria, type Dataset } from './calc'
import { addAssessment } from './data'
import { Dialog, LevelBadge, today } from './ui'
import { LEVELS, type Level } from './types'

const ASSESSOR_KEY = 'skillmap.assessor'
const loadAssessor = () => {
  try {
    return localStorage.getItem(ASSESSOR_KEY) ?? ''
  } catch {
    return ''
  }
}

export function AssessmentDialog({
  data,
  personId,
  skillId,
  onClose,
  onSaved,
}: {
  data: Dataset
  personId: string
  skillId: string
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const person = data.persons.find((p) => p.id === personId)!
  const skill = data.skills.find((s) => s.id === skillId)!
  const current = currentAssessment(data.assessments, personId, skillId)

  const [level, setLevel] = useState<Level | undefined>(current?.level)
  const [assessedOn, setAssessedOn] = useState(today())
  const [assessor, setAssessor] = useState(loadAssessor)
  const [basis, setBasis] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()
  const [touched, setTouched] = useState(false)

  const history = useMemo(
    () =>
      data.assessments
        .filter((a) => a.personId === personId && a.skillId === skillId)
        .sort((a, b) => b.assessedOn.localeCompare(a.assessedOn) || b.createdAt - a.createdAt),
    [data.assessments, personId, skillId],
  )

  const problems = {
    level: level === undefined ? 'レベルを選んでください' : '',
    date: assessedOn ? '' : '評価日を入力してください',
    assessor: assessor.trim() ? '' : '評価者を入力してください',
    basis: basis.trim() ? '' : '根拠を入力してください',
  }
  const invalid = Object.values(problems).some(Boolean)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (invalid || level === undefined || saving) return
    setSaving(true)
    setError(undefined)
    try {
      await addAssessment({
        personId,
        skillId,
        level,
        assessedOn,
        assessor: assessor.trim(),
        basis: basis.trim(),
        skillVersion: skill.version ?? 1,
      })
      try {
        localStorage.setItem(ASSESSOR_KEY, assessor.trim())
      } catch {
        /* 保存できなくても評価登録は成功扱い */
      }
      onSaved(`${person.name} さんの「${skill.name}」を評価として保存しました`)
      onClose()
    } catch (err) {
      // 入力内容は保持したまま、再試行できるようにする
      setError(`保存できませんでした。入力内容はそのまま残っています。もう一度お試しください。(${(err as Error).message})`)
      setSaving(false)
    }
  }

  return (
    <Dialog title="スキル評価を登録" onClose={onClose} wide>
      <form onSubmit={submit} noValidate>
        <p className="dialog-sub">
          <b>{person.name}</b> さん ／ <b>{skill.name}</b>
        </p>

        <p className="now">
          現在の評価:{' '}
          {current ? (
            <>
              <LevelBadge level={current.level} /> <span className="muted">{current.assessedOn} / {current.assessor}</span>
            </>
          ) : (
            <span className="unrated">未評価</span>
          )}
        </p>

        <fieldset className="field">
          <legend>レベル</legend>
          <div className="level-choices">
            {LEVELS.map((l) => (
              <label key={l.level} className={level === l.level ? 'choice selected' : 'choice'}>
                <input
                  type="radio"
                  name="level"
                  value={l.level}
                  checked={level === l.level}
                  onChange={() => setLevel(l.level)}
                />
                <LevelBadge level={l.level} compact />
                <span className="choice-text">
                  <b>{l.short}</b>
                  <small>{l.description}</small>
                </span>
              </label>
            ))}
          </div>
          {touched && problems.level && <p className="error-text">{problems.level}</p>}
        </fieldset>

        <div className="field-row">
          <div className="field">
            <label htmlFor="assessedOn">評価日</label>
            <input id="assessedOn" type="date" value={assessedOn} onChange={(e) => setAssessedOn(e.target.value)} />
            {touched && problems.date && <p className="error-text">{problems.date}</p>}
          </div>
          <div className="field">
            <label htmlFor="assessor">評価者</label>
            <input
              id="assessor"
              value={assessor}
              onChange={(e) => setAssessor(e.target.value)}
              placeholder="例: 山田 太郎"
              autoComplete="off"
            />
            {touched && problems.assessor && <p className="error-text">{problems.assessor}</p>}
          </div>
        </div>

        <div className="field">
          <label htmlFor="basis">根拠</label>
          <textarea
            id="basis"
            rows={3}
            value={basis}
            onChange={(e) => setBasis(e.target.value)}
            placeholder="例: 10/15 の作業観察で、手順通り単独で完了できた"
          />
          {touched && problems.basis && <p className="error-text">{problems.basis}</p>}
        </div>

        {history.length > 0 && (
          <details className="history">
            <summary>この人・このスキルの評価履歴（{history.length}件）</summary>
            <ul>
              {history.map((h) => (
                <li key={h.id}>
                  <LevelBadge level={h.level} compact />{' '}
                  <span className="tag">基準 v{h.skillVersion ?? 1}</span>
                  {isStaleCriteria(data, h) && <span className="tag tag-draft">旧基準</span>}{' '}
                  <span className="muted">
                    {h.assessedOn} / {h.assessor}
                  </span>
                  {isStaleCriteria(data, h) && <div className="basis">当時の基準: {criteriaAt(data, h)}</div>}
                  {h.basis && <div className="basis">{h.basis}</div>}
                </li>
              ))}
            </ul>
          </details>
        )}

        {error && (
          <p className="error-box" role="alert">
            {error}
          </p>
        )}

        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose} disabled={saving}>
            キャンセル
          </button>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? '保存中…' : error ? '再試行して保存' : '保存'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
