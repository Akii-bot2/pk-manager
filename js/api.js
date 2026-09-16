// ============================================================
// api.js — GAS Web App API 呼び出し共通処理
// ============================================================
// デプロイ後、GAS WebアプリのURLをここに設定する
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbxE-FjJ_Xw-LzWfNlHuZcv_4_wdifVK5QUo0FZhV0Z9e8M6xe7DVZLfxdpswFY_Hu0R/exec';

// 通信の設定。GASは混雑すると数十秒応答しないことがあるため、待つ上限を決めて打ち切る。
// （動作確認で値を差し替えられるよう、定数ではなくオブジェクトにしている）
const GAS_CONFIG = {
  getDeadlineMs:  45000, // GET：再試行を含めて、この時間で諦める（実測で1回20〜50秒かかることがあるため長めに取る）
  getMaxAttempts: 3,     // GET：最大試行回数（すぐに失敗した場合だけ再試行する）
  getRetryWaitMs: 700,   // GET：再試行前の待ち時間（回数に比例して延ばす）
  getMinRetryMs:  3000,  // GET：残り時間がこれ未満なら再試行しない
  postTimeoutMs:  60000, // POST：書き込みは完了している可能性があるので長めに待つ
  cacheMaxAgeMs:  7 * 24 * 60 * 60 * 1000, // 端末に保存したデータを使う期限（7日）
};

// 端末（localStorage）に保存するときのキーの接頭辞。
// 本番とデモは同じドメイン（akii-bot2.github.io）で保存領域を共有するため、
// デプロイIDを含めて、互いのデータが混ざらないようにする。
const GAS_CACHE_PREFIX = 'pkm:v1:' +
  ((GAS_API_URL.match(/\/s\/([^/]+)\/exec/) || [])[1] || 'unknown').slice(-12) + ':';

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
 * タイムアウト付きで通信し、本文をテキストで返す
 * 本文の受信が終わるまでを時間制限の対象にする
 * @param {string} url
 * @param {Object} options - fetch のオプション
 * @param {number} timeoutMs
 * @returns {Promise<string>}
 */
async function fetchTextWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 通信エラーを、画面に出せる日本語のメッセージに揃える
 * @param {Error} e
 * @returns {Error}
 */
function toFriendlyError(e) {
  if (!e) return new Error('データを取得できませんでした。');
  if (e.name === 'AbortError') {
    const err = new Error('サーバーの応答が遅いため中断しました。時間をおいて再読み込みしてください。');
    err.timeout = true;
    return err;
  }
  // fetch 自体が失敗した（オフライン・接続拒否など）
  if (e instanceof TypeError) {
    return new Error('サーバーに接続できませんでした。通信状況を確認してください。');
  }
  return e;
}

/**
 * GAS GET リクエスト
 * - GAS_CONFIG.getDeadlineMs を超えたら諦める（「読み込み中」のまま止まらないように）
 * - すぐに失敗した場合（通信エラー・非JSONのエラーページ）だけ、間隔を空けて再試行する。
 *   時間切れでは再試行しない。こちらが待つのをやめてもGAS側では処理が続いているため、
 *   再試行すると混雑中のGASにさらに処理を積むことになり、かえって遅くなる
 * - 成功した結果は端末に保存し、次回の表示で readGasCache() から先に出せるようにする
 * @param {string} action - getMembers, getSeasons, getCity, getTrainer, getCL, getRanking, getMemberDetail
 * @param {Object} [extra] - 追加クエリパラメータ（例: { id: 1 }）
 * @returns {Promise<any>} - JSONレスポンス
 */
async function gasGet(action, extra = {}) {
  const url = `${GAS_API_URL}?${new URLSearchParams({ action, ...extra })}`;
  const deadline = Date.now() + GAS_CONFIG.getDeadlineMs;
  let lastError;

  for (let attempt = 1; attempt <= GAS_CONFIG.getMaxAttempts; attempt++) {
    try {
      const text = await fetchTextWithTimeout(url, {}, deadline - Date.now());
      const data = parseGasResponse(text);
      writeGasCache(action, extra, data);
      return data;
    } catch (e) {
      // 業務エラーは再試行しても結果が変わらない
      if (e.retriable === false) throw e;
      lastError = e;
      if (e.name === 'AbortError') break; // 時間切れは再試行しない（上のコメント参照）
      const wait = GAS_CONFIG.getRetryWaitMs * attempt;
      if (attempt >= GAS_CONFIG.getMaxAttempts) break;
      if (deadline - Date.now() - wait < GAS_CONFIG.getMinRetryMs) break;
      // 立て続けに叩くとGAS側の混雑を悪化させるので、待ってから再試行する
      await new Promise(r => setTimeout(r, wait));
    }
  }
  throw toFriendlyError(lastError);
}

/**
 * GAS POST リクエスト
 * 書き込みなので再試行はしない（二重登録を避けるため）。
 * 応答が返らなかった場合、サーバー側では完了している可能性があるので、確認を促す。
 * @param {Object} params - action を含むパラメータオブジェクト
 * @returns {Promise<any>} - JSONレスポンス
 */
async function gasPost(params) {
  const maybeDone = '登録・更新は完了している可能性があるため、画面を再読み込みして反映を確認してから、必要なら再度お試しください。';
  let text;
  try {
    text = await fetchTextWithTimeout(GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify(params),
    }, GAS_CONFIG.postTimeoutMs);
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('サーバーの応答がありませんでした。' + maybeDone);
    throw toFriendlyError(e);
  }
  try {
    return parseGasResponse(text);
  } catch (e) {
    if (e.retriable) throw new Error('サーバーから正しい応答が返りませんでした。' + maybeDone);
    throw e;
  }
}

// ============================================================
// 端末に保存したデータ（前回の表示内容）
// ============================================================

/**
 * 保存キーを作る（パラメータの順番に左右されないよう並べ替える）
 * @param {string} action
 * @param {Object} [extra]
 * @returns {string}
 */
function gasCacheKey(action, extra = {}) {
  const query = Object.keys(extra).sort()
    .map(k => `${k}=${extra[k]}`)
    .join('&');
  return GAS_CACHE_PREFIX + action + (query ? '?' + query : '');
}

/**
 * 前回取得に成功したデータを返す。無い・期限切れ・読めない場合は null
 * @param {string} action
 * @param {Object} [extra]
 * @returns {{savedAt: number, data: any} | null}
 */
function readGasCache(action, extra = {}) {
  try {
    const raw = localStorage.getItem(gasCacheKey(action, extra));
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry || typeof entry.savedAt !== 'number') return null;
    if (Date.now() - entry.savedAt > GAS_CONFIG.cacheMaxAgeMs) return null;
    return entry;
  } catch {
    // プライベートモード等で localStorage が使えない場合は、保存データ無しとして扱う
    return null;
  }
}

/**
 * 取得に成功したデータを保存する
 * @param {string} action
 * @param {Object} extra
 * @param {any} data
 */
function writeGasCache(action, extra, data) {
  try {
    localStorage.setItem(gasCacheKey(action, extra), JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    // 容量不足・プライベートモード等。保存できなくても表示には影響しない
  }
}

/**
 * 保存時刻を「3分前」のような表示にする
 * @param {number} savedAt
 * @returns {string}
 */
function formatCacheAge(savedAt) {
  if (!savedAt) return '';
  const min = Math.floor((Date.now() - savedAt) / 60000);
  if (min < 1) return 'たった今';
  if (min < 60) return `${min}分前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}時間前`;
  return `${Math.floor(hour / 24)}日前`;
}
