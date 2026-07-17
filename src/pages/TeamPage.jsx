import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useData } from '../data/DataContext';
import SkillTree from '../components/SkillTree';
import Icon from '../components/Icon';
import styles from './TeamPage.module.css';

/** チーム画面。スキルマップ（メンバー別ツリー）とスキル管理（CRUD）の2タブ */
export default function TeamPage() {
  const { teamCode } = useParams();
  const { loading, departments, teams, membersOfTeam } = useData();
  const [tab, setTab] = useState('map');
  const [selectedId, setSelectedId] = useState(null);

  // チームを切り替えたら選択状態を初期化する
  useEffect(() => {
    setTab('map');
    setSelectedId(null);
  }, [teamCode]);

  const team = teams.find((t) => t.code === teamCode);
  const teamMembers = useMemo(
    () => (team ? membersOfTeam(team.code) : []),
    [team, membersOfTeam],
  );

  if (loading) return null;
  if (!team) return <p className={styles.notFound}>チームが見つかりません。</p>;

  const dept = departments.find((d) => d.code === team.parentDeptCode);
  const skills = team.skills ?? [];
  const selected =
    teamMembers.find((m) => m.id === selectedId) ?? teamMembers[0] ?? null;

  const setLevel = (skillId, level) =>
    updateDoc(doc(db, 'members', selected.id), {
      [`skillLevels.${skillId}`]: level,
    });

  return (
    <div>
      <header className={styles.header}>
        {dept && (
          <Link to={`/dept/${dept.code}`} className={styles.breadcrumb}>
            {dept.name}
          </Link>
        )}
        <h1 className={styles.title}>{team.name}</h1>
        <p className={styles.meta}>
          {teamMembers.length} 名 ・ スキル {skills.length} 件
        </p>
      </header>

      <div className={styles.tabs}>
        <button
          className={tab === 'map' ? styles.tabActive : styles.tab}
          onClick={() => setTab('map')}
        >
          スキルマップ
        </button>
        <button
          className={tab === 'manage' ? styles.tabActive : styles.tab}
          onClick={() => setTab('manage')}
        >
          スキル管理
        </button>
      </div>

      {tab === 'map' && (
        <>
          {teamMembers.length === 0 ? (
            <p className={styles.empty}>
              このチームに所属するメンバーはいません。所属はマスタ側（社員の「チーム」）で管理されています。
            </p>
          ) : (
            <>
              <div className={styles.memberChips}>
                {teamMembers.map((m) => (
                  <button
                    key={m.id}
                    className={
                      selected?.id === m.id ? styles.chipActive : styles.chip
                    }
                    onClick={() => setSelectedId(m.id)}
                  >
                    {m.displayName}
                  </button>
                ))}
              </div>
              {selected && (
                <SkillTree
                  skills={skills}
                  levels={selected.skillLevels ?? {}}
                  onLevelChange={setLevel}
                />
              )}
            </>
          )}
        </>
      )}

      {tab === 'manage' && <SkillManager team={team} />}
    </div>
  );
}

/** スキルの追加・名称変更・削除。チームドキュメントの skills 配列を更新する */
function SkillManager({ team }) {
  const [category, setCategory] = useState('');
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const skills = team.skills ?? [];
  const categories = [...new Set(skills.map((s) => s.category || 'その他'))];

  const save = (nextSkills) =>
    updateDoc(doc(db, 'teams', team.code), { skills: nextSkills });

  const addSkill = (e) => {
    e.preventDefault();
    if (!category.trim() || !name.trim()) return;
    save([
      ...skills,
      { id: crypto.randomUUID(), category: category.trim(), name: name.trim() },
    ]);
    setName('');
  };

  const renameSkill = (id) => {
    if (!editingName.trim()) return;
    save(skills.map((s) => (s.id === id ? { ...s, name: editingName.trim() } : s)));
    setEditingId(null);
  };

  const removeSkill = (skill) => {
    if (!window.confirm(`スキル「${skill.name}」を削除しますか？各メンバーのレベルも表示されなくなります。`)) return;
    save(skills.filter((s) => s.id !== skill.id));
  };

  return (
    <div>
      <form className={styles.addForm} onSubmit={addSkill}>
        <input
          className={styles.input}
          placeholder="大分類（例: 醸造技術）"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          list="categories"
        />
        <datalist id="categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <input
          className={styles.input}
          placeholder="スキル名（例: 麹づくり）"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className={styles.addButton}>
          <Icon name="plus" size={16} />
          追加
        </button>
      </form>

      {skills.length === 0 ? (
        <p className={styles.empty}>スキルが未登録です。上のフォームから追加してください。</p>
      ) : (
        categories.map((cat) => (
          <section key={cat} className={styles.manageGroup}>
            <h3 className={styles.manageCategory}>{cat}</h3>
            <ul className={styles.skillRows}>
              {skills
                .filter((s) => (s.category || 'その他') === cat)
                .map((skill) => (
                  <li key={skill.id} className={styles.skillRow}>
                    {editingId === skill.id ? (
                      <>
                        <input
                          className={styles.input}
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          autoFocus
                        />
                        <button
                          className={styles.rowButton}
                          onClick={() => renameSkill(skill.id)}
                          title="保存"
                        >
                          <Icon name="check" size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className={styles.skillName}>{skill.name}</span>
                        <button
                          className={styles.rowButton}
                          onClick={() => {
                            setEditingId(skill.id);
                            setEditingName(skill.name);
                          }}
                          title="名称変更"
                        >
                          <Icon name="pencil" size={16} />
                        </button>
                      </>
                    )}
                    <button
                      className={styles.rowButtonDanger}
                      onClick={() => removeSkill(skill)}
                      title="削除"
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </li>
                ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
