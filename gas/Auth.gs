// ============================================================
// Auth.gs — 管理者認証・権限チェック
// ============================================================

/**
 * 管理者パスワードを検証する
 * @param {Object} params - リクエストパラメータ（admin_passwordキーを使用）
 * @returns {boolean}
 */
function isAdmin(params) {
  const adminPass = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  return typeof params.admin_password === 'string' && params.admin_password === adminPass;
}

/**
 * 本人または管理者であることを確認する
 * 違反した場合はエラーをthrowする
 *
 * 「本人」の確認はリクエストの member_id と対象レコードの member_id の一致で行う。
 * （パスワード不要。小規模コミュニティ向けの簡易認証）
 *
 * @param {Object} params         - リクエストパラメータ
 * @param {number} targetMemberId - 対象レコードの member_id
 */
function checkSelfOrAdmin(params, targetMemberId) {
  if (isAdmin(params)) return; // 管理者はすべて許可
  if (Number(params.member_id) === Number(targetMemberId)) return; // 本人は許可
  throw new Error('権限がありません');
}

/**
 * adminLogin アクション
 * フロントエンドからパスワードを受け取り、管理者かどうかを返す
 * localStorageでのログイン状態管理はフロントエンド側で行う
 */
function adminLogin(params) {
  if (isAdmin(params)) {
    return { success: true };
  }
  return { success: false, error: 'パスワードが正しくありません' };
}
