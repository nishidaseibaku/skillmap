import SkillNode from './SkillNode';
import styles from './SkillTree.module.css';

function groupSkills(skills) {
  const groups = {};
  for (const skill of skills) {
    const major = skill.majorCategory || '未分類';
    const minor = skill.minorCategory || '一般';
    if (!groups[major]) groups[major] = {};
    if (!groups[major][minor]) groups[major][minor] = [];
    groups[major][minor].push(skill);
  }
  return groups;
}

export default function SkillTree({ skills, skillLevels, editable, onLevelChange }) {
  const grouped = groupSkills(skills);

  return (
    <div className={styles.tree}>
      {Object.entries(grouped).map(([major, minors]) => (
        <div key={major} className={styles.majorGroup}>
          <h3 className={styles.majorLabel}>{major}</h3>
          <div className={styles.minorGroups}>
            {Object.entries(minors).map(([minor, skillList]) => (
              <div key={minor} className={styles.minorGroup}>
                <div className={styles.minorLabel}>{minor}</div>
                <div className={styles.skillRow}>
                  {skillList.map(skill => (
                    <SkillNode
                      key={skill.id}
                      skill={skill}
                      level={skillLevels?.[skill.id] ?? 0}
                      editable={editable}
                      onLevelChange={level => onLevelChange?.(skill.id, level)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
