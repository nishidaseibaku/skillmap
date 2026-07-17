import { useData } from '../data/DataContext';
import Icon from '../components/Icon';
import styles from './UnassignedPage.module.css';

/** チーム未所属（teamCode 未設定）の社員一覧。所属はマスタ側で管理する */
export default function UnassignedPage() {
  const { loading, departments, unassignedMembers } = useData();

  if (loading) return null;

  const deptName = (code) =>
    departments.find((d) => d.code === code)?.name ?? '—';

  return (
    <div>
      <header className={styles.header}>
        <h1 className={styles.title}>未所属メンバー</h1>
        <p className={styles.meta}>
          チーム未設定の社員 {unassignedMembers.length} 名。チームへの割当はマスタ側（社員の「チーム」列）で行うと、次回同期で反映されます。
        </p>
      </header>

      {unassignedMembers.length === 0 ? (
        <p className={styles.empty}>全員がいずれかのチームに所属しています。</p>
      ) : (
        <ul className={styles.list}>
          {unassignedMembers.map((m) => (
            <li key={m.id} className={styles.item}>
              <Icon name="user" size={16} />
              <span className={styles.name}>{m.displayName}</span>
              <span className={styles.mail}>{m.email}</span>
              <span className={styles.dept}>{deptName(m.deptCode)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
