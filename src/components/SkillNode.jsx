import { useState } from 'react';
import styles from './SkillNode.module.css';

const LEVEL_COLORS = ['#2a2a3e', '#4a90d9', '#9b59b6', '#e67e22', '#f1c40f'];
const LEVEL_LABELS = ['未習得', 'Lv.1', 'Lv.2', 'Lv.3', 'Lv.4'];
const LEVEL_GLOWS = [
  'none',
  '0 0 8px #4a90d9, 0 0 16px #4a90d980',
  '0 0 8px #9b59b6, 0 0 16px #9b59b680',
  '0 0 8px #e67e22, 0 0 16px #e67e2280',
  '0 0 12px #f1c40f, 0 0 24px #f1c40f80',
];

export default function SkillNode({ skill, level, editable, onLevelChange }) {
  const [hovered, setHovered] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const handleClick = () => {
    if (editable) setShowPicker(v => !v);
  };

  return (
    <div
      className={styles.wrapper}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); }}
    >
      <div
        className={`${styles.node} ${level > 0 ? styles.active : ''}`}
        style={{
          backgroundColor: LEVEL_COLORS[level],
          boxShadow: hovered || level > 0 ? LEVEL_GLOWS[level] : 'none',
          cursor: editable ? 'pointer' : 'default',
        }}
        onClick={handleClick}
      >
        <div className={styles.orbs}>
          {[1, 2, 3, 4].map(i => (
            <span
              key={i}
              className={`${styles.orb} ${i <= level ? styles.orbFilled : ''}`}
              style={{ backgroundColor: i <= level ? LEVEL_COLORS[level] : '#1a1a2e' }}
            />
          ))}
        </div>
        <div className={styles.skillName}>{skill.name}</div>
        <div className={styles.levelLabel} style={{ color: LEVEL_COLORS[level] }}>
          {LEVEL_LABELS[level]}
        </div>
      </div>

      {showPicker && editable && (
        <div className={styles.picker}>
          {[0, 1, 2, 3, 4].map(l => (
            <button
              key={l}
              className={`${styles.pickBtn} ${l === level ? styles.pickBtnActive : ''}`}
              style={{ borderColor: LEVEL_COLORS[l] }}
              onClick={() => { onLevelChange(l); setShowPicker(false); }}
            >
              <span style={{ color: LEVEL_COLORS[l] }}>{LEVEL_LABELS[l]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
