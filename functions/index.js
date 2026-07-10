/**
 * Cloud Functions — master-manager 連携プロキシ
 *
 * master-manager の配信APIは「サーバー側からのみ」呼び出せる仕様のため、
 * APIキーをこのFunctions内（Secret）に隠し、フロントからはCallable経由で叩く。
 *
 * 二重認証:
 *   1. Google の身分証明   … GoogleAuth が Functions のサービスアカウントで
 *                            IDトークンを自動取得し Authorization: Bearer に付与
 *   2. master-manager APIキー … X-API-Key ヘッダ（Secret から注入）
 *
 * 呼び出し側(フロント)は Firebase Auth でログイン済みであることを必須とする。
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { GoogleAuth } from 'google-auth-library';

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
    const body = err?.response?.data;
    console.error(`master-manager API error ${status} on ${path}:`, body);
    if (status === 401 || status === 403) {
      throw new HttpsError('permission-denied', 'master-manager APIキーまたは認可設定が無効です');
    }
    if (status === 404) {
      throw new HttpsError('not-found', 'リソースが見つかりません');
    }
    throw new HttpsError('internal', `master-manager API呼び出しに失敗しました (${status ?? 'network'})`);
  }
}

/** 呼び出し元が Firebase Auth 認証済みかを保証する */
function requireAuth(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'ログインが必要です');
  }
}

const callOpts = { secrets: [MASTER_MANAGER_API_KEY], region: 'asia-northeast1' };

/**
 * 在籍社員の一覧を取得（nextCursor を辿って全件連結して返す）。
 * @param {{ since?: string, includeInactive?: boolean }} data
 */
export const getEmployees = onCall(callOpts, async (request) => {
  requireAuth(request);
  const apiKey = MASTER_MANAGER_API_KEY.value();
  const { since, includeInactive } = request.data || {};

  const all = [];
  let cursor;
  let generatedAt = null;
  do {
    const page = await apiGet('/employees', apiKey, {
      since,
      includeInactive: includeInactive ? true : undefined,
      limit: 200,
      cursor,
    });
    all.push(...(page.data || []));
    cursor = page.meta?.nextCursor || undefined;
    generatedAt = page.meta?.generatedAt || generatedAt;
  } while (cursor);

  return { employees: all, generatedAt };
});

/** 社員1件を取得 */
export const getEmployee = onCall(callOpts, async (request) => {
  requireAuth(request);
  const { id } = request.data || {};
  if (!id) throw new HttpsError('invalid-argument', 'id は必須です');
  const data = await apiGet(`/employees/${encodeURIComponent(id)}`, MASTER_MANAGER_API_KEY.value());
  return data;
});

/** カスタム列（マスタ）定義を取得 */
export const getMasters = onCall(callOpts, async (request) => {
  requireAuth(request);
  const data = await apiGet('/masters', MASTER_MANAGER_API_KEY.value());
  return data;
});

/** 指定マスタの項目一覧を取得 */
export const getMasterItems = onCall(callOpts, async (request) => {
  requireAuth(request);
  const { masterId, since } = request.data || {};
  if (!masterId) throw new HttpsError('invalid-argument', 'masterId は必須です');
  const data = await apiGet(
    `/masters/${encodeURIComponent(masterId)}/items`,
    MASTER_MANAGER_API_KEY.value(),
    { since },
  );
  return data;
});
