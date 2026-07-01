import { setDocument } from './hooks/useFirestore';

const seedData = {
  departments: [
    { id: 'dept1', name: '開発本部' }
  ],
  teams: [
    { id: 'team1', name: 'フロントエンドチーム', departmentId: 'dept1' },
    { id: 'team2', name: 'バックエンドチーム', departmentId: 'dept1' },
    { id: 'team3', name: 'インフラチーム', departmentId: 'dept1' },
    { id: 'team4', name: 'QAチーム', departmentId: 'dept1' },
  ],
  skills: {
    team1: [
      { id: 's1', name: 'HTML/CSS', majorCategory: 'Web基礎', minorCategory: 'マークアップ', order: 0 },
      { id: 's2', name: 'JavaScript', majorCategory: 'Web基礎', minorCategory: 'スクリプト', order: 1 },
      { id: 's3', name: 'TypeScript', majorCategory: 'Web基礎', minorCategory: 'スクリプト', order: 2 },
      { id: 's4', name: 'React', majorCategory: 'フレームワーク', minorCategory: 'UI', order: 3 },
      { id: 's5', name: 'Vue.js', majorCategory: 'フレームワーク', minorCategory: 'UI', order: 4 },
      { id: 's6', name: 'Next.js', majorCategory: 'フレームワーク', minorCategory: 'SSR', order: 5 },
      { id: 's7', name: 'パフォーマンス最適化', majorCategory: '品質', minorCategory: 'パフォーマンス', order: 6 },
      { id: 's8', name: 'アクセシビリティ', majorCategory: '品質', minorCategory: 'UX', order: 7 },
    ],
    team2: [
      { id: 's1', name: 'Python', majorCategory: '言語', minorCategory: 'スクリプト系', order: 0 },
      { id: 's2', name: 'Java', majorCategory: '言語', minorCategory: '静的型付け', order: 1 },
      { id: 's3', name: 'Go', majorCategory: '言語', minorCategory: '静的型付け', order: 2 },
      { id: 's4', name: 'REST API設計', majorCategory: 'API', minorCategory: '設計', order: 3 },
      { id: 's5', name: 'GraphQL', majorCategory: 'API', minorCategory: '設計', order: 4 },
      { id: 's6', name: 'SQL', majorCategory: 'データベース', minorCategory: 'RDBMS', order: 5 },
      { id: 's7', name: 'NoSQL', majorCategory: 'データベース', minorCategory: 'NoSQL', order: 6 },
      { id: 's8', name: 'セキュリティ', majorCategory: '品質', minorCategory: 'セキュリティ', order: 7 },
    ],
    team3: [
      { id: 's1', name: 'Linux', majorCategory: 'OS', minorCategory: 'サーバOS', order: 0 },
      { id: 's2', name: 'Docker', majorCategory: 'コンテナ', minorCategory: 'コンテナ化', order: 1 },
      { id: 's3', name: 'Kubernetes', majorCategory: 'コンテナ', minorCategory: 'オーケストレーション', order: 2 },
      { id: 's4', name: 'AWS', majorCategory: 'クラウド', minorCategory: 'パブリッククラウド', order: 3 },
      { id: 's5', name: 'GCP', majorCategory: 'クラウド', minorCategory: 'パブリッククラウド', order: 4 },
      { id: 's6', name: 'Terraform', majorCategory: 'IaC', minorCategory: 'プロビジョニング', order: 5 },
      { id: 's7', name: 'CI/CD', majorCategory: 'DevOps', minorCategory: '自動化', order: 6 },
      { id: 's8', name: 'ネットワーク設計', majorCategory: 'ネットワーク', minorCategory: '設計', order: 7 },
    ],
    team4: [
      { id: 's1', name: '手動テスト', majorCategory: 'テスト技法', minorCategory: '手動', order: 0 },
      { id: 's2', name: 'テスト設計', majorCategory: 'テスト技法', minorCategory: '設計', order: 1 },
      { id: 's3', name: 'Selenium', majorCategory: '自動化', minorCategory: 'UIテスト', order: 2 },
      { id: 's4', name: 'Playwright', majorCategory: '自動化', minorCategory: 'UIテスト', order: 3 },
      { id: 's5', name: 'パフォーマンステスト', majorCategory: '非機能テスト', minorCategory: 'パフォーマンス', order: 4 },
      { id: 's6', name: 'セキュリティテスト', majorCategory: '非機能テスト', minorCategory: 'セキュリティ', order: 5 },
      { id: 's7', name: 'バグレポート', majorCategory: 'プロセス', minorCategory: 'ドキュメント', order: 6 },
      { id: 's8', name: 'QAプロセス改善', majorCategory: 'プロセス', minorCategory: '改善', order: 7 },
    ],
  },
  members: {
    team1: [
      { id: 'm1', name: '田中 太郎', teamId: 'team1', skillLevels: { s1: 4, s2: 4, s3: 3, s4: 4, s5: 2, s6: 3, s7: 2, s8: 1 } },
      { id: 'm2', name: '鈴木 花子', teamId: 'team1', skillLevels: { s1: 3, s2: 3, s3: 2, s4: 3, s5: 4, s6: 2, s7: 1, s8: 3 } },
      { id: 'm3', name: '佐藤 次郎', teamId: 'team1', skillLevels: { s1: 4, s2: 4, s3: 4, s4: 2, s5: 1, s6: 4, s7: 3, s8: 2 } },
      { id: 'm4', name: '伊藤 美咲', teamId: 'team1', skillLevels: { s1: 2, s2: 2, s3: 1, s4: 2, s5: 1, s6: 1, s7: 0, s8: 2 } },
    ],
    team2: [
      { id: 'm5', name: '渡辺 健一', teamId: 'team2', skillLevels: { s1: 4, s2: 2, s3: 3, s4: 4, s5: 2, s6: 4, s7: 3, s8: 2 } },
      { id: 'm6', name: '山田 裕子', teamId: 'team2', skillLevels: { s1: 3, s2: 4, s3: 1, s4: 3, s5: 3, s6: 4, s7: 2, s8: 3 } },
      { id: 'm7', name: '中村 誠', teamId: 'team2', skillLevels: { s1: 2, s2: 3, s3: 4, s4: 4, s5: 4, s6: 3, s7: 4, s8: 2 } },
      { id: 'm8', name: '小林 奈々', teamId: 'team2', skillLevels: { s1: 1, s2: 1, s3: 2, s4: 2, s5: 1, s6: 2, s7: 1, s8: 1 } },
    ],
    team3: [
      { id: 'm9', name: '加藤 浩二', teamId: 'team3', skillLevels: { s1: 4, s2: 4, s3: 3, s4: 4, s5: 2, s6: 4, s7: 3, s8: 2 } },
      { id: 'm10', name: '吉田 さくら', teamId: 'team3', skillLevels: { s1: 3, s2: 3, s3: 2, s4: 3, s5: 3, s6: 2, s7: 2, s8: 1 } },
      { id: 'm11', name: '山本 大輔', teamId: 'team3', skillLevels: { s1: 4, s2: 4, s3: 4, s4: 4, s5: 4, s6: 3, s7: 4, s8: 3 } },
      { id: 'm12', name: '松本 恵', teamId: 'team3', skillLevels: { s1: 2, s2: 2, s3: 1, s4: 2, s5: 1, s6: 1, s7: 1, s8: 1 } },
    ],
    team4: [
      { id: 'm13', name: '林 隆史', teamId: 'team4', skillLevels: { s1: 4, s2: 4, s3: 3, s4: 2, s5: 3, s6: 2, s7: 4, s8: 3 } },
      { id: 'm14', name: '清水 由美', teamId: 'team4', skillLevels: { s1: 3, s2: 3, s3: 4, s4: 4, s5: 2, s6: 1, s7: 3, s8: 2 } },
      { id: 'm15', name: '木村 和也', teamId: 'team4', skillLevels: { s1: 2, s2: 2, s3: 2, s4: 3, s5: 1, s6: 1, s7: 2, s8: 1 } },
      { id: 'm16', name: '池田 千春', teamId: 'team4', skillLevels: { s1: 4, s2: 4, s3: 2, s4: 1, s5: 4, s6: 3, s7: 4, s8: 4 } },
    ],
  },
};

export async function seedDatabase() {
  for (const dept of seedData.departments) {
    await setDocument('departments', dept.id, { name: dept.name });
  }

  for (const team of seedData.teams) {
    await setDocument('teams', team.id, {
      name: team.name,
      departmentId: team.departmentId,
      skills: seedData.skills[team.id] || [],
    });
  }

  for (const teamMembers of Object.values(seedData.members)) {
    for (const member of teamMembers) {
      const { id, ...data } = member;
      await setDocument('members', id, data);
    }
  }
}
