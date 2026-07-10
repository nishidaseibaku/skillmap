import { useAuth } from './AuthContext';
import { signOutUser } from '../firebase';
import styles from './UserBar.module.css';

export default function UserBar() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className={styles.bar}>
      <div className={styles.avatar}>{(user.displayName || user.email || '?')[0]}</div>
      <span className={styles.name}>{user.displayName || user.email}</span>
      <button className={styles.logout} onClick={() => signOutUser()}>ログアウト</button>
    </div>
  );
}
