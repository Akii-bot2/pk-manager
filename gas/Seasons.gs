// ============================================================
// Seasons.gs — シーズンマスタ操作
// ============================================================
// シート列構成: id(1) | year(2) | season_number(3) | name(4) | league_year(5) ← 一番右

/**
 * シーズン一覧を返す
 * league_year 列を含めて返す
 */
function getSeasons() {
  const sheet = getSheet('seasons');
  return sheet.getDataRange().getValues().slice(1).map(row => ({
    id:            row[0],
    year:          row[1],
    season_number: row[2],
    name:          row[3],
    league_year:   String(row[4] || ''),
  }));
}

/**
 * 年度（league_year）一覧を返す（重複なし・昇順）
 * seasonsシートの league_year 列から一意の値を取得する
 */
function getLeagueYears() {
  const seasons = getSeasons();
  const years = [...new Set(seasons.map(s => s.league_year).filter(Boolean))];
  return years.sort();
}

/**
 * 現在日付から league_year を自動判定する（共通ユーティリティ）
 * 9月1日以降を新シーズンとする
 * 例）2026年9月以降 → "2026-2027" / 2026年8月以前 → "2025-2026"
 */
function getCurrentLeagueYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1〜12
  return month >= 9 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

/**
 * シーズンを追加する（管理者のみ）
 * 例）league_year="2025-2026", year=2026, season_number=2, name="2025-2026 S2"
 */
function addSeason(params) {
  if (!isAdmin(params)) throw new Error('管理者権限が必要です');

  const leagueYear    = String(params.league_year || '').trim();
  const year          = Number(params.year);
  const seasonNumber  = Number(params.season_number);
  const name          = String(params.name || '').trim();

  if (!leagueYear || !year || !seasonNumber || !name) {
    throw new Error('league_year / year / season_number / name はすべて必須です');
  }

  const sheet = getSheet('seasons');
  const id = nextId(sheet);
  // 列順: id | year | season_number | name | league_year（一番右）
  sheet.appendRow([id, year, seasonNumber, name, leagueYear]);
  return { success: true, id };
}

/**
 * シーズンを削除する（管理者のみ）
 */
function deleteSeason(params) {
  if (!isAdmin(params)) throw new Error('管理者権限が必要です');

  const targetId = Number(params.id);
  const sheet = getSheet('seasons');
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (Number(rows[i][0]) === targetId) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  throw new Error('シーズンが見つかりません');
}
