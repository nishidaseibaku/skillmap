import { useState, type DragEvent, type KeyboardEvent } from 'react'
import {
  activeMembers,
  currentAssessment,
  isStaleCriteria,
  moveId,
  teamSkillRows,
  teamStats,
  type Dataset,
} from './calc'
import { reorderRequirements } from './data'
import { personHref } from './router'
import { LevelBadge, StatCards, Unrated } from './ui'

export function TeamPage({
  data,
  orgId,
  onEvaluate,
  onAddSkill,
  onEditSkill,
  onToast,
}: {
  data: Dataset
  orgId: string
  onEvaluate: (personId: string, skillId: string) => void
  onAddSkill: () => void
  onEditSkill: (requirementId: string) => void
  onToast: (message: string) => void
}) {
  const [dragId, setDragId] = useState<string>()
  const [over, setOver] = useState<{ id: string; after: boolean }>()

  const org = data.orgs.find((o) => o.id === orgId)
  if (!org) return <p className="empty">チームが見つかりません。</p>

  const members = activeMembers(data.persons, data.assignments, orgId)
  const rows = teamSkillRows(data, orgId)
  const ids = rows.map((r) => r.requirement.id)

  function persist(next: string[]) {
    if (next.join() === ids.join()) return
    reorderRequirements(next).catch((err: Error) =>
      onToast(`並び順を保存できませんでした。もう一度お試しください。(${err.message})`),
    )
  }

  const endDrag = () => {
    setDragId(undefined)
    setOver(undefined)
  }

  function onRowDragOver(e: DragEvent<HTMLTableRowElement>, id: string) {
    if (!dragId) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const rect = e.currentTarget.getBoundingClientRect()
    setOver({ id, after: e.clientY > rect.top + rect.height / 2 })
  }

  function onRowDrop(e: DragEvent<HTMLTableRowElement>) {
    e.preventDefault()
    if (dragId && over && dragId !== over.id) persist(moveId(ids, dragId, over.id, over.after))
    endDrag()
  }

  // キーボードでも並べ替えられるようにする(↑↓)
  function onHandleKeyDown(e: KeyboardEvent<HTMLButtonElement>, id: string) {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    const i = ids.indexOf(id)
    const target = ids[e.key === 'ArrowUp' ? i - 1 : i + 1]
    if (target) persist(moveId(ids, id, target, e.key === 'ArrowDown'))
  }

  return (
    <>
      <header className="page-head person-head">
        <h1>{org.name}</h1>
        <button type="button" className="btn primary" onClick={onAddSkill}>
          スキルを追加
        </button>
      </header>

      {rows.length > 0 && <StatCards stats={teamStats(rows)} />}

      {rows.length === 0 ? (
        <p className="empty">このチームにはまだスキルが登録されていません。</p>
      ) : (
        <section aria-label="力量マトリクス">
          <div className="table-wrap">
            <table className="matrix">
              <thead>
                <tr>
                  <th className="sticky-col handle-col" scope="col">
                    <span className="sr-only">並び替え</span>
                  </th>
                  <th className="sticky-col core-col" scope="col">
                    コア
                  </th>
                  <th className="sticky-col skill-col" scope="col">
                    スキル
                  </th>
                  <th scope="col">基準</th>
                  {members.map((m) => (
                    <th key={m.id} scope="col" className="member-col">
                      <a href={personHref(m.id)}>{m.name}</a>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const id = r.requirement.id
                  const dropClass =
                    over?.id === id && dragId !== id ? (over.after ? ' drop-after' : ' drop-before') : ''
                  return (
                    <tr
                      key={id}
                      className={`${dragId === id ? 'dragging' : ''}${dropClass}`}
                      onDragOver={(e) => onRowDragOver(e, id)}
                      onDrop={onRowDrop}
                    >
                      <td className="sticky-col handle-col">
                      <button
                        type="button"
                        className="drag-handle"
                        draggable
                        title="ドラッグして並び替え（↑↓キーでも移動できます）"
                        aria-label={`${r.skill.name}の並び順を変更。上下キーで移動`}
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move'
                          e.dataTransfer.setData('text/plain', id)
                          const tr = e.currentTarget.closest('tr')
                          if (tr) e.dataTransfer.setDragImage(tr, 16, 16)
                          setDragId(id)
                        }}
                        onDragEnd={endDrag}
                        onKeyDown={(e) => onHandleKeyDown(e, id)}
                      >
                        ⋮⋮
                      </button>
                      </td>
                      <td className="sticky-col core-col core-mark">
                        {r.skill.important && (
                          <>
                            <span aria-hidden="true">〇</span>
                            <span className="sr-only">コアスキル</span>
                          </>
                        )}
                      </td>
                      <th className="sticky-col skill-col" scope="row">
                        <div className="skill-cell">
                          <button
                            type="button"
                            className="link-btn"
                            title="クリックして編集"
                            onClick={() => onEditSkill(id)}
                          >
                            {r.skill.name}
                          </button>
                        </div>
                      </th>
                      <td className="criteria-cell">{r.skill.criteria}</td>
                      {members.map((m) => {
                        const cur = currentAssessment(data.assessments, m.id, r.skill.id)
                        const below = cur !== undefined && cur.level < r.requirement.masteryLevel
                        const stale = cur !== undefined && isStaleCriteria(data, cur)
                        const label = cur ? `レベル${cur.level}` : '未評価'
                        return (
                          <td key={m.id} className="cell-td">
                            <button
                              type="button"
                              className={`cell ${below || !cur ? 'below' : ''}`}
                              aria-label={`${m.name}、${r.skill.name}: ${label}${stale ? '、旧基準での評価' : ''}。評価を登録`}
                              onClick={() => onEvaluate(m.id, r.skill.id)}
                            >
                              {cur ? <LevelBadge level={cur.level} compact dashed={stale} /> : <Unrated />}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  )
}
