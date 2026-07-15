import { fetchEmployees } from '../api/masterApi';
import { fetchOrgMasters, buildOrgPlan } from '../api/orgSync';
import { useCollection, setDocument, deleteDocument } from '../hooks/useFirestore';
import { useState } from 'react';
import Icon from '../components/Icon';
import styles from './SettingsPage.module.css';

export default function SettingsPage() {
  const { data: members } = useCollection('members');
  const { data: teams } = useCollection('teams');
  const { data: departments } = useCollection('departments');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const deptName = (id) => departments.find((d) => d.id === id)?.name || null;

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
        existingDepartments: departments,
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
      for (const id of plan.memberDeletes) await deleteDocument('members', id);
      for (const id of plan.teamDeletes) await deleteDocument('teams', id);
      for (const id of plan.departmentDeletes) await deleteDocument('departments', id);

      setStatus('done');
      setMessage(`同期完了：${plan.memberUpserts.length}名 / ${plan.departments.length}部門 / ${plan.teams.length}チーム`);
    } catch (e) {
      console.error(e);
      setStatus('error');
      setMessage(e?.message || '同期に失敗しました');
    }
  };

  const unassignedCount = members.filter((m) => !m.teamId).length;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>設定</h1>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>マスタ同期</h2>
          <button
            className={`${styles.syncBtn} ${styles[status]}`}
            onClick={handleSync}
            disabled={status === 'loading'}
          >
            <Icon name="refresh" size={15} className={status === 'loading' ? styles.spin : undefined} />
            {status === 'loading' ? '同期中...' : 'マスタ同期'}
          </button>
        </div>
        <p className={styles.desc}>
          社員マスタから在籍社員（表示ON）を取り込み、部門・チーム・所属を再構成します。
          チームの所属部門は社員の deptCode / teamCode から推定します。
        </p>
        {message && <p className={`${styles.msg} ${styles[status]}`}>{message}</p>}
        <div className={styles.counts}>
          <span>{members.length} 名</span>
          <span>{departments.length} 部門</span>
          <span>{teams.length} チーム</span>
          <span>未所属 {unassignedCount} 名</span>
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>チームの所属部門（推定結果）</h2>
        <p className={styles.desc}>
          各チームがどの部門に分類されたかの一覧です。「未分類」は所属を推定する手がかり（両コードを持つ社員）がまだ無いチームです。
        </p>
        <table className={styles.table}>
          <thead>
            <tr><th>チーム</th><th>所属部門</th><th>メンバー</th></tr>
          </thead>
          <tbody>
            {teams.map((t) => {
              const name = deptName(t.departmentId);
              const count = members.filter((m) => m.teamId === t.id).length;
              return (
                <tr key={t.id}>
                  <td className={styles.teamCell}>{t.name}</td>
                  <td>{name || <span className={styles.unclassified}>未分類</span>}</td>
                  <td>{count} 名</td>
                </tr>
              );
            })}
            {teams.length === 0 && (
              <tr><td colSpan={3} className={styles.emptyRow}>チームがありません。マスタ同期を実行してください。</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
