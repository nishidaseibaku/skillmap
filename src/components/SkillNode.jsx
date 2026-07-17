import styles from './SkillNode.module.css';

export const LEVEL_LABELS = ['未習得', '学習中', '一人でできる', '応用できる', '指導できる'];
export const MAX_LEVEL = 4;

/**
 * スキル1つを表すオーブ型ノード。クリックでレベルを 0→4→0 と循環させる。
 * onChange を渡さなければ表示専用になる。
 */
export default function SkillNode({ skill, level = 0, onChange }) {
  const lv = Math.max(0, Math.min(MAX_LEVEL, level));
  const editable = typeof onChange === 'function';

  const handleClick = () => {
    if (editable) onChange((lv + 1) % (MAX_LEVEL + 1));
  };

  return (
    <button
      type="button"
      className={styles.node}
      data-level={lv}
      onClick={handleClick}
      disabled={!editable}
      title={`${skill.name} — Lv.${lv} ${LEVEL_LABELS[lv]}${editable ? '（クリックで変更）' : ''}`}
    >
      <span className={styles.orb}>
        <span className={styles.level}>{lv}</span>
      </span>
      <span className={styles.name}>{skill.name}</span>
      <span className={styles.pips}>
        {Array.from({ length: MAX_LEVEL }, (_, i) => (
          <span key={i} className={styles.pip} data-on={i < lv || undefined} />
        ))}
      </span>
    </button>
  );
}
