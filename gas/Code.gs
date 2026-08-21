// ============================================================
// Code.gs — doGet / doPost エントリーポイント + 共通ユーティリティ
// ============================================================

// ---- GETリクエスト ----
function doGet(e) {
  const action = e.parameter.action;
  try {
    let result;
    switch (action) {
      case 'getMembers':      result = getMembers();                        break;
      case 'getSeasons':      result = getSeasons();                                                       break;
      case 'getLeagueYears':  result = getLeagueYears();                                                  break;
      case 'getCity':         result = getCity();                                                          break;
      case 'getTrainer':      result = getTrainer();                                                       break;
      case 'getCL':           result = getCL();                                                            break;
      case 'getRanking':      result = getRanking(e.parameter.league_year);                               break;
      case 'getMemberDetail': result = getMemberDetail(e.parameter.id, e.parameter.league_year);          break;
      default:                result = { error: '不明なアクション: ' + action };
    }
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// ---- POSTリクエスト ----
// リクエストボディはJSON文字列として受け取る
function doPost(e) {
  let params;
  try {
    params = JSON.parse(e.postData.contents);
  } catch (_) {
    return jsonResponse({ error: 'リクエストボディのJSON解析に失敗しました' });
  }

  const action = params.action;
  try {
    let result;
    switch (action) {
      case 'addMember':      result = addMember(params);      break;
      case 'updateMember':   result = updateMember(params);   break;
      case 'deleteMember':   result = deleteMember(params);   break;
      case 'addSeason':      result = addSeason(params);      break;
      case 'deleteSeason':   result = deleteSeason(params);   break;
      case 'addCity':        result = addCity(params);        break;
      case 'updateCity':     result = updateCity(params);     break;
      case 'deleteCity':     result = deleteCity(params);     break;
      case 'addTrainer':     result = addTrainer(params);     break;
      case 'deleteTrainer':  result = deleteTrainer(params);  break;
      case 'addCL':          result = addCL(params);          break;
      case 'updateCL':       result = updateCL(params);       break;
      case 'deleteCL':       result = deleteCL(params);       break;
      case 'updateMemberMarks': result = updateMemberMarks(params); break;
      case 'adminLogin':     result = adminLogin(params);     break;
      default:               result = { error: '不明なアクション: ' + action };
    }
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// ============================================================
// 共通ユーティリティ
// ============================================================

/**
 * スプレッドシートの指定シートを返す
 * SPREADSHEET_IDはスクリプトプロパティに設定すること
 */
function getSheet(sheetName) {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const ss = SpreadsheetApp.openById(id);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('シートが見つかりません: ' + sheetName);
  return sheet;
}

/**
 * 次のIDを採番する（既存の最大ID + 1）
 * ヘッダー行を除いた1列目の最大値を使用する
 */
function nextId(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return 1; // ヘッダーのみの場合
  const ids = data.slice(1)
    .map(row => Number(row[0]))
    .filter(id => Number.isFinite(id) && id > 0);
  return ids.length > 0 ? Math.max(...ids) + 1 : 1;
}

/**
 * 現在日時をISO 8601形式（UTC）で返す
 */
function nowISO() {
  return new Date().toISOString();
}

/**
 * JSONレスポンスを生成する
 * ※ GASのContentServiceはカスタムヘッダーを設定できないため、
 *   CORSはWebアプリのデプロイ設定（「全員がアクセス可能」）で対応する。
 */
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}