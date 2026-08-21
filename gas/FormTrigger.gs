// ============================================================
// FormTrigger.gs — Googleフォーム送信トリガー処理
// ============================================================
// 各フォームの「送信時」トリガーをGASのトリガー設定画面から手動で登録すること。
// フォームの質問タイトル（namedValuesのキー）はフォーム側と合わせる必要がある。
//
// 設定手順：
//   GASエディタ → 左メニュー「トリガー」→「トリガーを追加」
//   関数: onCityFormSubmit / onTrainerFormSubmit / onCLFormSubmit
//   イベントのソース: スプレッドシートから → フォーム送信時
// ============================================================

/**
 * シティリーグ結果フォーム送信時に呼ばれるトリガー関数
 *
 * Googleフォームの質問タイトル（日本語）:
 *   「メンバーID」「シーズンID」「不参加（はい/いいえ）」「日付」
 *   「会場名」「順位」「参加人数」「デッキコード」
 */
function onCityFormSubmit(e) {
  try {
    const r = e.namedValues; // { 質問タイトル: [回答値], ... }

    const params = {
      member_id:          Number(r['メンバーID']?.[0]),
      season_id:          Number(r['シーズンID']?.[0]),
      is_absent:          r['不参加']?.[0] === 'はい',
      date:               r['日付']?.[0]     || '',
      venue:              r['会場名']?.[0]   || '',
      rank:               r['順位']?.[0]     || null,
      participants_count: r['参加人数']?.[0] || null,
      deck_code:          r['デッキコード']?.[0] || '',
    };

    const result = addCity(params);
    Logger.log('シティリーグ登録完了: member_id=%s, csp=%s', params.member_id, result.csp_earned);
  } catch (err) {
    Logger.log('シティリーグ登録エラー: ' + err.message);
  }
}

/**
 * トレーナーズリーグ結果フォーム送信時に呼ばれるトリガー関数
 *
 * Googleフォームの質問タイトル（日本語）:
 *   「メンバーID」「順位」「参加人数」
 */
function onTrainerFormSubmit(e) {
  try {
    const r = e.namedValues;

    const params = {
      member_id:          Number(r['メンバーID']?.[0]),
      rank:               Number(r['順位']?.[0]),
      participants_count: Number(r['参加人数']?.[0]),
    };

    const result = addTrainer(params);
    Logger.log(
      'トレリ登録完了: member_id=%s, csp=%s, 年間上限到達=%s',
      params.member_id, result.csp_earned, result.annual_limit_reached
    );
  } catch (err) {
    Logger.log('トレリ登録エラー: ' + err.message);
  }
}

/**
 * CL記録フォーム送信時に呼ばれるトリガー関数
 *
 * Googleフォームの質問タイトル（日本語）:
 *   「メンバーID」「CL名」「順位」「勝数」「敗数」「デッキコード」
 */
function onCLFormSubmit(e) {
  try {
    const r = e.namedValues;

    const params = {
      member_id: Number(r['メンバーID']?.[0]),
      cl_name:   r['CL名']?.[0]       || '',
      rank:      r['順位']?.[0]       || null,
      wins:      r['勝数']?.[0]       || null,
      losses:    r['敗数']?.[0]       || null,
      deck_code: r['デッキコード']?.[0] || '',
    };

    addCL(params);
    Logger.log('CL登録完了: member_id=%s, cl=%s', params.member_id, params.cl_name);
  } catch (err) {
    Logger.log('CL登録エラー: ' + err.message);
  }
}
