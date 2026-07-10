import { useState } from 'react';
import { fetchEmployees } from '../api/masterApi';
import { useCollection, setDocument, deleteDocument } from '../hooks/useFirestore';
import styles from './MasterSync.module.css';

/**
 * 社員マスタAPI から在籍社員を取り込み、members コレクションへ反映する。
 *
 * 設計方針（master-manager の原則に準拠）:
 *  - ドキュメントIDは社員の不変キー(id)を使用
 *  - 氏名/メール等の属性はマスタを正とし、同期のたびに上書き（ローカルにはキャッシュのみ）
 *  - teamId / skillLevels はこのアプリ固有のデータなので、再同期でも保持
 *  - status=deleted の社員はローカルからも削除
 */
export default function MasterSync() {
  const { data: members } = useCollection('members');
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [message, setMessage] = useState('');

  const handleSync = async () => {
    if (!confirm('社員マスタから最新の社員情報を取り込みますか？')) return;
    setStatus('loading');
    setMessage('マスタAPIに問い合わせ中...');
    try {
      const { employees } = await fetchEmployees({ includeInactive: false });

      const existingById = new Map(members.map((m) => [m.id, m]));
      let upserted = 0;
      let removed = 0;

      for (const emp of employees) {
        if (emp.status === 'deleted') {
          if (existingById.has(emp.id)) {
            await deleteDocument('members', emp.id);
            removed++;
          }
          continue;
        }
        const prev = existingById.get(emp.id);
        await setDocument('members', emp.id, {
          // マスタ由来（毎回上書き）
          name: emp.displayName,
          email: emp.email || null,
          userPrincipalName: emp.userPrincipalName || null,
          deptCode: emp.custom?.deptCode || null,
          custom: emp.custom || {},
          status: emp.status,
          // アプリ固有（同期でも保持）
          teamId: prev?.teamId ?? null,
          skillLevels: prev?.skillLevels ?? {},
          syncedAt: new Date().toISOString(),
        });
        upserted++;
      }

      setStatus('done');
      setMessage(`同期完了：${upserted}名を取込${removed ? `／${removed}名を削除` : ''}`);
      setTimeout(() => setStatus('idle'), 4000);
    } catch (e) {
      console.error(e);
      setStatus('error');
      setMessage(e?.message || '同期に失敗しました');
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  return (
    <div className={styles.wrapper}>
      <button
        className={`${styles.btn} ${styles[status]}`}
        onClick={handleSync}
        disabled={status === 'loading'}
        title="社員マスタから同期"
      >
        {status === 'idle' && '🔄 マスタ同期'}
        {status === 'loading' && '同期中...'}
        {status === 'done' && '✓ 完了'}
        {status === 'error' && '✗ エラー'}
      </button>
      {message && status !== 'idle' && <span className={styles.msg}>{message}</span>}
    </div>
  );
}
