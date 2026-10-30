import { useState, type FormEvent } from 'react'
import { MAX_CERTIFICATE_BYTES, addLicense, addTraining } from './data'
import { Dialog, today } from './ui'
import { COMPLETIONS, type Completion, type Person } from './types'

/** 資格・免許 / 研修受講履歴の登録ダイアログ。証明書ファイルは任意 */
export function PersonRecordDialog({
  kind,
  person,
  onClose,
  onSaved,
}: {
  kind: 'license' | 'training'
  person: Person
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const isLicense = kind === 'license'
  const [name, setName] = useState('')
  const [date, setDate] = useState(today())
  const [expiresOn, setExpiresOn] = useState('')
  const [completion, setCompletion] = useState<Completion>('修了')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()
  const [touched, setTouched] = useState(false)

  const problems = {
    name: name.trim() ? '' : isLicense ? '資格・免許の名称を入力してください' : '研修名を入力してください',
    date: date ? '' : isLicense ? '取得日を入力してください' : '受講日を入力してください',
    expires: isLicense && expiresOn && expiresOn < date ? '有効期限は取得日より後にしてください' : '',
    file: file && file.size > MAX_CERTIFICATE_BYTES ? 'ファイルは10MBまでです' : '',
  }
  const invalid = Object.values(problems).some(Boolean)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (invalid || saving) return
    setSaving(true)
    setError(undefined)
    try {
      if (isLicense) {
        await addLicense({
          personId: person.id,
          name: name.trim(),
          acquiredOn: date,
          expiresOn: expiresOn || null,
          file,
        })
      } else {
        await addTraining({ personId: person.id, name: name.trim(), attendedOn: date, completion, file })
      }
      onSaved(`${person.name} さんの${isLicense ? '資格・免許' : '研修'}「${name.trim()}」を登録しました`)
      onClose()
    } catch (err) {
      setError(`登録できませんでした。入力内容はそのまま残っています。もう一度お試しください。(${(err as Error).message})`)
      setSaving(false)
    }
  }

  return (
    <Dialog title={isLicense ? '資格・免許を登録' : '研修受講を登録'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <p className="dialog-sub">
          <b>{person.name}</b> さん
        </p>
        <div className="field">
          <label htmlFor="rec-name">{isLicense ? '資格・免許' : '研修名'}</label>
          <input id="rec-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
          {touched && problems.name && <p className="error-text">{problems.name}</p>}
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="rec-date">{isLicense ? '取得日' : '受講日'}</label>
            <input id="rec-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            {touched && problems.date && <p className="error-text">{problems.date}</p>}
          </div>
          {isLicense ? (
            <div className="field">
              <label htmlFor="rec-expires">有効期限（なければ空欄）</label>
              <input id="rec-expires" type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
              {touched && problems.expires && <p className="error-text">{problems.expires}</p>}
            </div>
          ) : (
            <div className="field">
              <label htmlFor="rec-completion">修了状況</label>
              <select id="rec-completion" value={completion} onChange={(e) => setCompletion(e.target.value as Completion)}>
                {COMPLETIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="field">
          <label htmlFor="rec-file">証明書（任意）</label>
          <input
            id="rec-file"
            type="file"
            accept="application/pdf,image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {touched && problems.file && <p className="error-text">{problems.file}</p>}
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
            {saving ? '登録中…' : error ? '再試行して登録' : '登録'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
