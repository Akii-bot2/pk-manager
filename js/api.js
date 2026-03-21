// ============================================================
// api.js — GAS Web App API 呼び出し共通処理
// ============================================================
// デプロイ後、GAS WebアプリのURLをここに設定する
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbxE-FjJ_Xw-LzWfNlHuZcv_4_wdifVK5QUo0FZhV0Z9e8M6xe7DVZLfxdpswFY_Hu0R/exec';

/**
 * GAS GET リクエスト
 * @param {string} action - getMembers, getSeasons, getCity, getTrainer, getCL, getRanking, getMemberDetail
 * @param {Object} [extra] - 追加クエリパラメータ（例: { id: 1 }）
 * @returns {Promise<any>} - JSONレスポンス
 */
async function gasGet(action, extra = {}) {
  const params = new URLSearchParams({ action, ...extra });
  const res = await fetch(`${GAS_API_URL}?${params}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

/**
 * GAS POST リクエスト
 * @param {Object} params - action を含むパラメータオブジェクト
 * @returns {Promise<any>} - JSONレスポンス
 */
async function gasPost(params) {
  const res = await fetch(GAS_API_URL, {
    method: 'POST',
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}
