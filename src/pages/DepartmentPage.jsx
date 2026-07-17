import { Link, useParams } from 'react-router-dom';
import { useData } from '../data/DataContext';
import Icon from '../components/Icon';
import styles from './DepartmentPage.module.css';

/** 部門トップ。所属チームの一覧と、チーム未所属の部門メンバーを表示する */
export default function DepartmentPage() {
  const { deptCode } = useParams();
  const { loading, departments, teams, members, membersOfTeam } = useData();

  if (loading) return null;

  const dept = departments.find((d) => d.code === deptCode);
  if (!dept) return <p className={styles.notFound}>部門が見つかりません。</p>;

  const deptTeams = teams.filter((t) => t.parentDeptCode === deptCode);
  const deptMembers = members.filter((m) => m.deptCode === deptCode);
  const noTeamMembers = deptMembers.filter((m) => !m.teamCode);

  return (
    <div>
      <header className={styles.header}>
        <h1 className={styles.title}>{dept.name}</h1>
        <p className={styles.meta}>
          {deptTeams.length} チーム ・ {deptMembers.length} 名
        </p>
      </header>

      {deptTeams.length === 0 ? (
        <p className={styles.empty}>
          この部門に属するチームはまだありません。チームの所属部門はマスタ側（チームマスタの「所属部門」）で管理されています。
        </p>
      ) : (
        <div className={styles.grid}>
          {deptTeams.map((team) => {
            const teamMembers = membersOfTeam(team.code);
            return (
              <Link key={team.code} to={`/team/${team.code}`} className={styles.card}>
                <div className={styles.cardIcon}>
                  <Icon name="users" size={20} />
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardName}>{team.name}</div>
                  <div className={styles.cardMeta}>
                    {teamMembers.length} 名 ・ スキル {(team.skills ?? []).length} 件
                  </div>
                </div>
                <Icon name="chevron" className={styles.chevron} />
              </Link>
            );
          })}
        </div>
      )}

      {noTeamMembers.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>チーム未所属のメンバー（この部門）</h2>
          <ul className={styles.memberList}>
            {noTeamMembers.map((m) => (
              <li key={m.id} className={styles.memberItem}>
                <Icon name="user" size={16} />
                <span>{m.displayName}</span>
                <span className={styles.memberMail}>{m.email}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
