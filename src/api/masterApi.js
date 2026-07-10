import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

// Cloud Functions（Callable）経由で master-manager API を叩く。
// APIキーはサーバー側にのみ存在し、ここには現れない。

const _getEmployees = httpsCallable(functions, 'getEmployees');
const _getEmployee = httpsCallable(functions, 'getEmployee');
const _getMasters = httpsCallable(functions, 'getMasters');
const _getMasterItems = httpsCallable(functions, 'getMasterItems');

/** 在籍社員を全件取得。{ employees, generatedAt } を返す */
export async function fetchEmployees({ since, includeInactive } = {}) {
  const res = await _getEmployees({ since, includeInactive });
  return res.data;
}

/** 社員1件取得 */
export async function fetchEmployee(id) {
  const res = await _getEmployee({ id });
  return res.data;
}

/** マスタ定義一覧 */
export async function fetchMasters() {
  const res = await _getMasters();
  return res.data;
}

/** マスタ項目一覧 */
export async function fetchMasterItems(masterId, { since } = {}) {
  const res = await _getMasterItems({ masterId, since });
  return res.data;
}
