import { useParams, Link } from 'react-router-dom';
import { useCollection } from '../hooks/useFirestore';
import Icon from '../components/Icon';
import styles from './DepartmentView.module.css';

// 部門ドキュメントID(dept_<code>) から部門コードを取り出す
function codeOfDept(deptId) {
  return deptId?.startsWith('dept_') ? deptId.slice('dept_'.length) : deptId;
}

export default function DepartmentView() {
  const { deptId } = useParams();
  const { data: departments, loading: dLoading } = useCollection('departments');
  const { data: teams, loading: tLoading } = useCollection('teams');
  const { data: members } = useCollection('members');

  if (dLoading || tLoading) return <div className={styles.loading}>読み込み中...</div>;

  const dept = departments.find((d) => d.id === deptId);
  const deptCode = codeOfDept(deptId);

  // この部門に所属する社員（deptCode一致）
  const deptMembers = members.filter((m) => m.deptCode === deptCode);

  // その社員が持つ teamCode を集め、対応するチームを表示対象にする
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const teamCounts = new Map(); // teamId -> メンバー数（この部門内）
  for (const m of deptMembers) {
    if (!m.teamId) continue;
    teamCounts.set(m.teamId, (teamCounts.get(m.teamId) || 0) + 1);
  }
  const deptTeams = [...teamCounts.keys()]
    .map((id) => teamById.get(id))
    .filter(Boolean)
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ja'));

  const noTeamCount = deptMembers.filter((m) => !m.teamId).length;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{dept?.name || '部門'}</h1>
        <p className={styles.note}>
          この部門の社員 {deptMembers.length} 名
          {noTeamCount > 0 && `（うち ${noTeamCount} 名はチーム未設定）`}
        </p>
      </header>

      {deptTeams.length === 0 ? (
        <div className={styles.empty}>
          この部門に表示できるチームがありません。
          {deptMembers.length > 0 && ' 社員に teamCode が設定されると表示されます。'}
        </div>
      ) : (
        <div className={styles.grid}>
          {deptTeams.map((team) => (
            <Link key={team.id} to={`/team/${team.id}?from=${deptId}`} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardIcon}><Icon name="team" size={18} /></span>
                <span className={styles.cardName}>{team.name}</span>
              </div>
              <div className={styles.cardStats}>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{teamCounts.get(team.id) || 0}</span>
                  <span className={styles.statLabel}>メンバー</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{team.skills?.length ?? 0}</span>
                  <span className={styles.statLabel}>スキル</span>
                </div>
              </div>
              <div className={styles.open}>
                スキルツリーを開く <Icon name="back" size={14} className={styles.openArrow} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
