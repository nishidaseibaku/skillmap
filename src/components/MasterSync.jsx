import { useState } from 'react';
import { fetchEmployees } from '../api/masterApi';
import { resolveDeptCodeNames, buildOrgPlan } from '../api/orgSync';
import { useCollection, setDocument, deleteDocument } from '../hooks/useFirestore';
import styles from './MasterSync.module.css';

/**
 * 社員マスタAPI から在籍社員を取り込み、部門・チーム・メンバーを自動生成する。
 *
 * 設計方針（master-manager の原則に準拠）:
 *  - ドキュメントIDは社員の不変キー(id)を使用
 *  - 氏名/メール等の属性はマスタを正とし、同期のたびに上書き
 *  - チームは社員の deptCode ごとに自動生成し、社員を自動割当
 *  - skills（チーム）と skillLevels（社員）はアプリ固有データなので保持
 *  - status=deleted の社員はローカルからも削除
 */
export default function MasterSync() {
  const { data: members } = useCollection('members');
  const { data: teams } = useCollection('teams');
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [message, setMessage] = useState('');

  const handleSync = async () => {
    if (!confirm('社員マスタから最新の社員情報を取り込み、部門・チームを再構成しますか？')) return;
    setStatus('loading');
    setMessage('マスタAPIに問い合わせ中...');
    try {
      const { employees } = await fetchEmployees({ includeInactive: false });

      setMessage('部門マスタを照合中...');
      const deptNames = await resolveDeptCodeNames(employees);

      const plan = buildOrgPlan({
        employees,
        deptNames,
        existingTeams: teams,
        existingMembers: members,
      });

      // 部門
      await setDocument('departments', plan.department.id, { name: plan.department.name });

      // チーム（deptCode ごと・skills 保持）
      for (const team of plan.teams) {
        const { id, ...data } = team;
        await setDocument('teams', id, data);
      }

      // メンバー（自動割当・skillLevels 保持）
      for (const { id, data } of plan.memberUpserts) {
        await setDocument('members', id, data);
      }
      for (const id of plan.memberDeletes) {
        await deleteDocument('members', id);
      }

      setStatus('done');
      setMessage(
        `同期完了：${plan.memberUpserts.length}名 / ${plan.teams.length}チーム` +
        `${plan.memberDeletes.length ? `／${plan.memberDeletes.length}名を削除` : ''}`,
      );
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
