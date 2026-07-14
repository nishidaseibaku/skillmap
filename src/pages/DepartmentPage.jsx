import { Link } from 'react-router-dom';
import { useCollection } from '../hooks/useFirestore';
import Icon from '../components/Icon';
import styles from './DepartmentPage.module.css';

export default function DepartmentPage() {
  const { data: departments, loading: dLoading } = useCollection('departments');
  const { data: teams, loading: tLoading } = useCollection('teams');
  const { data: members } = useCollection('members');

  if (dLoading || tLoading) return <div className={styles.loading}>Loading...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>スキルマップ</h1>
        <p className={styles.subtitle}>人材育成状況ダッシュボード</p>
      </div>

      {departments.map(dept => {
        const deptTeams = teams.filter(t => t.departmentId === dept.id);
        return (
          <div key={dept.id} className={styles.department}>
            <h2 className={styles.deptName}>
              <span className={styles.deptIcon}><Icon name="department" size={18} /></span>
              {dept.name}
            </h2>
            <div className={styles.teamGrid}>
              {deptTeams.map(team => {
                const teamMembers = members.filter(m => m.teamId === team.id);
                return (
                  <Link key={team.id} to={`/team/${team.id}`} className={styles.teamCard}>
                    <div className={styles.teamHeader}>
                      <span className={styles.teamIcon}><Icon name="team" size={18} /></span>
                      <span className={styles.teamName}>{team.name}</span>
                    </div>
                    <div className={styles.teamStats}>
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
                    <div className={styles.memberPreviews}>
                      {teamMembers.slice(0, 4).map(m => (
                        <div key={m.id} className={styles.memberChip}>{m.name.split(' ')[0]}</div>
                      ))}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function calcAvgLevel(members) {
  if (!members.length) return '—';
  let total = 0, count = 0;
  for (const m of members) {
    for (const v of Object.values(m.skillLevels || {})) {
      total += v; count++;
    }
  }
  if (!count) return '—';
  return (total / count).toFixed(1);
}
