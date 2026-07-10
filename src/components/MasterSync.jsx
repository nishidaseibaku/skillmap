import { useState } from 'react';
import { fetchEmployees } from '../api/masterApi';
import { fetchOrgMasters, buildOrgPlan } from '../api/orgSync';
import { useCollection, setDocument, deleteDocument } from '../hooks/useFirestore';
import styles from './MasterSync.module.css';

/**
 * 社員マスタAPI から在籍社員（表示ON）を取り込み、部門・チーム・メンバーを再構成する。
 *
 * 連携契約（master-manager）:
 *  - 部門 = departments マスタ / チーム = department-teams マスタ / 個人 = /employees
 *  - 社員の custom.deptCode / custom.teamCode（マスタの code）で所属を決定
 *  - チームの skills・社員の skillLevels はアプリ固有なので保持
 *  - 表示OFFになった社員はローカルからも削除
 */
export default function MasterSync() {
  const { data: members } = useCollection('members');
  const { data: teams } = useCollection('teams');
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [message, setMessage] = useState('');

  const handleSync = async () => {
    if (!confirm('社員マスタから最新情報を取り込み、部門・チームを再構成しますか？')) return;
    setStatus('loading');
    setMessage('マスタAPIに問い合わせ中...');
    try {
      const [{ employees }, orgMasters] = await Promise.all([
        fetchEmployees({ includeInactive: false }),
        fetchOrgMasters(),
      ]);

      const plan = buildOrgPlan({
        employees,
        deptItems: orgMasters.deptItems,
        teamItems: orgMasters.teamItems,
        existingTeams: teams,
        existingMembers: members,
      });

      setMessage('Firestore に反映中...');

      for (const dept of plan.departments) {
        const { id, ...data } = dept;
        await setDocument('departments', id, data);
      }
      for (const team of plan.teams) {
        const { id, ...data } = team;
        await setDocument('teams', id, data);
      }
      for (const { id, data } of plan.memberUpserts) {
        await setDocument('members', id, data);
      }
      for (const id of plan.memberDeletes) {
        await deleteDocument('members', id);
      }

      setStatus('done');
      setMessage(
        `同期完了：${plan.memberUpserts.length}名 / ` +
        `${plan.departments.length}部門 / ${plan.teams.length}チーム` +
        `${plan.memberDeletes.length ? `／${plan.memberDeletes.length}名を削除` : ''}`,
      );
      setTimeout(() => setStatus('idle'), 5000);
    } catch (e) {
      console.error(e);
      setStatus('error');
      setMessage(e?.message || '同期に失敗しました');
      setTimeout(() => setStatus('idle'), 6000);
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
