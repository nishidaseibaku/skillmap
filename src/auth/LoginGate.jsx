import { useState } from 'react';
import { useAuth } from './AuthContext';
import { signInWithMicrosoft } from '../firebase';
import Icon from '../components/Icon';
import styles from './LoginGate.module.css';

/** 未ログインならログイン画面を表示し、ログイン済みならアプリ本体を出す */
export default function LoginGate({ children }) {
  const { user, loading } = useAuth();
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (loading) {
    return <div className={styles.screen}>読み込み中…</div>;
  }

  if (user) return children;

  const handleLogin = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithMicrosoft();
    } catch (e) {
      if (e?.code !== 'auth/popup-closed-by-user') {
        setError('ログインに失敗しました。社内アカウントでお試しください。');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <Icon name="sparkle" size={28} />
        </div>
        <h1 className={styles.title}>スキルマップ</h1>
        <p className={styles.desc}>
          部門・チーム・個人の人材育成状況を管理します。
          <br />
          社内の Microsoft アカウントでログインしてください。
        </p>
        <button className={styles.button} onClick={handleLogin} disabled={busy}>
          {busy ? 'ログイン中…' : 'Microsoft アカウントでログイン'}
        </button>
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  );
}
