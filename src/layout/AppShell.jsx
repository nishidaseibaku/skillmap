import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useData } from '../data/DataContext';
import { signOutUser } from '../firebase';
import Icon from '../components/Icon';
import styles from './AppShell.module.css';

/** 左サイドバー（部門リスト＋未所属＋設定）とメイン領域 */
export default function AppShell() {
  const { user } = useAuth();
  const { loading, departments, unassignedMembers } = useData();

  const linkClass = ({ isActive }) =>
    isActive ? `${styles.navItem} ${styles.active}` : styles.navItem;

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <Icon name="sparkle" size={20} />
          <span>スキルマップ</span>
        </div>

        <nav className={styles.nav}>
          <div className={styles.navLabel}>部門</div>
          {loading && <div className={styles.navHint}>読み込み中…</div>}
          {!loading && departments.length === 0 && (
            <div className={styles.navHint}>
              部門がありません。設定からマスタ同期を実行してください。
            </div>
          )}
          {departments.map((d) => (
            <NavLink key={d.code} to={`/dept/${d.code}`} className={linkClass}>
              <Icon name="building" />
              <span className={styles.navText}>{d.name}</span>
            </NavLink>
          ))}

          <div className={styles.navDivider} />

          <NavLink to="/unassigned" className={linkClass}>
            <Icon name="inbox" />
            <span className={styles.navText}>未所属メンバー</span>
            {unassignedMembers.length > 0 && (
              <span className={styles.badge}>{unassignedMembers.length}</span>
            )}
          </NavLink>
          <NavLink to="/settings" className={linkClass}>
            <Icon name="gear" />
            <span className={styles.navText}>設定</span>
          </NavLink>
        </nav>

        <div className={styles.userBar}>
          <div className={styles.avatar}>{(user?.displayName || '?').charAt(0)}</div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{user?.displayName}</div>
            <div className={styles.userMail}>{user?.email}</div>
          </div>
          <button
            className={styles.logout}
            onClick={signOutUser}
            title="ログアウト"
            aria-label="ログアウト"
          >
            <Icon name="logout" />
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
