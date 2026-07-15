import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDocument, useCollection, updateDocument } from '../hooks/useFirestore';
import SkillTree from '../components/SkillTree';
import Icon from '../components/Icon';
import styles from './TeamPage.module.css';

export default function TeamPage() {
  const { teamId } = useParams();
  const { data: team, loading: teamLoading } = useDocument('teams', teamId);
  const { data: allMembers, loading: membersLoading } = useCollection('members');
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [view, setView] = useState('member'); // 'member' | 'overview'

  const members = allMembers.filter(m => m.teamId === teamId);
  const selectedMember = members.find(m => m.id === selectedMemberId) || members[0] || null;

  if (teamLoading || membersLoading) return <div className={styles.loading}>Loading...</div>;
  if (!team) return <div className={styles.loading}>チームが見つかりません</div>;

  const skills = team.skills || [];

  const handleLevelChange = async (skillId, level) => {
    if (!selectedMember) return;
    const updated = { ...selectedMember.skillLevels, [skillId]: level };
    await updateDocument('members', selectedMember.id, { skillLevels: updated });
  };

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <Link to={`/dept/${team.departmentId || 'unclassified'}`} className={styles.back}><Icon name="back" size={16} /> 部門へ戻る</Link>
        <div className={styles.viewToggle}>
          <button
            className={`${styles.toggleBtn} ${view === 'member' ? styles.active : ''}`}
            onClick={() => setView('member')}
          >個人スキル</button>
          <button
            className={`${styles.toggleBtn} ${view === 'overview' ? styles.active : ''}`}
            onClick={() => setView('overview')}
          >チーム概観</button>
          <Link to={`/team/${teamId}/manage`} className={styles.toggleBtn}>
            <Icon name="settings" size={15} /> 管理
          </Link>
        </div>
      </div>

      <h1 className={styles.teamTitle}>
        <span className={styles.teamTitleIcon}><Icon name="team" size={20} /></span> {team.name}
      </h1>

      {view === 'member' && (
        <>
          <div className={styles.memberSelector}>
            {members.map(m => (
              <button
                key={m.id}
                className={`${styles.memberBtn} ${m.id === (selectedMember?.id) ? styles.memberBtnActive : ''}`}
                onClick={() => setSelectedMemberId(m.id)}
              >
                <div className={styles.memberAvatar}>{m.name[0]}</div>
                <div className={styles.memberBtnName}>{m.name}</div>
                <div className={styles.memberBtnLevel}>
                  Avg {calcAvg(m.skillLevels)}
                </div>
              </button>
            ))}
          </div>

          {selectedMember && (
            <div className={styles.treeSection}>
              <div className={styles.treeSectionHeader}>
                <h2 className={styles.memberName}>{selectedMember.name} のスキルマップ</h2>
                <p className={styles.editHint}>スキルノードをクリックしてレベルを変更</p>
              </div>
              <SkillTree
                skills={skills}
                skillLevels={selectedMember.skillLevels}
                editable={true}
                onLevelChange={handleLevelChange}
              />
            </div>
          )}
        </>
      )}

      {view === 'overview' && (
        <div className={styles.overviewGrid}>
          {members.map(m => (
            <div key={m.id} className={styles.overviewCard}>
              <div className={styles.overviewHeader}>
                <div className={styles.memberAvatar}>{m.name[0]}</div>
                <div>
                  <div className={styles.overviewName}>{m.name}</div>
                  <div className={styles.overviewAvg}>平均 Lv.{calcAvg(m.skillLevels)}</div>
                </div>
              </div>
              <SkillTree
                skills={skills}
                skillLevels={m.skillLevels}
                editable={false}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function calcAvg(skillLevels) {
  const vals = Object.values(skillLevels || {}).filter(v => v > 0);
  if (!vals.length) return '—';
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
}
