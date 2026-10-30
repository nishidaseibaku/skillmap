import { useEffect, useRef, type ReactNode } from 'react'
import type { SkillStatus } from './calc'
import { levelShort, type Level } from './types'

/** ネイティブ <dialog>。フォーカストラップ・Esc・背面の操作無効化をブラウザに任せる */
export function Dialog({
  title,
  onClose,
  children,
  wide,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const el = ref.current
    if (el && !el.open) el.showModal()
  }, [])
  return (
    <dialog
      ref={ref}
      className={wide ? 'dialog wide' : 'dialog'}
      aria-labelledby="dialog-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close()
      }}
    >
      <div className="dialog-body">
        <div className="dialog-head">
          <h2 id="dialog-title">{title}</h2>
          <button type="button" className="icon-btn" aria-label="閉じる" onClick={() => ref.current?.close()}>
            ×
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}

/** レベルは色だけに頼らず、数字と名称を併記する */
export function LevelBadge({
  level,
  compact,
  dashed,
}: {
  level: Level
  compact?: boolean
  /** 破線の外枠。評価時点から基準が変わっている(旧基準)ことを示す */
  dashed?: boolean
}) {
  return (
    <span className={`level level-${level}${compact ? ' compact' : ''}${dashed ? ' dashed' : ''}`}>
      <b>{level}</b>
      {!compact && <span>{levelShort(level)}</span>}
    </span>
  )
}

export function Unrated() {
  return <span className="unrated">未評価</span>
}

const STATUS_LABEL: Record<SkillStatus, string> = {
  none: '習得者なし',
  single: '属人化',
  short: '不足',
  ok: '充足',
}

export function SkillStatusBadge({ status }: { status: SkillStatus }) {
  const icon = status === 'ok' ? '✓' : status === 'short' ? '▲' : '!'
  return (
    <span className={`status status-${status}`}>
      <span aria-hidden="true">{icon}</span> {STATUS_LABEL[status]}
    </span>
  )
}

/** チーム上部の集計カード。集計値は calc.teamStats が配列で返すので、ここは並べるだけ */
export function StatCards({
  stats,
}: {
  stats: { key: string; label: string; rate?: number; detail: string }[]
}) {
  return (
    <section className="stat-cards" aria-label="集計">
      {stats.map((s) => (
        <div key={s.key} className="stat-card">
          <span className="stat-label">{s.label}</span>
          <span className="stat-value">{s.rate === undefined ? '—' : `${Math.round(s.rate * 100)}%`}</span>
          {s.rate !== undefined && (
            <div className="stat-bar" aria-hidden="true">
              <div style={{ width: `${s.rate * 100}%` }} />
            </div>
          )}
          <small>{s.detail}</small>
        </div>
      ))}
    </section>
  )
}

export function Toasts({ items }: { items: { id: number; text: string }[] }) {
  return (
    <div className="toasts" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className="toast">
          {t.text}
        </div>
      ))}
    </div>
  )
}

export const today = () => {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}
