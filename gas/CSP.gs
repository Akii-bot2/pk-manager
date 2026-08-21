// ============================================================
// CSP.gs — CSP自動計算ロジック
// ============================================================

// シティリーグ CSPテーブル
// [rank_limit, participants_min, csp]
// participants_min以上の参加者数でこの入賞枠が有効になる
const CITY_CSP_TABLE = [
  [1,  1, 100],
  [2,  4,  75],
  [4,  9,  50],
  [8, 17,  25],
  [16,33,  15],
];

// トレーナーズリーグ CSPテーブル
// [rank_limit, participants_min, csp]
const TRAINER_CSP_TABLE = [
  [1,  2, 15],
  [2,  3, 12],
  [4,  8, 10],
  [8, 13,  8],
  [16,26,  6],
  [32,41,  5],
  [48,56,  4],
];

// トレーナーズリーグ 年間CSP上限
const TRAINER_ANNUAL_LIMIT = 30;

/**
 * シティリーグ CSP計算
 * @param {number} rank         - 最終順位（1位 = 1）
 * @param {number} participants - 参加人数
 * @returns {number} 獲得CSP
 *
 * アルゴリズム：
 *   テーブルを上から走査し、participants_min以上なら入賞枠が有効。
 *   有効な行で rank <= rank_limit なら そのCSPを返す。
 *   participants_min未満になった時点でbreakして0を返す。
 */
function calcCityCSP(rank, participants) {
  for (const [rankLimit, pMin, csp] of CITY_CSP_TABLE) {
    if (participants >= pMin) {
      // この参加者数以上 → この入賞枠が有効
      if (rank <= rankLimit) {
        return csp; // 入賞圏内 → CSPを返す
      }
      // この行のrankLimitを超えている → 次の行（より下位の入賞枠）へ
    } else {
      // participants < pMin → この行以降は参加者数が足りないので打ち切り
      break;
    }
  }
  return 0;
}

/**
 * トレーナーズリーグ CSP計算
 * @param {number} rank         - 最終順位（1位 = 1）
 * @param {number} participants - 参加人数
 * @param {number} currentTotal - 今シーズンのトレリCSP累計（この試合を除く）
 * @returns {number} 獲得CSP（年間上限30pt考慮済み）
 */
function calcTrainerCSP(rank, participants, currentTotal) {
  let cspEarned = 0;

  for (const [rankLimit, pMin, csp] of TRAINER_CSP_TABLE) {
    if (participants >= pMin) {
      if (rank <= rankLimit) {
        cspEarned = csp;
        break;
      }
    } else {
      break;
    }
  }

  // 年間上限チェック：残り枠を超えた分はカット
  const remaining = TRAINER_ANNUAL_LIMIT - currentTotal;
  return Math.max(0, Math.min(cspEarned, remaining));
}

// ============================================================
// testCSP — 単体テスト
// GASエディタから直接実行してログを確認する
// ============================================================
function testCSP() {
  let passCount = 0;
  let failCount = 0;

  /**
   * テストケース実行ヘルパー
   * @param {string} label    - テスト名
   * @param {number} actual   - 実際の値
   * @param {number} expected - 期待値
   */
  function check(label, actual, expected) {
    if (actual === expected) {
      Logger.log(`PASS | ${label} → ${actual}pt`);
      passCount++;
    } else {
      Logger.log(`FAIL | ${label} → 期待値: ${expected}pt, 実際: ${actual}pt`);
      failCount++;
    }
  }

  // ----------------------------------------------------------
  // シティリーグ
  // ----------------------------------------------------------
  Logger.log("===== シティリーグ =====");
  check("参加2名  1位", calcCityCSP(1,  2), 100);
  check("参加2名  2位", calcCityCSP(2,  2),   0);
  check("参加5名  2位", calcCityCSP(2,  5),  75);
  check("参加5名  3位", calcCityCSP(3,  5),   0);
  check("参加11名 4位", calcCityCSP(4, 11),  50);
  check("参加11名 5位", calcCityCSP(5, 11),   0);
  check("参加20名 6位", calcCityCSP(6, 20),  25);
  check("参加20名 9位", calcCityCSP(9, 20),   0);
  check("参加35名 15位", calcCityCSP(15, 35), 15);
  check("参加35名 17位", calcCityCSP(17, 35),  0);

  // ----------------------------------------------------------
  // トレーナーズリーグ（currentTotal=0）
  // ----------------------------------------------------------
  Logger.log("===== トレーナーズリーグ =====");
  check("参加2名  1位", calcTrainerCSP(1,  2, 0), 15);
  check("参加2名  2位", calcTrainerCSP(2,  2, 0),  0);
  check("参加5名  2位", calcTrainerCSP(2,  5, 0), 12);
  check("参加5名  3位", calcTrainerCSP(3,  5, 0),  0);
  check("参加11名 4位", calcTrainerCSP(4, 11, 0), 10);
  check("参加20名 7位", calcTrainerCSP(7, 20, 0),  8);
  check("参加20名 9位", calcTrainerCSP(9, 20, 0),  0);

  // ----------------------------------------------------------
  // トレーナーズリーグ 年間上限テスト
  // ----------------------------------------------------------
  Logger.log("===== トレーナーズリーグ 年間上限 =====");
  check("参加5名 2位 currentTotal=25 → 5pt（残り5ptのみ付与）", calcTrainerCSP(2, 5, 25),  5);
  check("参加5名 2位 currentTotal=30 → 0pt（上限到達済み）",   calcTrainerCSP(2, 5, 30),  0);

  // ----------------------------------------------------------
  // 結果サマリ
  // ----------------------------------------------------------
  Logger.log(`===== テスト完了：${passCount}件PASS / ${failCount}件FAIL =====`);
}
