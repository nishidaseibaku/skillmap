import { useState } from 'react';
import styles from './SkillNode.module.css';

const LEVEL_COLORS = ['#d7dbe4', '#378add', '#7f77dd', '#ba7517', '#e5a800'];
const LEVEL_TEXT = ['#aab2c0', '#185fa5', '#534ab7', '#854f0b', '#8a6300'];
const LEVEL_BG = ['#fbfcfe', '#f4f8fe', '#f6f4fd', '#fdf7ee', '#fdf6dd'];
const LEVEL_BORDER = ['#e4e8f0', '#d7e3f5', '#d9d5f3', '#f2ddc0', '#f0d97a'];
const LEVEL_LABELS = ['未習得', 'Lv.1', 'Lv.2', 'Lv.3', 'Lv.4'];
const LEVEL_GLOWS = [
  'none',
  '0 1px 3px rgba(30,40,60,.06)',
  '0 1px 3px rgba(30,40,60,.06)',
  '0 1px 3px rgba(30,40,60,.06)',
  '0 0 0 3px rgba(229,168,0,.18)',
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
          backgroundColor: LEVEL_BG[level],
          borderColor: LEVEL_BORDER[level],
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
              style={{ backgroundColor: i <= level ? LEVEL_COLORS[level] : '#eceef3' }}
            />
          ))}
        </div>
        <div className={styles.skillName}>{skill.name}</div>
        <div className={styles.levelLabel} style={{ color: LEVEL_TEXT[level] }}>
          {LEVEL_LABELS[level]}
        </div>
      </div>

      {showPicker && editable && (
        <div className={styles.picker}>
          {[0, 1, 2, 3, 4].map(l => (
            <button
              key={l}
              className={`${styles.pickBtn} ${l === level ? styles.pickBtnActive : ''}`}
              style={{ borderColor: LEVEL_BORDER[l], background: LEVEL_BG[l] }}
              onClick={() => { onLevelChange(l); setShowPicker(false); }}
            >
              <span style={{ color: LEVEL_TEXT[l] }}>{LEVEL_LABELS[l]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
