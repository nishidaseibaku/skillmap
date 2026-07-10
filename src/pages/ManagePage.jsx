import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  useDocument, useCollection, updateDocument
} from '../hooks/useFirestore';
import styles from './ManagePage.module.css';

export default function ManagePage() {
  const { teamId } = useParams();
  const { data: team } = useDocument('teams', teamId);
  const { data: allMembers } = useCollection('members');
  const [tab, setTab] = useState('skills'); // 'skills' | 'members'

  const members = allMembers.filter(m => m.teamId === teamId);

  if (!team) return <div className={styles.loading}>Loading...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <Link to={`/team/${teamId}`} className={styles.back}>← {team.name}</Link>
        <h1 className={styles.title}>管理画面</h1>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'skills' ? styles.tabActive : ''}`}
          onClick={() => setTab('skills')}
        >スキル管理</button>
        <button
          className={`${styles.tab} ${tab === 'members' ? styles.tabActive : ''}`}
          onClick={() => setTab('members')}
        >メンバー管理</button>
      </div>

      {tab === 'skills' && (
        <SkillManager team={team} />
      )}
      {tab === 'members' && (
        <MemberManager teamId={teamId} members={members} allMembers={allMembers} />
      )}
    </div>
  );
}

function SkillManager({ team }) {
  const skills = team.skills || [];
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({});
  const [adding, setAdding] = useState(false);
  const [newSkill, setNewSkill] = useState({ name: '', majorCategory: '', minorCategory: '' });

  const saveEdit = async () => {
    const updated = skills.map(s => s.id === editingId ? { ...s, ...form } : s);
    await updateDocument('teams', team.id, { skills: updated });
    setEditingId(null);
  };

  const deleteSkill = async (skillId) => {
    const updated = skills.filter(s => s.id !== skillId);
    await updateDocument('teams', team.id, { skills: updated });
  };

  const addSkill = async () => {
    if (!newSkill.name.trim()) return;
    const id = `s${Date.now()}`;
    const updated = [...skills, { id, ...newSkill, order: skills.length }];
    await updateDocument('teams', team.id, { skills: updated });
    setNewSkill({ name: '', majorCategory: '', minorCategory: '' });
    setAdding(false);
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>スキル一覧</h2>
        <button className={styles.addBtn} onClick={() => setAdding(v => !v)}>
          {adding ? 'キャンセル' : '+ スキルを追加'}
        </button>
      </div>

      {adding && (
        <div className={styles.addForm}>
          <input
            className={styles.input}
            placeholder="スキル名 *"
            value={newSkill.name}
            onChange={e => setNewSkill(v => ({ ...v, name: e.target.value }))}
          />
          <input
            className={styles.input}
            placeholder="大分類"
            value={newSkill.majorCategory}
            onChange={e => setNewSkill(v => ({ ...v, majorCategory: e.target.value }))}
          />
          <input
            className={styles.input}
            placeholder="小分類"
            value={newSkill.minorCategory}
            onChange={e => setNewSkill(v => ({ ...v, minorCategory: e.target.value }))}
          />
          <button className={styles.saveBtn} onClick={addSkill}>追加</button>
        </div>
      )}

      <table className={styles.table}>
        <thead>
          <tr>
            <th>スキル名</th>
            <th>大分類</th>
            <th>小分類</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {skills.map(skill => (
            <tr key={skill.id}>
              {editingId === skill.id ? (
                <>
                  <td><input className={styles.input} value={form.name ?? skill.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></td>
                  <td><input className={styles.input} value={form.majorCategory ?? skill.majorCategory} onChange={e => setForm(f => ({ ...f, majorCategory: e.target.value }))} /></td>
                  <td><input className={styles.input} value={form.minorCategory ?? skill.minorCategory} onChange={e => setForm(f => ({ ...f, minorCategory: e.target.value }))} /></td>
                  <td>
                    <button className={styles.saveBtn} onClick={saveEdit}>保存</button>
                    <button className={styles.cancelBtn} onClick={() => setEditingId(null)}>キャンセル</button>
                  </td>
                </>
              ) : (
                <>
                  <td className={styles.skillNameCell}>{skill.name}</td>
                  <td className={styles.categoryCell}>{skill.majorCategory || '—'}</td>
                  <td className={styles.categoryCell}>{skill.minorCategory || '—'}</td>
                  <td>
                    <button className={styles.editBtn} onClick={() => { setEditingId(skill.id); setForm({}); }}>編集</button>
                    <button className={styles.deleteBtn} onClick={() => deleteSkill(skill.id)}>削除</button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MemberManager({ teamId, members, allMembers }) {
  const [picking, setPicking] = useState(false);
  const [selectedId, setSelectedId] = useState('');

  // どのチームにも属していない社員（マスタ取込後の未割当）
  const unassigned = allMembers.filter(m => !m.teamId);

  const assignMember = async () => {
    if (!selectedId) return;
    await updateDocument('members', selectedId, { teamId });
    setSelectedId('');
    setPicking(false);
  };

  const removeMember = async (id) => {
    if (!confirm('このメンバーをチームから外しますか？（社員データは残ります）')) return;
    await updateDocument('members', id, { teamId: null });
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>メンバー一覧</h2>
        <button className={styles.addBtn} onClick={() => setPicking(v => !v)}>
          {picking ? 'キャンセル' : '+ 社員をチームに追加'}
        </button>
      </div>

      {picking && (
        <div className={styles.addForm}>
          <select
            className={styles.input}
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
          >
            <option value="">未割当の社員を選択...</option>
            {unassigned.map(m => (
              <option key={m.id} value={m.id}>
                {m.name}{m.deptCode ? `（${m.deptCode}）` : ''}
              </option>
            ))}
          </select>
          <button className={styles.saveBtn} onClick={assignMember} disabled={!selectedId}>追加</button>
        </div>
      )}

      {picking && unassigned.length === 0 && (
        <p className={styles.hint}>未割当の社員がいません。右下の「マスタ同期」で社員を取り込んでください。</p>
      )}

      <table className={styles.table}>
        <thead>
          <tr>
            <th>氏名</th>
            <th>メール</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {members.map(m => (
            <tr key={m.id}>
              <td className={styles.skillNameCell}>{m.name}</td>
              <td className={styles.categoryCell}>{m.email || '—'}</td>
              <td>
                <button className={styles.deleteBtn} onClick={() => removeMember(m.id)}>チームから外す</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
