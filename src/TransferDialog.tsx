import { useState, type FormEvent } from 'react'
import { currentAssignment, type Dataset } from './calc'
import { transferPerson } from './data'
import { Dialog, today } from './ui'

export function TransferDialog({
  data,
  personId,
  onClose,
  onSaved,
}: {
  data: Dataset
  personId: string
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const person = data.persons.find((p) => p.id === personId)!
  const cur = currentAssignment(data.assignments, personId)
  const curOrg = data.orgs.find((o) => o.id === cur?.orgId)
  const candidates = data.orgs.filter((o) => o.isActive && o.id !== cur?.orgId)

  const [toOrgId, setToOrgId] = useState('')
  const [date, setDate] = useState(today())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()
  const [touched, setTouched] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (!toOrgId || !date || saving) return
    setSaving(true)
    setError(undefined)
    try {
      await transferPerson({ personId, currentAssignmentId: cur?.id, toOrgId, date })
      const to = data.orgs.find((o) => o.id === toOrgId)
      onSaved(`${person.name} さんを「${to?.name}」へ異動しました。これまでのスキルは保持されます`)
      onClose()
    } catch (err) {
      setError(`異動を保存できませんでした。もう一度お試しください。(${(err as Error).message})`)
      setSaving(false)
    }
  }

  return (
    <Dialog title="異動" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <p className="dialog-sub">
          <b>{person.name}</b> さん ／ 現所属: <b>{curOrg?.name ?? '未所属'}</b>
        </p>
        <div className="field">
          <label htmlFor="toOrg">異動先チーム</label>
          <select id="toOrg" value={toOrgId} onChange={(e) => setToOrgId(e.target.value)}>
            <option value="">選択してください</option>
            {candidates.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          {touched && !toOrgId && <p className="error-text">異動先を選んでください</p>}
        </div>
        <div className="field">
          <label htmlFor="transferDate">異動日</label>
          <input id="transferDate" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
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
            {saving ? '保存中…' : error ? '再試行して保存' : '異動する'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
