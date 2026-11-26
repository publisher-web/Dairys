# 決定事項ログ

新しい決定は末尾に追記する。覆す場合は元の項目を消さず、新しい項目で「#n を変更」と書く。

| # | 日付 | 決定 | 理由 |
|---|---|---|---|
| 1 | 2026-11-26 | 保存先は Obsidian（Markdown）を継続する | 検索・振り返りに向く。既存の人物・場所マスタを活かせる |
| 2 | 2026-11-26 | 記録単位を「1日1ファイル（`40_Diary/YYYY-MM-DD.md`）＋その日の出来事を追記」に変更する | 旧運用ではイベント1件1ファイル＋YAML 手入力が重く途絶えた。価値ある記録は日記の自由記述側に残っていた（`analysis-current-state.md` 参照） |
| 3 | 2026-11-26 | 既存のイベント（`30_HumanNetwork/30_Events`）・買い物（`Shopping`）ノートは移行せず残す。人物（`10_People`）・場所（`40_Places`）ノートは読み取り専用のマスタとして候補表示に使う | 移行コストを払う価値が低い。マスタは資産 |
| 4 | 2026-11-26 | 同期は OneDrive＋Remotely Save（無料版）を継続する | ユーザー判断 |
| 5 | 2026-11-26 | iOS ショートカットによる入力は採用しない | ユーザー判断 |
| 6 | 2026-11-26 | 入力は自作 Web アプリで行い、Microsoft Graph API で OneDrive 上の Vault に直接書き込む | ユーザー判断。サーバー不要の静的サイトで実現できる見込み |
| 7 | 2026-11-26 | リポジトリは `publisher-web/Dairys`（Public）を使う。`Ktaniguchi1207/Dairys` は使わない | GitHub Pages 公開のため Public が必要な可能性があり、メインアカウントでは公開したくない（ユーザー判断） |
| 8 | 2026-11-26 | Dairys リポジトリ内の Git 操作（commit / push / branch / PR 等）はすべて許可。**それ以外のリポジトリの操作は一切禁止** | ユーザー指示 |
| 9 | 2026-11-26 | 技術スタックの選定は Claude に一任 → Vite＋React＋TypeScript を採用 | ユーザーは Web 技術に詳しくないため一任。React は情報量が最も多く、MSAL 等の公式サンプルも React 向けが充実 [一般知識] |
| 10 | 2026-11-26 | 公開先は GitHub Pages（`https://publisher-web.github.io/Dairys/`）。GitHub Actions でデプロイ | ユーザー判断 |
| 11 | 2026-11-26 | **#4・#6 を変更**: Remotely Save の同期先を OneDrive から **Dropbox** に移す。Web アプリは Dropbox API（PKCE、Full Dropbox 権限）で `/Apps/remotely-save/Main` に直接書き込む。OneDrive 側のデータはバックアップとして残す | 2024年6月以降、個人 MS アカウントだけでは Entra アプリを登録できず、テナント作成にはカードが必要。Dropbox は開発者登録が無料でカード不要、Remotely Save 無料版も対応（`tech-research.md`） |
| 12 | 2026-11-26 | Dropbox 移行は「既存 Vault の同期先を切り替える」のではなく、**新しい Vault「Diary」（PC: `C:\Users\User3\Documents\Obsidian\Diary`）を作り、最新の OneDrive 側からコピーして掃除した上で Dropbox 同期する**。旧 Vault（PC・iPhone・OneDrive）は変更せずバックアップとして残す | 同期先を切り替えると、Remotely Save の前回同期の記録と食い違い、ファイルが削除扱いになるリスクがある [推測]。新 Vault なら旧データに手を触れずに済み、重複ファイルの掃除もできる |
| 13 | 2026-11-26 | Web アプリの書き込み先は `/Apps/remotely-save/Diary` | decisions #12 の Vault 名に合わせる（実際のパスは手順4で確認） |
| 14 | 2026-11-26 | **#13 を変更**: Vault のパスは固定せず、Dropbox 直下から `*/remotely-save/Diary` を探して決める（このアカウントでは `/アプリ/remotely-save/Diary`） | Dropbox の Apps フォルダ名がアカウントの言語でローカライズされるため（`spike-result.md`） |
| 15 | 2026-11-26 | Dropbox 開発者アプリ `Dairys-diary`（App key `h4hrp6tm6h78tf6`、Full Dropbox、files.content.read/write）を Claude が代行して登録 | ユーザー依頼 |
| 16 | 2026-11-26 | 出来事の書き方は**案A（絵文字＋リンクの箇条書き）**。frontmatter は `type`/`date`/`mood`/`weather`/`transaction` | ユーザー選択（R1）。読みやすく、人物・場所ノートのバックリンクに自動で出る |
| 17 | 2026-11-26 | メイン画面は**夜のふりかえり型（ウィザード）** | ユーザー選択（R2）。推奨はチャット型だったが、実データでも濃い日記は夜にまとめて書かれていた。弱点（開かない日は0件）は「昨日分も書ける」「毎晩のリマインド」で補う |
| 18 | 2026-11-26 | MVP に人物・場所の候補選択、写真、金額（支出・収入）、天気の自動入力を入れる | ユーザー選択（R3） |
| 19 | 2026-11-26 | 新しい人・場所は**名前だけで保存**（未作成リンク）。アプリに未登録の名前の一覧を出す | ユーザー選択（R4） |
