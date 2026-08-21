# gas/ — Google Apps Script バックエンド

本番稼働しているバックエンドのソース。リポジトリ直下の `*.html`（GitHub Pages）はここに
デプロイされた Web App を [`js/api.js`](../js/api.js) 経由で呼んでいる。

| 項目 | 値 |
|------|-----|
| プロジェクト名 | PK-Manager |
| Script ID | `1_9_X-cJSO4Ub7zNvt4d6amXHPuYXyDO_SJVjfDZ6jmPj0mO3amCO2CyZ` |
| 本番デプロイ | `AKfycbxE-FjJ_Xw-...` （@10） |
| Web App 公開設定 | 実行者=デプロイしたユーザー / アクセス=全員（匿名可） |

## 前提

`clasp`（v3 系）がインストール済みで、`aki.pharam@gmail.com` でログイン済みであること。

```bash
clasp show-authorized-user
```

## 取得（リモート → ローカル）

必ず `gas/` ディレクトリの中で実行する。

```bash
clasp pull
```

## 反映（ローカル → リモート）

`push` は Apps Script エディタ上の内容を上書きする。実行前に `clasp pull` で差分が無いことを
確認すること（エディタで直接編集されている場合があるため）。

```bash
clasp push
```

`push` しただけでは本番には反映されない。本番デプロイはバージョン `@10` に固定されているため、
新しいバージョンを作って既存デプロイを更新する必要がある。

```bash
clasp redeploy AKfycbxE-FjJ_Xw-LzWfNlHuZcv_4_wdifVK5QUo0FZhV0Z9e8M6xe7DVZLfxdpswFY_Hu0R -d "説明"
```

## 保守用スクリプト（Maintenance.gs）

Webアプリからは呼ばれない。Apps Scriptエディタで関数を選んで手動実行する。

| 関数 | 内容 |
|------|------|
| `previewPurgeLastSeason()` | 昨シーズンのエントリー削除対象を数えるだけ（データは変更しない） |
| `runPurgeLastSeason()` | 実際に削除する。`members` / `seasons` には触れない |

対象の決め方は `Maintenance.gs` 冒頭の定数を参照。必ず preview で件数を確認してから実行する。

## 注意

- **親フォルダ `大会管理システム/` にも同じ scriptId の `.clasp.json` がある。**
  そちらには `相棒ポケモン杯.gs` など無関係な .gs ファイルが同居しており、`.claspignore` でも
  除外されていない。親フォルダで `clasp push` すると PK-Manager に無関係なコードが流し込まれる。
  push は必ずこの `gas/` の中から行うこと。
- 親フォルダの `.gs` は 2026年3月時点のコピーで、リモートとは既に差分がある（`Members.gs` の
  `updateMemberMarks` の権限チェック）。こちらの `gas/` を正とする。
