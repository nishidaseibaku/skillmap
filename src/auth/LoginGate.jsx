import { useState } from 'react';
import { useAuth } from './AuthContext';
import { signInWithMicrosoft } from '../firebase';
import Icon from '../components/Icon';
import styles from './LoginGate.module.css';

export default function LoginGate({ children }) {
  const { user, loading } = useAuth();
  const [error, setError] = useState(null);
  const [signingIn, setSigningIn] = useState(false);

  const handleLogin = async () => {
    setError(null);
    setSigningIn(true);
    try {
      await signInWithMicrosoft();
    } catch (e) {
      // ポップアップを閉じただけの場合はエラー表示しない
      if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') {
        console.error(e);
        setError('ログインに失敗しました。もう一度お試しください。');
      }
    } finally {
      setSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.spinner} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <div className={styles.logo}><Icon name="spark" size={30} strokeWidth={1.6} /></div>
          <h1 className={styles.title}>スキルマップ</h1>
          <p className={styles.subtitle}>社内Microsoftアカウントでログインしてください</p>
          <button className={styles.loginBtn} onClick={handleLogin} disabled={signingIn}>
            {signingIn ? 'ログイン中...' : 'Microsoft アカウントでログイン'}
          </button>
          {error && <p className={styles.error}>{error}</p>}
        </div>
      </div>
    );
  }

  return children;
}
