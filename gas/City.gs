// ============================================================
// City.gs — シティリーグ参加予定・結果操作
// ============================================================
// シート列構成:
//   id(1) | member_id(2) | season_id(3) | is_absent(4) | date(5) | venue(6)
//   rank(7) | participants_count(8) | deck_code(9) | csp_earned(10) | updated_at(11)

/**
 * シティリーグ全エントリーを返す
 */
function getCity() {
  const sheet = getSheet('city_entries');
  return sheet.getDataRange().getValues().slice(1).map(row => ({
    id:                 row[0],
    member_id:          row[1],
    season_id:          row[2],
    is_absent:          row[3],
    date:               (function(v){ if(!v) return ''; if(v instanceof Date) return Utilities.formatDate(v,'Asia/Tokyo','yyyy-MM-dd'); var s=String(v); return s.length>10 ? Utilities.formatDate(new Date(s),'Asia/Tokyo','yyyy-MM-dd') : s.substring(0,10); })(row[4]),
    venue:              row[5],
    rank:               row[6],
    participants_count: row[7],
    deck_code:          row[8],
    csp_earned:         row[9],
    updated_at:         row[10],
  }));
}

/**
 * シティリーグ 参加予定・結果を登録する（本人のみ）
 * バリデーション：同一 member_id × season_id の登録は1件まで
 */
function addCity(params) {
  const memberId  = Number(params.member_id);
  const seasonId  = Number(params.season_id);
  if (!memberId || !seasonId) throw new Error('member_id と season_id は必須です');

  // 同一シーズン×メンバーの重複チェック
  const existing = getCity();
  if (existing.some(e => Number(e.member_id) === memberId && Number(e.season_id) === seasonId)) {
    throw new Error('このシーズンはすでに登録済みです（1シーズン1エントリーのみ）');
  }

  const isAbsent         = params.is_absent ? 1 : 0;
  const rank             = params.rank             ? Number(params.rank)             : '';
  const participantsCount = params.participants_count ? Number(params.participants_count) : '';
  const date             = params.date             || '';
  const venue            = params.venue            || '';
  const deckCode         = params.deck_code        || '';

  // CSP自動計算（不参加・順位/参加人数なしの場合は0）
  let cspEarned = 0;
  if (!isAbsent && rank && participantsCount) {
    cspEarned = calcCityCSP(Number(rank), Number(participantsCount));
  }

  const sheet = getSheet('city_entries');
  const id = nextId(sheet);
  sheet.appendRow([id, memberId, seasonId, isAbsent, date, venue, rank, participantsCount, deckCode, cspEarned, nowISO()]);
  return { success: true, id, csp_earned: cspEarned };
}

/**
 * シティリーグ エントリーを編集する（本人または管理者）
 * 順位・参加人数が更新された場合はCSPを再計算する
 */
function updateCity(params) {
  const targetId = Number(params.id);
  const sheet = getSheet('city_entries');
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (Number(rows[i][0]) !== targetId) continue;

    // 権限チェック（レコードの member_id で確認）
    checkSelfOrAdmin(params, rows[i][1]);

    const isAbsent          = params.is_absent ? 1 : 0;
    const rank              = params.rank              ? Number(params.rank)              : '';
    const participantsCount = params.participants_count ? Number(params.participants_count) : '';
    const date              = params.date              || '';
    const venue             = params.venue             || '';
    const deckCode          = params.deck_code         || '';

    // CSP再計算
    let cspEarned = 0;
    if (!isAbsent && rank && participantsCount) {
      cspEarned = calcCityCSP(Number(rank), Number(participantsCount));
    }

    // 列4〜11（is_absent〜updated_at）を更新（8列）
    sheet.getRange(i + 1, 4, 1, 8).setValues([[
      isAbsent, date, venue, rank, participantsCount, deckCode, cspEarned, nowISO()
    ]]);
    return { success: true, csp_earned: cspEarned };
  }
  throw new Error('エントリーが見つかりません');
}

/**
 * シティリーグ エントリーを削除する（本人または管理者）
 */
function deleteCity(params) {
  const targetId = Number(params.id);
  const sheet = getSheet('city_entries');
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (Number(rows[i][0]) !== targetId) continue;
    checkSelfOrAdmin(params, rows[i][1]);
    sheet.deleteRow(i + 1);
    return { success: true };
  }
  throw new Error('エントリーが見つかりません');
}
