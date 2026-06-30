import { useState } from 'react';
import { seedDatabase } from '../seed';
import styles from './SeedButton.module.css';

export default function SeedButton() {
  const [status, setStatus] = useState('idle'); // idle | loading | done | error

  const handleSeed = async () => {
    if (!confirm('サンプルデータを投入しますか？（既存データは上書きされます）')) return;
    setStatus('loading');
    try {
      await seedDatabase();
      setStatus('done');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (e) {
      console.error(e);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <button
      className={`${styles.btn} ${styles[status]}`}
      onClick={handleSeed}
      disabled={status === 'loading'}
      title="サンプルデータ投入"
    >
      {status === 'idle' && '⚙ サンプルデータ'}
      {status === 'loading' && '投入中...'}
      {status === 'done' && '✓ 完了'}
      {status === 'error' && '✗ エラー'}
    </button>
  );
}
