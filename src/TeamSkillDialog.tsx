import { useState, type FormEvent } from 'react'
import type { Dataset } from './calc'
import { createSkillForTeam, linkSkillToTeam, removeSkillFromTeam, updateSkillAndRequirement } from './data'
import { Dialog } from './ui'

const NEW = '__new__'

/** チームのスキル一覧から開くスキル管理ダイアログ。追加(requirementId なし)・編集・外す */
export function TeamSkillDialog({
  data,
  orgId,
  requirementId,
  onClose,
  onSaved,
}: {
  data: Dataset
  orgId: string
  requirementId?: string
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const org = data.orgs.find((o) => o.id === orgId)!
  const requirement = requirementId ? data.requirements.find((r) => r.id === requirementId) : undefined
  const skill = requirement ? data.skills.find((s) => s.id === requirement.skillId) : undefined
  const editing = !!(requirement && skill)

  // 追加時に選べる既存スキル: このチームが現在要求していないもの(外したものも含む)
  const requiredNow = new Set(
    data.requirements.filter((r) => r.orgId === orgId && r.isActive).map((r) => r.skillId),
  )
  const candidates = data.skills
    .filter((s) => s.isActive && !requiredNow.has(s.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'ja'))
  // 追加したスキルはチームの一覧の末尾に置く
  const nextOrder =
    Math.max(0, ...data.requirements.filter((r) => r.orgId === orgId && r.isActive).map((r) => r.order ?? 0)) + 1
  const versions = skill
    ? data.skillVersions.filter((v) => v.skillId === skill.id).sort((a, b) => b.version - a.version)
    : []

  const [existingId, setExistingId] = useState(NEW)
  const [name, setName] = useState(skill?.name ?? '')
  const [criteria, setCriteria] = useState(skill?.criteria ?? '')
  const [important, setImportant] = useState(skill?.important ?? false)
  const [count, setCount] = useState(String(requirement?.requiredCount ?? 1))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()
  const [touched, setTouched] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)

  const useExisting = !editing && existingId !== NEW
  const countNum = Number(count)
  const problems = {
    name: useExisting || name.trim() ? '' : 'スキル名を入力してください',
    count: Number.isInteger(countNum) && countNum >= 0 ? '' : '0以上の整数を入力してください',
  }
  const invalid = Object.values(problems).some(Boolean)

  async function run(action: () => Promise<void>, doneMessage: string) {
    setSaving(true)
    setError(undefined)
    try {
      await action()
      onSaved(doneMessage)
      onClose()
    } catch (err) {
      setError(`保存できませんでした。入力内容はそのまま残っています。もう一度お試しください。(${(err as Error).message})`)
      setSaving(false)
    }
  }

  /** 結果メッセージを保存処理が決める版(通知文に新しい版番号を入れる) */
  async function runWith(action: () => Promise<string>) {
    setSaving(true)
    setError(undefined)
    try {
      const message = await action()
      onSaved(message)
      onClose()
    } catch (err) {
      setError(`保存できませんでした。入力内容はそのまま残っています。もう一度お試しください。(${(err as Error).message})`)
      setSaving(false)
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (invalid || saving) return
    const input = { name: name.trim(), criteria: criteria.trim(), important }
    if (editing) {
      return runWith(async () => {
        const v = await updateSkillAndRequirement({
          current: skill,
          skill: input,
          requirementId: requirement.id,
          requiredCount: countNum,
        })
        return v ? `スキル「${input.name}」を更新しました（基準の版 v${v}）` : `スキル「${input.name}」を更新しました`
      })
    }
    if (useExisting) {
      const target = data.skills.find((s) => s.id === existingId)!
      const previous = data.requirements.find((r) => r.orgId === orgId && r.skillId === existingId)
      return run(
        () =>
          linkSkillToTeam({
            skillId: existingId,
            orgId,
            requiredCount: countNum,
            order: nextOrder,
            existingRequirementId: previous?.id,
          }),
        `「${target.name}」を${org.name}に追加しました`,
      )
    }
    return run(
      () => createSkillForTeam({ skill: input, orgId, requiredCount: countNum, order: nextOrder }),
      `スキル「${input.name}」を${org.name}に追加しました`,
    )
  }

  return (
    <Dialog title={editing ? 'スキルを編集' : 'スキルを追加'} onClose={onClose} wide>
      <form onSubmit={submit} noValidate>
        {!editing && (
          <div className="field">
            <label htmlFor="ts-existing">スキル</label>
            <select id="ts-existing" value={existingId} onChange={(e) => setExistingId(e.target.value)}>
              <option value={NEW}>新しいスキルを作る</option>
              {candidates.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {!useExisting && (
          <>
            <div className="field">
              <label htmlFor="ts-name">スキル名</label>
              <input id="ts-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
              {touched && problems.name && <p className="error-text">{problems.name}</p>}
            </div>
            <div className="field">
              <label htmlFor="ts-criteria">基準</label>
              <textarea id="ts-criteria" rows={5} value={criteria} onChange={(e) => setCriteria(e.target.value)} />
            </div>
            <label className="check">
              <input type="checkbox" checked={important} onChange={(e) => setImportant(e.target.checked)} />
              コアスキル
            </label>
            {editing && versions.length > 0 && (
              <details className="history">
                <summary>
                  版の履歴（現在 v{skill.version}／全{versions.length}版）
                </summary>
                <ul>
                  {versions.map((v) => (
                    <li key={v.id}>
                      <span className="tag">v{v.version}</span>{' '}
                      <span className="muted">{new Date(v.createdAt).toLocaleString('ja-JP')}</span>
                      <div className="basis">
                        {v.name}
                        {v.important ? '（コア）' : ''}
                      </div>
                      {v.criteria && <div className="basis">{v.criteria}</div>}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}

        <div className="field" style={{ marginTop: 14 }}>
          <label htmlFor="ts-count">適正人数（{org.name}）</label>
          <input
            id="ts-count"
            type="number"
            min={0}
            step={1}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            style={{ width: 120 }}
          />
          {touched && problems.count && <p className="error-text">{problems.count}</p>}
        </div>

        {error && (
          <p className="error-box" role="alert">
            {error}
          </p>
        )}

        <div className="dialog-actions">
          {editing && !confirmRemove && (
            <button type="button" className="btn danger spacer" onClick={() => setConfirmRemove(true)} disabled={saving}>
              このチームから外す
            </button>
          )}
          {editing && confirmRemove ? (
            <>
              <span className="spacer">
                「<b>{skill.name}</b>」を外します。評価履歴は残ります。
              </span>
              <button type="button" className="btn" onClick={() => setConfirmRemove(false)} disabled={saving}>
                戻る
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={saving}
                onClick={() =>
                  run(() => removeSkillFromTeam(requirement.id), `「${skill.name}」を${org.name}から外しました`)
                }
              >
                {saving ? '処理中…' : '外す'}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn" onClick={onClose} disabled={saving}>
                キャンセル
              </button>
              <button type="submit" className="btn primary" disabled={saving}>
                {saving ? '保存中…' : error ? '再試行して保存' : '保存'}
              </button>
            </>
          )}
        </div>
      </form>
    </Dialog>
  )
}
