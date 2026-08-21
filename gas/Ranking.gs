// ============================================================
// Ranking.gs — CSPランキング集計・個人詳細
// ============================================================

// 出場権マークのコミュニティ内順位基準
// ⚠️ コミュニティ内順位と全国順位は異なる。表示は目安として扱うこと。
const MARK_WCS_RANK  = 40;  // コミュニティ1〜40位 → WCS優先出場権の目安
const MARK_JCS_RANK  = 200; // コミュニティ1〜200位 → JCS優先出場権の目安
const MARK_CL_RANK   = 40;  // コミュニティ1〜40位 → 次回CL優先出場権の目安

// 賞品獲得ラインCSP閾値
const PRIZE_LINE_30 = 30;
const PRIZE_LINE_80 = 80;

/**
 * CSPランキング一覧を返す（降順・出場権マーク付き）
 *
 * @param {string} [leagueYear] - 年度指定（例："2025-2026"）。未指定時は最新年度
 * 各メンバーのCSP合計 = シティリーグCSP合計 + トレーナーズリーグCSP合計
 * CLはCSP付与なし
 */
function getRanking(leagueYear) {
  // 対象年度を決定
  // 1. 引数で指定された年度を優先
  // 2. 未指定の場合は現在日付から自動判定（getCurrentLeagueYear）
  // 3. 自動判定した年度がスプレッドシートに存在しない場合は最新年度にフォールバック
  const allYears = getLeagueYears();
  const calcYear = getCurrentLeagueYear();
  const targetYear = leagueYear
    || (allYears.includes(calcYear) ? calcYear : (allYears.length > 0 ? allYears[allYears.length - 1] : null));

  // 対象年度のseason_id一覧を取得
  const allSeasons = getSeasons();
  const targetSeasonIds = allSeasons
    .filter(s => s.league_year === targetYear)
    .map(s => Number(s.id));

  const members = getMembers();
  // 対象年度のseason_idに紐づくシティエントリーのみ集計
  const cityEntries    = getCity().filter(e => targetSeasonIds.includes(Number(e.season_id)));
  // 対象年度のトレリエントリーのみ集計
  const trainerEntries = getTrainer().filter(e => e.league_year === targetYear);

  // メンバーごとにCSP合計を集計
  const ranking = members.map(member => {
    const id = Number(member.id);

    const cityCsp = cityEntries
      .filter(e => Number(e.member_id) === id)
      .reduce((sum, e) => sum + Number(e.csp_earned || 0), 0);

    const trainerCsp = trainerEntries
      .filter(e => Number(e.member_id) === id)
      .reduce((sum, e) => sum + Number(e.csp_earned || 0), 0);

    return {
      id,
      name:        member.name,
      city_csp:    cityCsp,
      trainer_csp: trainerCsp,
      total_csp:   cityCsp + trainerCsp,
      rawMarks:    member.marks || '',
    };
  });

  // CSP降順でソート（同点は名前の昇順）
  ranking.sort((a, b) => b.total_csp - a.total_csp || a.name.localeCompare(b.name, 'ja'));

  // コミュニティ内順位とマークを付与（管理者が手動設定したmarksを使用）
  return ranking.map((member, index) => {
    const communityRank = index + 1;
    const marks = member.rawMarks ? member.rawMarks.split(',').filter(Boolean) : [];
    return { ...member, community_rank: communityRank, marks };
  });
}

/**
 * 個人詳細を返す
 * - CSP内訳（シティシーズン別・トレリ合計）
 * - 賞品ライン達成状況（30pt / 80pt）
 * - 各賞品ラインまでの残りpt
 * - CL参加履歴一覧
 *
 * @param {string|number} memberId
 * @param {string} [leagueYear] - 年度指定（例："2025-2026"）。未指定時は最新年度
 */
function getMemberDetail(memberId, leagueYear) {
  const id = Number(memberId);
  if (!id) throw new Error('id は必須です');

  const members = getMembers();
  const member  = members.find(m => Number(m.id) === id);
  if (!member) throw new Error('メンバーが見つかりません');

  // 対象年度を決定（getRankingと同じロジック）
  const allYears = getLeagueYears();
  const calcYear = getCurrentLeagueYear();
  const targetYear = leagueYear
    || (allYears.includes(calcYear) ? calcYear : (allYears.length > 0 ? allYears[allYears.length - 1] : null));

  // 対象年度のシーズンのみに絞る
  const allSeasons = getSeasons();
  const seasons    = allSeasons.filter(s => s.league_year === targetYear);

  const cityEntries    = getCity()   .filter(e => Number(e.member_id) === id);
  // トレリは league_year で直接フィルタ
  const trainerEntries = getTrainer()
    .filter(e => Number(e.member_id) === id)
    .filter(e => e.league_year === targetYear);
  // CLは年度に関係なく全件表示
  const clEntries      = getCL()     .filter(e => Number(e.member_id) === id);

  // シティリーグ CSP内訳（対象年度のシーズンごと）
  const cityCspBySeason = seasons.map(season => {
    const entry = cityEntries.find(e => Number(e.season_id) === Number(season.id)) || null;
    return {
      season_id:   season.id,
      season_name: season.name,
      csp_earned:  entry ? Number(entry.csp_earned || 0) : 0,
      entry,
    };
  });

  const totalCityCsp    = cityCspBySeason.reduce((sum, s) => sum + s.csp_earned, 0);
  const totalTrainerCsp = trainerEntries.reduce((sum, e) => sum + Number(e.csp_earned || 0), 0);
  const totalCsp        = totalCityCsp + totalTrainerCsp;

  return {
    member,
    league_year:            targetYear,
    total_csp:              totalCsp,
    city_csp_total:         totalCityCsp,
    trainer_csp_total:      totalTrainerCsp,
    city_csp_by_season:     cityCspBySeason,
    trainer_entries:        trainerEntries,
    cl_entries:             clEntries,
    // 賞品ライン達成フラグ
    prize_line_30:          totalCsp >= PRIZE_LINE_30,
    prize_line_80:          totalCsp >= PRIZE_LINE_80,
    // 各賞品ラインまでの残りpt（達成済みは0）
    remaining_to_prize_30:  Math.max(0, PRIZE_LINE_30 - totalCsp),
    remaining_to_prize_80:  Math.max(0, PRIZE_LINE_80 - totalCsp),
  };
}
