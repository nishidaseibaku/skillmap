import { useCollection } from '../hooks/useFirestore';
import styles from './UnassignedView.module.css';

export default function UnassignedView() {
  const { data: members, loading } = useCollection('members');

  if (loading) return <div className={styles.loading}>読み込み中...</div>;

  const unassigned = members
    .filter((m) => !m.teamId)
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ja'));

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>未所属メンバー</h1>
        <p className={styles.note}>
          チーム（teamCode）が未設定の社員です。master-manager 側で teamCode が入ると、次回のマスタ同期で自動的に各チームへ振り分けられます。
        </p>
      </header>

      {unassigned.length === 0 ? (
        <div className={styles.empty}>未所属のメンバーはいません。</div>
      ) : (
        <>
          <div className={styles.count}>{unassigned.length} 名</div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>氏名</th>
                <th>メール</th>
                <th>部門コード</th>
                <th>チームコード</th>
              </tr>
            </thead>
            <tbody>
              {unassigned.map((m) => (
                <tr key={m.id}>
                  <td className={styles.nameCell}>{m.name}</td>
                  <td className={styles.muted}>{m.email || '—'}</td>
                  <td className={styles.muted}>{m.deptCode || '—'}</td>
                  <td className={styles.muted}>{m.teamCode || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
