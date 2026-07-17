import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { useDoc } from '../hooks/useFirestore';
import Icon from '../components/Icon';
import styles from './SettingsPage.module.css';

/** 設定。マスタ同期の実行と、同期状態の表示 */
export default function SettingsPage() {
  const syncMeta = useDoc('meta/sync');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const runSync = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const call = httpsCallable(functions, 'syncMasters');
      const res = await call();
      setResult(res.data.summary);
    } catch (e) {
      setError(e.message || '同期に失敗しました');
    } finally {
      setBusy(false);
    }
  };

  const lastSyncAt = syncMeta?.lastSyncAt?.toDate?.();

  return (
    <div>
      <header className={styles.header}>
        <h1 className={styles.title}>設定</h1>
      </header>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>
          <Icon name="sync" size={18} />
          マスタ同期
        </h2>
        <p className={styles.desc}>
          master-manager から部門・チーム・社員を取り込みます。組織構成はマスタが正であり、
          マスタに無い部門・チーム・社員はこのアプリからも削除されます
          （チームのスキル定義と各メンバーのスキルレベルは保持されます）。
        </p>
        <button className={styles.syncButton} onClick={runSync} disabled={busy}>
          <Icon name="sync" size={16} />
          {busy ? '同期中…' : 'マスタ同期を実行'}
        </button>

        {lastSyncAt && (
          <p className={styles.lastSync}>最終同期: {lastSyncAt.toLocaleString('ja-JP')}</p>
        )}

        {result && (
          <div className={styles.result}>
            <div className={styles.resultRow}>
              <span>部門</span>
              <span>{result.departments.synced} 件（削除 {result.departments.deleted}）</span>
            </div>
            <div className={styles.resultRow}>
              <span>チーム</span>
              <span>{result.teams.synced} 件（削除 {result.teams.deleted}）</span>
            </div>
            <div className={styles.resultRow}>
              <span>社員</span>
              <span>{result.members.synced} 名（削除 {result.members.deleted}）</span>
            </div>
          </div>
        )}
        {error && <p className={styles.error}>{error}</p>}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>
          <Icon name="building" size={18} />
          データの取り扱い
        </h2>
        <ul className={styles.notes}>
          <li>部門・チーム・社員の構成は master-manager（マスタ）で管理します。</li>
          <li>チームの所属部門は、チームマスタの「所属部門」列から取得します。</li>
          <li>社員のチーム割当は、社員マスタの「チーム」列から取得します。</li>
          <li>スキル定義とスキルレベルは、このアプリ固有のデータとして Firestore に保存します。</li>
        </ul>
      </section>
    </div>
  );
}
