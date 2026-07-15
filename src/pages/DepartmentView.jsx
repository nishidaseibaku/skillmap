import { useParams, Link } from 'react-router-dom';
import { useCollection } from '../hooks/useFirestore';
import Icon from '../components/Icon';
import styles from './DepartmentView.module.css';

export default function DepartmentView() {
  const { deptId } = useParams();
  const { data: departments, loading: dLoading } = useCollection('departments');
  const { data: teams, loading: tLoading } = useCollection('teams');
  const { data: members } = useCollection('members');

  if (dLoading || tLoading) return <div className={styles.loading}>読み込み中...</div>;

  const isUnclassified = deptId === 'unclassified';
  const deptIds = new Set(departments.map((d) => d.id));
  const dept = departments.find((d) => d.id === deptId);

  const deptTeams = isUnclassified
    ? teams.filter((t) => !t.departmentId || !deptIds.has(t.departmentId))
    : teams.filter((t) => t.departmentId === deptId);

  const title = isUnclassified ? '未分類' : dept?.name || '部門';

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
        {isUnclassified && (
          <p className={styles.note}>まだ所属部門を推定できていないチームです。社員の deptCode / teamCode が揃うと自動で各部門へ移動します。</p>
        )}
      </header>

      {deptTeams.length === 0 ? (
        <div className={styles.empty}>この部門に表示できるチームがありません。</div>
      ) : (
        <div className={styles.grid}>
          {deptTeams.map((team) => {
            const teamMembers = members.filter((m) => m.teamId === team.id);
            return (
              <Link key={team.id} to={`/team/${team.id}`} className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardIcon}><Icon name="team" size={18} /></span>
                  <span className={styles.cardName}>{team.name}</span>
                </div>
                <div className={styles.cardStats}>
                  <div className={styles.stat}>
                    <span className={styles.statValue}>{teamMembers.length}</span>
                    <span className={styles.statLabel}>メンバー</span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statValue}>{team.skills?.length ?? 0}</span>
                    <span className={styles.statLabel}>スキル</span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statValue}>{calcAvgLevel(teamMembers)}</span>
                    <span className={styles.statLabel}>平均Lv</span>
                  </div>
                </div>
                <div className={styles.open}>
                  スキルツリーを開く <Icon name="back" size={14} className={styles.openArrow} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function calcAvgLevel(members) {
  let total = 0, count = 0;
  for (const m of members) {
    for (const v of Object.values(m.skillLevels || {})) { total += v; count++; }
  }
  if (!count) return '—';
  return (total / count).toFixed(1);
}
