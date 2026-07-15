import { NavLink, Outlet } from 'react-router-dom';
import { useCollection } from '../hooks/useFirestore';
import Icon from '../components/Icon';
import styles from './AppShell.module.css';

export default function AppShell() {
  const { data: departments } = useCollection('departments');
  const { data: members } = useCollection('members');

  const unassignedCount = members.filter((m) => !m.teamId).length;

  const sorted = [...departments].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ja'));

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandMark}><Icon name="spark" size={18} /></span>
          スキルマップ
        </div>

        <nav className={styles.nav}>
          <div className={styles.navLabel}>部門</div>
          {sorted.map((dept) => (
            <NavLink
              key={dept.id}
              to={`/dept/${dept.id}`}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
            >
              <Icon name="department" size={16} />
              <span>{dept.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.spacer} />

        <nav className={styles.nav}>
          <NavLink
            to="/unassigned"
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
          >
            <Icon name="team" size={16} />
            <span>未所属メンバー</span>
            {unassignedCount > 0 && <span className={styles.badge}>{unassignedCount}</span>}
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
          >
            <Icon name="settings" size={16} />
            <span>設定</span>
          </NavLink>
        </nav>
      </aside>

      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
