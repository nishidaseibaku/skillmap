/**
 * Cloud Functions — master-manager 連携（2026-07 API大改定対応版）
 *
 * 新APIは全マスタ統一形式:
 *   GET /v1/masters            … マスタ定義一覧
 *   GET /v1/masters/{id}/items … 項目一覧（cursor ページング）
 * 社員も組み込みマスタ `employees` として同じ形式で配信される。
 *
 * 二重認証:
 *   1. Google の身分証明   … GoogleAuth が Functions のサービスアカウントで
 *                            IDトークンを自動取得し Authorization: Bearer に付与
 *   2. master-manager APIキー … X-API-Key ヘッダ（Secret から注入）
 *
 * マスタ→Firestore の同期はサーバー側（syncMasters）で完結させる。
 * フロントは Callable を呼ぶだけで、データ本体はクライアントを経由しない。
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { GoogleAuth } from 'google-auth-library';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

initializeApp();
const db = getFirestore();

const MASTER_MANAGER_API_KEY = defineSecret('MASTER_MANAGER_API_KEY');

const API_BASE = 'https://api-yl3qzynteq-an.a.run.app';
const API_PREFIX = `${API_BASE}/v1`;

// GoogleAuth クライアントは使い回す（audience は master-manager のベースURL）
let idTokenClient;
async function getClient() {
  if (!idTokenClient) {
    const auth = new GoogleAuth();
    idTokenClient = await auth.getIdTokenClient(API_BASE);
  }
  return idTokenClient;
}

/** master-manager API を GET する共通関数 */
async function apiGet(path, apiKey, params = {}) {
  const client = await getClient();
  const url = new URL(`${API_PREFIX}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }
  try {
    const res = await client.request({
      url: url.toString(),
      headers: { 'X-API-Key': apiKey },
    });
    return res.data;
  } catch (err) {
    const status = err?.response?.status;
    if (status === 404) {
      // マスタ未存在 or 配信OFF。呼び出し側で「ローカル全削除」に使うため印を返す
      return null;
    }
    console.error(`master-manager API error ${status} on ${path}:`, err?.response?.data);
    if (status === 401 || status === 403) {
      throw new HttpsError('permission-denied', 'master-manager APIキーまたは認可設定が無効です');
    }
    throw new HttpsError('internal', `master-manager API呼び出しに失敗しました (${status ?? 'network'})`);
  }
}

/**
 * 指定マスタの項目を nextCursor が尽きるまで全件取得する。
 * 空ページでも nextCursor が返ることがあるため、必ず cursor で終端判定する。
 * @returns {Promise<{items: Array, generatedAt: string}|null>} 404（配信OFF）なら null
 */
async function fetchAllItems(masterId, apiKey) {
  const items = [];
  let cursor;
  let generatedAt = null;
  do {
    const page = await apiGet(`/masters/${encodeURIComponent(masterId)}/items`, apiKey, {
      limit: 1000,
      cursor,
    });
    if (page === null) return null;
    items.push(...(page.data || []));
    cursor = page.meta?.nextCursor || undefined;
    generatedAt = page.meta?.generatedAt || generatedAt;
  } while (cursor);
  return { items, generatedAt };
}

/** 呼び出し元が Firebase Auth 認証済みかを保証する */
function requireAuth(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'ログインが必要です');
  }
}

const callOpts = { secrets: [MASTER_MANAGER_API_KEY], region: 'asia-northeast1' };

/** マスタ定義一覧を取得（設定画面の表示用） */
export const getMasters = onCall(callOpts, async (request) => {
  requireAuth(request);
  const data = await apiGet('/masters', MASTER_MANAGER_API_KEY.value());
  if (data === null) throw new HttpsError('not-found', 'マスタ定義を取得できません');
  return data;
});

/* ------------------------------------------------------------------ */
/* マスタ → Firestore 同期                                             */
/* ------------------------------------------------------------------ */

/** Firestore の書き込みを500件制限を意識せず積めるバッチヘルパー */
class BatchWriter {
  constructor() {
    this.batch = db.batch();
    this.ops = 0;
    this.pending = [];
  }
  _tick() {
    if (++this.ops >= 450) {
      this.pending.push(this.batch.commit());
      this.batch = db.batch();
      this.ops = 0;
    }
  }
  set(ref, data) {
    this.batch.set(ref, data);
    this._tick();
  }
  delete(ref) {
    this.batch.delete(ref);
    this._tick();
  }
  async flush() {
    if (this.ops > 0) this.pending.push(this.batch.commit());
    await Promise.all(this.pending);
  }
}

/** コレクションの全ドキュメントを Map<docId, data> で読む */
async function loadCollection(name) {
  const snap = await db.collection(name).get();
  const map = new Map();
  snap.forEach((d) => map.set(d.id, d.data()));
  return map;
}

/**
 * マスタ同期の本体。
 * - 部門・チーム・社員をマスタどおりに upsert し、マスタに無いものは削除する
 * - アプリ固有データ（チームの skills / 社員の skillLevels）は保持する
 * - マスタが配信OFF（404）のコレクションはローカルも全削除する
 */
async function runSync(apiKey) {
  const [deps, teams, emps] = await Promise.all([
    fetchAllItems('departments', apiKey),
    fetchAllItems('department-teams', apiKey),
    fetchAllItems('employees', apiKey),
  ]);
  const [locDeps, locTeams, locMembers] = await Promise.all([
    loadCollection('departments'),
    loadCollection('teams'),
    loadCollection('members'),
  ]);

  const writer = new BatchWriter();
  const summary = {};

  // 部門: keyField=code をドキュメントIDに使う
  {
    const keep = new Set();
    for (const item of deps?.items ?? []) {
      const code = item.values?.code;
      if (!code) continue;
      keep.add(code);
      writer.set(db.collection('departments').doc(code), {
        code,
        name: item.values.name || '',
      });
    }
    for (const id of locDeps.keys()) {
      if (!keep.has(id)) writer.delete(db.collection('departments').doc(id));
    }
    summary.departments = { synced: keep.size, deleted: [...locDeps.keys()].filter((id) => !keep.has(id)).length };
  }

  // チーム: parentDeptCode はマスタが直接配信する（推定は不要になった）
  {
    const keep = new Set();
    for (const item of teams?.items ?? []) {
      const code = item.values?.code;
      if (!code) continue;
      keep.add(code);
      writer.set(db.collection('teams').doc(code), {
        code,
        name: item.values.name || '',
        parentDeptCode: item.values.parentDeptCode || null,
        skills: locTeams.get(code)?.skills ?? [],
      });
    }
    for (const id of locTeams.keys()) {
      if (!keep.has(id)) writer.delete(db.collection('teams').doc(id));
    }
    summary.teams = { synced: keep.size, deleted: [...locTeams.keys()].filter((id) => !keep.has(id)).length };
  }

  // 社員: 不変の社員キー（UUID）をドキュメントIDに使う
  {
    const keep = new Set();
    for (const item of emps?.items ?? []) {
      const v = item.values || {};
      if (v.status && v.status !== 'active') continue;
      keep.add(item.id);
      writer.set(db.collection('members').doc(item.id), {
        displayName: v.displayName || '',
        email: v.email || '',
        userPrincipalName: v.userPrincipalName || '',
        deptCode: v.deptCode || null,
        teamCode: v.teamCode || null,
        skillLevels: locMembers.get(item.id)?.skillLevels ?? {},
      });
    }
    for (const id of locMembers.keys()) {
      if (!keep.has(id)) writer.delete(db.collection('members').doc(id));
    }
    summary.members = { synced: keep.size, deleted: [...locMembers.keys()].filter((id) => !keep.has(id)).length };
  }

  writer.set(db.collection('meta').doc('sync'), {
    lastSyncAt: FieldValue.serverTimestamp(),
    generatedAt: emps?.generatedAt || null,
    summary,
  });

  await writer.flush();
  return summary;
}

/** マスタ同期（フロントの設定画面から呼ぶ） */
export const syncMasters = onCall(callOpts, async (request) => {
  requireAuth(request);
  const summary = await runSync(MASTER_MANAGER_API_KEY.value());
  return { summary };
});
