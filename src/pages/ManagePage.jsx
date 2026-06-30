import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  useDocument, useCollection,
  updateDocument, addDocument, deleteDocument
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
        <MemberManager teamId={teamId} members={members} />
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

function MemberManager({ teamId, members }) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const addMember = async () => {
    if (!newName.trim()) return;
    await addDocument('members', { name: newName.trim(), teamId, skillLevels: {} });
    setNewName('');
    setAdding(false);
  };

  const saveMember = async (id) => {
    await updateDocument('members', id, { name: editName });
    setEditingId(null);
  };

  const deleteMember = async (id) => {
    if (!confirm('このメンバーを削除しますか？')) return;
    await deleteDocument('members', id);
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>メンバー一覧</h2>
        <button className={styles.addBtn} onClick={() => setAdding(v => !v)}>
          {adding ? 'キャンセル' : '+ メンバーを追加'}
        </button>
      </div>

      {adding && (
        <div className={styles.addForm}>
          <input
            className={styles.input}
            placeholder="氏名 *"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addMember()}
          />
          <button className={styles.saveBtn} onClick={addMember}>追加</button>
        </div>
      )}

      <table className={styles.table}>
        <thead>
          <tr>
            <th>氏名</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {members.map(m => (
            <tr key={m.id}>
              {editingId === m.id ? (
                <>
                  <td><input className={styles.input} value={editName} onChange={e => setEditName(e.target.value)} /></td>
                  <td>
                    <button className={styles.saveBtn} onClick={() => saveMember(m.id)}>保存</button>
                    <button className={styles.cancelBtn} onClick={() => setEditingId(null)}>キャンセル</button>
                  </td>
                </>
              ) : (
                <>
                  <td className={styles.skillNameCell}>{m.name}</td>
                  <td>
                    <button className={styles.editBtn} onClick={() => { setEditingId(m.id); setEditName(m.name); }}>編集</button>
                    <button className={styles.deleteBtn} onClick={() => deleteMember(m.id)}>削除</button>
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
