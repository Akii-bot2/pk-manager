// ============================================================
// Maintenance.gs — 保守用の単発スクリプト
// ============================================================
// Webアプリからは呼ばれない。Apps Scriptエディタから手動で実行する。
// 本番デプロイはバージョン固定（@10）のため、このファイルを push しても
// 稼働中のサイトの挙動は変わらない。

// ---- 昨シーズン(2025-2026)のエントリー削除の設定 ----

// 削除対象のトレリ年度
const PURGE_TRAINER_LEAGUE_YEAR = '2025-2026';

// CL記録は league_year 列を持たないため、作成日がこの日より前のものを昨シーズン扱いにする
// （2026-2027シーズンの開始日）
const PURGE_CL_CREATED_BEFORE = '2026-09-01';

// 入力ミスとして個別に消す city_entries の id
// （2027 S4 に登録された 2026-04-19 平塚チェルモ の1件）
const PURGE_EXTRA_CITY_IDS = [43];

/**
 * 何件消えるかを数えるだけ。データは一切変更しない。
 * 実行後、実行ログ（表示 > ログ）に内訳が出る。
 */
function previewPurgeLastSeason() {
  return purgeLastSeason_(true);
}

/**
 * 実際に削除する。先に previewPurgeLastSeason() で件数を確認すること。
 * members / seasons シートには一切触れない。
 */
function runPurgeLastSeason() {
  return purgeLastSeason_(false);
}

/**
 * 昨シーズンのエントリーを削除する
 *
 * 対象の決め方
 *   city_entries    : seasons シートに存在しない season_id の行（＝旧シーズンの孤立行）
 *                     ＋ PURGE_EXTRA_CITY_IDS で指定した行
 *   trainer_entries : league_year が PURGE_TRAINER_LEAGUE_YEAR の行
 *   cl_entries      : created_at が PURGE_CL_CREATED_BEFORE より前の行
 *
 * 今シーズン(2026-2027)の登録が後から増えても巻き込まないよう、
 * 「全行消す」ではなく上記の条件で1行ずつ判定している。
 *
 * @param {boolean} dryRun - true なら数えるだけで削除しない
 * @returns {Object} 削除（予定）件数の内訳
 */
function purgeLastSeason_(dryRun) {
  const liveSeasonIds = new Set(
    getSheet('seasons').getDataRange().getValues().slice(1)
      .map(r => String(r[0]))
      .filter(v => v !== '')
  );

  const report = { dryRun: dryRun, city: [], trainer: [], cl: [] };

  // ---- city_entries ----
  // 列: id(1) | member_id(2) | season_id(3) | is_absent(4) | date(5) | venue(6) ...
  deleteMatchingRows_('city_entries', report.city, function (row) {
    const id       = String(row[0]);
    const seasonId = String(row[2]);
    if (PURGE_EXTRA_CITY_IDS.map(String).indexOf(id) !== -1) return '入力ミス指定';
    if (!liveSeasonIds.has(seasonId)) return '旧シーズン(season_id=' + seasonId + ')';
    return null;
  }, dryRun);

  // ---- trainer_entries ----
  // 列: id(1) | member_id(2) | rank(3) | participants_count(4) | csp_earned(5) | created_at(6) | league_year(7)
  deleteMatchingRows_('trainer_entries', report.trainer, function (row) {
    return String(row[6]) === PURGE_TRAINER_LEAGUE_YEAR
      ? 'league_year=' + PURGE_TRAINER_LEAGUE_YEAR
      : null;
  }, dryRun);

  // ---- cl_entries ----
  // 列: id(1) | member_id(2) | cl_name(3) | rank(4) | wins(5) | losses(6) | deck_code(7) | created_at(8)
  deleteMatchingRows_('cl_entries', report.cl, function (row) {
    const created = normalizeDate_(row[7]);
    return created && created < PURGE_CL_CREATED_BEFORE
      ? 'created_at=' + created
      : null;
  }, dryRun);

  const summary = {
    dryRun:  dryRun,
    city:    report.city.length,
    trainer: report.trainer.length,
    cl:      report.cl.length,
    total:   report.city.length + report.trainer.length + report.cl.length,
  };

  // どのスプレッドシートを対象にしたのかを必ず残す（見ているファイルと違う、という取り違えを防ぐ）
  const ss = SpreadsheetApp.openById(
    PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')
  );
  Logger.log('対象スプレッドシート: 「%s」', ss.getName());
  Logger.log('URL: %s', ss.getUrl());

  if (dryRun) {
    Logger.log('*******************************************');
    Logger.log('*  プレビューです。1件も削除していません。      *');
    Logger.log('*  実際に消すには runPurgeLastSeason を実行  *');
    Logger.log('*******************************************');
  } else {
    Logger.log('=== 削除を実行しました ===');
  }
  Logger.log('city_entries    : %s件', report.city.length);
  report.city.forEach(r => Logger.log('   id=%s %s', r.id, r.reason));
  Logger.log('trainer_entries : %s件', report.trainer.length);
  report.trainer.forEach(r => Logger.log('   id=%s %s', r.id, r.reason));
  Logger.log('cl_entries      : %s件', report.cl.length);
  report.cl.forEach(r => Logger.log('   id=%s %s', r.id, r.reason));
  Logger.log('合計 %s件', summary.total);
  Logger.log('※ members / seasons は変更していません');

  return summary;
}

/**
 * 条件に一致する行を削除する（下の行から消すことで行番号のズレを避ける）
 * @param {string}   sheetName
 * @param {Array}    collected - 一致した行の記録先
 * @param {Function} matcher   - 行を受け取り、対象なら理由文字列・対象外なら null を返す
 * @param {boolean}  dryRun
 */
function deleteMatchingRows_(sheetName, collected, matcher, dryRun) {
  const sheet = getSheet(sheetName);
  const rows = sheet.getDataRange().getValues();

  for (let i = rows.length - 1; i >= 1; i--) { // i=0 はヘッダー行なので触らない
    const reason = matcher(rows[i]);
    if (!reason) continue;
    collected.push({ id: rows[i][0], reason: reason });
    if (!dryRun) sheet.deleteRow(i + 1);
  }
  collected.reverse(); // ログを id 昇順に見せる
}

/**
 * シートから読んだ値を 'YYYY-MM-DD' に揃える（Date型・ISO文字列の両方に対応）
 * @param {*} v
 * @returns {string}
 */
function normalizeDate_(v) {
  if (!v) return '';
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Tokyo', 'yyyy-MM-dd');
  return String(v).substring(0, 10);
}
