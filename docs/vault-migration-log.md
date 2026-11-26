# 新 Vault「Diary」への移行ログ

## 2026-11-26 手順2: コピーと掃除（Claude 実施）

### コピー

- コピー元: `C:\Users\User3\OneDrive\アプリ\remotely-save\Main`（iPhone から同期済みで最新）
- コピー先: `C:\Users\User3\Documents\Obsidian\Diary`
- robocopy `/E /COPY:DAT /DCOPY:T`: 508ファイル / 39フォルダ / 14.3MB、失敗0件。OneDrive のオンライン専用ファイルをダウンロードしながらだったため約27分かかった
- 掃除後: 488ファイル / 16MB

### 旧 Vault との差分確認（ハッシュ比較）

| 区分 | 内容 | 扱い |
|---|---|---|
| PC 旧 Vault にしかない | `Shopping/2026-10-21_おためし_1642.md`、`_せぶん_1822`、`_ためし_1519`、`_ラーメン大戦争_0954` | プラグイン開発時のテストと判断してコピーしない（`ラーメン大戦争_0954` は 10/20 のイベントと同じ -990円で、日付と時刻が合わない） |
| PC 旧 Vault にしかない | `.obsidian/workspace.json`（PC の画面レイアウト） | コピーしない（Obsidian が再生成する） |
| 内容が違う | 5ファイル | すべて新 Vault（OneDrive 由来）のほうが新しい。PC 側が新しいものはなし |

### 掃除内容

| # | 内容 | 件数 |
|---|---|---|
| 1 | `.obsidian/` の同期競合による複製を削除（`app(1).json`、`appearance(1).json`、`appearance 2～6.json`、`community-plugins(1)/2/3.json`、`community-plugins.json 2.json`、`core-plugins(1).json`）。本体のほうが新しい内容であることを確認済み | 12 |
| 2 | `.obsidian/plugins/remotely-save/data.json` を削除（OneDrive の認証情報を含む。プラグイン本体は残した） | 1 |
| 3 | Vault 内の `.claude/`（過去の Claude Code セッションのローカル設定）を削除 | 1 |
| 4 | `Daily/` のテンプレートのまま未記入のノートを削除 | 6 |
| 5 | Vault 直下の場所ノート `ラーメン大戦争.md` と、`00_Inbox/G5.md`（場所ノート）を `30_HumanNetwork/40_Places/` に移動。リンクはファイル名で解決されるため影響なし | 2 |
| 6 | 場所・学校ノートと Place／Company テンプレートの**テンプレートのダミー値**（`住所: 東京都中央区銀座〇〇`、`郵便番号: 000-0000`、`電話番号: 03-0000-0000`、`URL: https://example.com`）を空欄にした。実在の値は変更していない | 約20ファイル |
| 7 | Dataview の旧プロパティ名を新しい名前に置換（`contains(場所,` → `contains(place,`、`参加者, カテゴリ` → `human, category`、`開始, 終了, 参加者, 場所` → `start, end, human, place`、`SORT 開始` → `SORT start`）。イベントノートは全件新しい名前なので、これで訪問履歴の表が表示されるようになる | 13 |

### 未実施（ユーザー判断待ち）

- `.obsidian/app.json` の設定の復元。6月時点の `app(1).json` にあった `newFileFolderPath: 00_Inbox`、`attachmentFolderPath: ./attachments`、`alwaysUpdateLinks: true`、`defaultViewMode: preview` が、現在の `app.json` から消えている。未作成リンクから作ったノートが Vault 直下にできたのはこれが原因 [推測]
- `20_Knowledge/無題のファイル.md` は中身のある技術メモ（Cloudflare 入門）なので、名前の変更を提案するにとどめた
