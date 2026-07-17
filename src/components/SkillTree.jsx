import { useMemo } from 'react';
import SkillNode, { LEVEL_LABELS } from './SkillNode';
import styles from './SkillTree.module.css';

/** skills を大分類（category）ごとに並べたスキルツリー */
export default function SkillTree({ skills, levels = {}, onLevelChange }) {
  const groups = useMemo(() => {
    const map = new Map();
    for (const s of skills) {
      const cat = s.category || 'その他';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(s);
    }
    return [...map.entries()];
  }, [skills]);

  if (skills.length === 0) {
    return <p className={styles.empty}>スキルが未登録です。「スキル管理」タブから追加してください。</p>;
  }

  return (
    <div>
      <div className={styles.legend}>
        {LEVEL_LABELS.map((label, lv) => (
          <span key={lv} className={styles.legendItem}>
            <span className={styles.legendDot} data-level={lv} />
            Lv.{lv} {label}
          </span>
        ))}
      </div>
      {groups.map(([category, items]) => (
        <section key={category} className={styles.group}>
          <h3 className={styles.category}>{category}</h3>
          <div className={styles.nodes}>
            {items.map((skill) => (
              <SkillNode
                key={skill.id}
                skill={skill}
                level={levels[skill.id] ?? 0}
                onChange={onLevelChange ? (lv) => onLevelChange(skill.id, lv) : undefined}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
