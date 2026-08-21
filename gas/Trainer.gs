// ============================================================
// Trainer.gs — トレーナーズリーグ操作
// ============================================================
// シート列構成:
//   id(1) | member_id(2) | rank(3) | participants_count(4) | csp_earned(5) | created_at(6) | league_year(7)

/**
 * トレーナーズリーグ全エントリーを返す
 */
function getTrainer() {
  const sheet = getSheet('trainer_entries');
  return sheet.getDataRange().getValues().slice(1).map(row => ({
    id:                 row[0],
    member_id:          row[1],
    rank:               row[2],
    participants_count: row[3],
    csp_earned:         row[4],
    created_at:         row[5],
    league_year:        String(row[6] || ''),
  }));
}

/**
 * トレーナーズリーグ結果を登録する（本人のみ）
 * - 参加人数1名未満は大会不成立としてエラー
 * - 年間CSP上限（30pt）は league_year 単位で管理する
 * - 上限に達した場合はレスポンスに annual_limit_reached: true を付与する
 */
function addTrainer(params) {
  const memberId          = Number(params.member_id);
  const rank              = Number(params.rank);
  const participantsCount = Number(params.participants_count);
  const leagueYear        = String(params.league_year || '').trim();

  if (!memberId || !rank || !participantsCount) {
    throw new Error('member_id / rank / participants_count は必須です');
  }
  if (!leagueYear) {
    throw new Error('league_year は必須です');
  }
  if (participantsCount < 2) {
    throw new Error('参加人数は2名以上が必要です（1名では大会不成立）');
  }

  // 同一 league_year のトレリCSP累計を取得（年間上限チェック用）
  const allTrainer = getTrainer();
  const currentTotal = allTrainer
    .filter(e => Number(e.member_id) === memberId && e.league_year === leagueYear)
    .reduce((sum, e) => sum + Number(e.csp_earned || 0), 0);

  const cspEarned = calcTrainerCSP(rank, participantsCount, currentTotal);

  const sheet = getSheet('trainer_entries');
  const id = nextId(sheet);
  // league_year を末尾に保存
  sheet.appendRow([id, memberId, rank, participantsCount, cspEarned, nowISO(), leagueYear]);

  // 上限到達フラグ（フロントエンドで警告表示に使用）
  const annualLimitReached = currentTotal + cspEarned >= TRAINER_ANNUAL_LIMIT;
  return { success: true, id, csp_earned: cspEarned, annual_limit_reached: annualLimitReached };
}

/**
 * トレーナーズリーグ エントリーを削除する（本人または管理者）
 * ※ 削除時はCSPが遡って減算されないため、フロントエンドで注意を促すこと
 */
function deleteTrainer(params) {
  const targetId = Number(params.id);
  const sheet = getSheet('trainer_entries');
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (Number(rows[i][0]) !== targetId) continue;
    checkSelfOrAdmin(params, rows[i][1]);
    sheet.deleteRow(i + 1);
    return { success: true };
  }
  throw new Error('エントリーが見つかりません');
}
