// ============================================================
// csp.js — クライアント側 CSP 計算（プレビュー用）
// ============================================================
// GAS の CSP.gs と同一アルゴリズム（要件定義書 6-2, 6-3 準拠）

const CITY_CSP_TABLE = [
  [1,  1, 100],
  [2,  4,  75],
  [4,  9,  50],
  [8, 17,  25],
  [16,33,  15],
];

const TRAINER_CSP_TABLE = [
  [1,  2, 15],
  [2,  3, 12],
  [4,  8, 10],
  [8, 13,  8],
  [16,26,  6],
  [32,41,  5],
  [48,56,  4],
];

const TRAINER_ANNUAL_LIMIT = 30;

/**
 * シティリーグ CSP 計算（プレビュー用）
 * @param {number} rank
 * @param {number} participants
 * @returns {number}
 */
function previewCityCSP(rank, participants) {
  const r = parseInt(rank);
  const p = parseInt(participants);
  if (!r || !p || r < 1 || p < 1) return 0;
  for (const [rankLimit, pMin, csp] of CITY_CSP_TABLE) {
    if (p >= pMin) {
      if (r <= rankLimit) return csp;
    } else {
      break;
    }
  }
  return 0;
}

/**
 * トレーナーズリーグ CSP 計算（プレビュー用）
 * @param {number} rank
 * @param {number} participants
 * @param {number} currentTotal - 現在の年間累計（この試合を除く）
 * @returns {number}
 */
function previewTrainerCSP(rank, participants, currentTotal = 0) {
  const r = parseInt(rank);
  const p = parseInt(participants);
  if (!r || !p || r < 1 || p < 2) return 0;
  let cspEarned = 0;
  for (const [rankLimit, pMin, csp] of TRAINER_CSP_TABLE) {
    if (p >= pMin) {
      if (r <= rankLimit) { cspEarned = csp; break; }
    } else {
      break;
    }
  }
  const remaining = TRAINER_ANNUAL_LIMIT - currentTotal;
  return Math.max(0, Math.min(cspEarned, remaining));
}

/**
 * 日時をローカライズ表示
 * @param {string} iso
 * @returns {string}
 */
function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('ja-JP', {
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
