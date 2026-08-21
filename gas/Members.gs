// ============================================================
// Members.gs — メンバー操作
// ============================================================
// シート列構成: id(1) | name(2) | created_at(3)

/**
 * メンバー一覧を返す
 */
function getMembers() {
  const sheet = getSheet('members');
  return sheet.getDataRange().getValues().slice(1).map(row => ({
    id:         row[0],
    name:       row[1],
    created_at: row[2],
    marks:      row[3] || '',
  }));
}

/**
 * メンバーのバッジ（marks）を更新する（管理者のみ）
 * marks は "WCS,JCS,CL" のようなカンマ区切り文字列
 */
function updateMemberMarks(params) {
  if (!isAdmin(params)) throw new Error('管理者権限が必要です');
  const targetId = Number(params.id);
  const marks = String(params.marks || '');

  const sheet = getSheet('members');
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (Number(rows[i][0]) === targetId) {
      sheet.getRange(i + 1, 4).setValue(marks); // D列 = marks
      return { success: true };
    }
  }
  throw new Error('メンバーが見つかりません');
}

/**
 * メンバーを登録する
 * バリデーション：名前は必須・ユニーク
 */
function addMember(params) {
  const name = String(params.name || '').trim();
  if (!name) throw new Error('名前を入力してください');

  const sheet = getSheet('members');
  const existing = getMembers();
  if (existing.some(m => m.name === name)) {
    throw new Error('その名前はすでに使用されています');
  }

  const id = nextId(sheet);
  sheet.appendRow([id, name, nowISO()]);
  return { success: true, id };
}

/**
 * メンバー名を編集する（本人または管理者）
 */
function updateMember(params) {
  const targetId = Number(params.id);
  checkSelfOrAdmin(params, targetId);

  const name = String(params.name || '').trim();
  if (!name) throw new Error('名前を入力してください');

  const sheet = getSheet('members');
  const rows = sheet.getDataRange().getValues();

  // 名前の重複チェック（自分以外）
  const duplicate = rows.slice(1).some(
    row => row[1] === name && Number(row[0]) !== targetId
  );
  if (duplicate) throw new Error('その名前はすでに使用されています');

  for (let i = 1; i < rows.length; i++) {
    if (Number(rows[i][0]) === targetId) {
      sheet.getRange(i + 1, 2).setValue(name); // B列 = name
      return { success: true };
    }
  }
  throw new Error('メンバーが見つかりません');
}

/**
 * メンバーを削除する（本人または管理者）
 */
function deleteMember(params) {
  const targetId = Number(params.id);
  checkSelfOrAdmin(params, targetId);

  const sheet = getSheet('members');
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (Number(rows[i][0]) === targetId) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  throw new Error('メンバーが見つかりません');
}
