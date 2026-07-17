import { createContext, useContext, useMemo } from 'react';
import { useCollection } from '../hooks/useFirestore';

/**
 * 組織データ（部門・チーム・社員）をアプリ全体で共有する。
 * すべてマスタ同期（Cloud Functions）が書き込んだ Firestore の写しで、
 * 組織構成の正は常に master-manager 側にある。
 */
const DataContext = createContext(null);

const byCode = (a, b) =>
  a.code.localeCompare(b.code, 'ja', { numeric: true });

export function DataProvider({ children }) {
  const departments = useCollection('departments');
  const teams = useCollection('teams');
  const members = useCollection('members');

  const value = useMemo(() => {
    const loading = !departments || !teams || !members;
    const sortedDeps = (departments ?? []).slice().sort(byCode);
    const sortedTeams = (teams ?? []).slice().sort(byCode);
    const sortedMembers = (members ?? [])
      .slice()
      .sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '', 'ja'));
    return {
      loading,
      departments: sortedDeps,
      teams: sortedTeams,
      members: sortedMembers,
      teamsOfDept: (deptCode) => sortedTeams.filter((t) => t.parentDeptCode === deptCode),
      membersOfTeam: (teamCode) => sortedMembers.filter((m) => m.teamCode === teamCode),
      unassignedMembers: sortedMembers.filter((m) => !m.teamCode),
    };
  }, [departments, teams, members]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  return useContext(DataContext);
}
