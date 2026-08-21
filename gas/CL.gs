// ============================================================
// CL.gs — チャンピオンズリーグ操作（記録のみ・CSP付与なし）
// ============================================================
// シート列構成:
//   id(1) | member_id(2) | cl_name(3) | rank(4) | wins(5) | losses(6) | deck_code(7) | created_at(8)

/**
 * CL全エントリーを返す
 */
function getCL() {
  const sheet = getSheet('cl_entries');
  return sheet.getDataRange().getValues().slice(1).map(row => ({
    id:         row[0],
    member_id:  row[1],
    cl_name:    row[2],
    rank:       row[3],
    wins:       row[4],
    losses:     row[5],
    deck_code:  row[6],
    created_at: row[7],
  }));
}

/**
 * CL記録を登録する（本人のみ）
 * CSPは付与しない（記録目的のみ）
 */
function addCL(params) {
  const memberId = Number(params.member_id);
  const clName   = String(params.cl_name || '').trim();
  if (!memberId || !clName) throw new Error('member_id と cl_name は必須です');

  const rank     = params.rank     ? Number(params.rank)     : '';
  const wins     = params.wins     ? Number(params.wins)     : '';
  const losses   = params.losses   ? Number(params.losses)   : '';
  const deckCode = params.deck_code || '';

  const sheet = getSheet('cl_entries');
  const id = nextId(sheet);
  sheet.appendRow([id, memberId, clName, rank, wins, losses, deckCode, nowISO()]);
  return { success: true, id };
}

/**
 * CL記録を編集する（本人または管理者）
 * created_at は変更しない
 */
function updateCL(params) {
  const targetId = Number(params.id);
  const sheet = getSheet('cl_entries');
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (Number(rows[i][0]) !== targetId) continue;
    checkSelfOrAdmin(params, rows[i][1]);

    const clName   = String(params.cl_name || rows[i][2]).trim();
    const rank     = params.rank     ? Number(params.rank)   : '';
    const wins     = params.wins     ? Number(params.wins)   : '';
    const losses   = params.losses   ? Number(params.losses) : '';
    const deckCode = params.deck_code || '';

    // 列3〜7（cl_name〜deck_code）を更新（5列）。created_at(列8)は変更しない
    sheet.getRange(i + 1, 3, 1, 5).setValues([[clName, rank, wins, losses, deckCode]]);
    return { success: true };
  }
  throw new Error('エントリーが見つかりません');
}

/**
 * CL記録を削除する（本人または管理者）
 */
function deleteCL(params) {
  const targetId = Number(params.id);
  const sheet = getSheet('cl_entries');
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (Number(rows[i][0]) !== targetId) continue;
    checkSelfOrAdmin(params, rows[i][1]);
    sheet.deleteRow(i + 1);
    return { success: true };
  }
  throw new Error('エントリーが見つかりません');
}
