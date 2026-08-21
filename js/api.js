// ============================================================
// api.js — GAS Web App API 呼び出し共通処理
// ============================================================
// デプロイ後、GAS WebアプリのURLをここに設定する
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbxE-FjJ_Xw-LzWfNlHuZcv_4_wdifVK5QUo0FZhV0Z9e8M6xe7DVZLfxdpswFY_Hu0R/exec';

// GET の再試行回数。GASは混み合うとJSONではなくHTMLのエラーページを返すことがあり、
// 1回失敗しただけで画面が真っ白になるのを防ぐ。
const GAS_GET_RETRIES = 2;

/**
 * GASの応答をJSONとして解釈する
 * GASが返した業務エラー（{error: "..."}）は再試行しても結果が変わらないので retriable=false で区別する
 * @param {string} text
 * @returns {any}
 */
function parseGasResponse(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    const err = new Error('サーバーから正しい応答が返りませんでした（混み合っている可能性があります）');
    err.retriable = true;
    throw err;
  }
  if (data && data.error) {
    const err = new Error(data.error);
    err.retriable = false;
    throw err;
  }
  return data;
}

/**
 * GAS GET リクエスト
 * 通信エラー・非JSON応答のときだけ、間隔を空けて再試行する
 * @param {string} action - getMembers, getSeasons, getCity, getTrainer, getCL, getRanking, getMemberDetail
 * @param {Object} [extra] - 追加クエリパラメータ（例: { id: 1 }）
 * @returns {Promise<any>} - JSONレスポンス
 */
async function gasGet(action, extra = {}) {
  const params = new URLSearchParams({ action, ...extra });
  let lastError;

  for (let attempt = 0; attempt <= GAS_GET_RETRIES; attempt++) {
    try {
      const res = await fetch(`${GAS_API_URL}?${params}`);
      return parseGasResponse(await res.text());
    } catch (e) {
      // 業務エラーは再試行しない
      if (e.retriable === false) throw e;
      lastError = e;
      if (attempt < GAS_GET_RETRIES) {
        // 立て続けに叩くとGAS側の制限を悪化させるので、待ってから再試行する
        await new Promise(r => setTimeout(r, 700 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

/**
 * GAS POST リクエスト
 * 書き込みなので再試行はしない（二重登録を避けるため）
 * @param {Object} params - action を含むパラメータオブジェクト
 * @returns {Promise<any>} - JSONレスポンス
 */
async function gasPost(params) {
  const res = await fetch(GAS_API_URL, {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return parseGasResponse(await res.text());
}
