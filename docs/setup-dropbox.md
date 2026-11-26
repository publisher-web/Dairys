# Dropbox 移行・アプリ登録の手順

方式: **新しい Vault「Diary」を作り、Dropbox 同期を設定してからデータを移す**（2026-11-26 決定、decisions #12）。旧 Vault は一切変更せずバックアップとして残す。

## 場所

| 用途 | パス | 扱い |
|---|---|---|
| 新 Vault（PC） | `C:\Users\User3\Documents\Obsidian\Diary` | これから使う |
| 新 Vault（Dropbox） | `/Apps/remotely-save/Diary`（Remotely Save が Vault 名で作る見込み [推測]） | Web アプリの書き込み先 |
| 旧 Vault（OneDrive） | `C:\Users\User3\OneDrive\アプリ\remotely-save\Main` | バックアップ。コピー元（2026-11-26 時点で最新） |
| 旧 Vault（PC） | `C:\Users\User3\Documents\ObsidianBackUp\Main` | バックアップ。10/21 頃で止まっている |
| 旧 Vault（iPhone） | Obsidian アプリ内 `Main` | バックアップ。2026-11-26 に OneDrive と同期済み |

## 手順

| # | 作業 | 担当 | 状態 |
|---|---|---|---|
| 1 | iPhone の旧 Vault を OneDrive と同期 | ユーザー | 完了（2026-11-26） |
| 2 | OneDrive から新 Vault へコピーし、掃除する（下記） | Claude | 完了（2026-11-26、`vault-migration-log.md`） |
| 3 | PC の Obsidian で新 Vault を開き、Remotely Save を Dropbox に接続して同期する。**暗号化パスワードは設定しない** | ユーザー（GUI 操作は Claude が補助） | — |
| 4 | Dropbox の Web 画面で `/Apps/remotely-save/Diary/` ができていることを確認 | ユーザー / Claude | — |
| 5 | iPhone の Obsidian で空の Vault「Diary」を作り、コミュニティプラグインを有効化 → Remotely Save を入れて Dropbox に接続 → 同期 | ユーザー | — |
| 6 | iPhone でプラグインと設定が反映されているか確認。`.obsidian` が同期されない場合は入れ直す [推測] | ユーザー | — |

### 手順2の掃除内容

- `.obsidian/` の同期競合による複製を除外: `app(1).json`、`appearance(1).json`、`appearance 2～6.json`、`community-plugins(1).json`、`community-plugins 2.json`、`community-plugins 3.json`、`community-plugins.json 2.json`、`core-plugins(1).json`
- `.obsidian/plugins/remotely-save/data.json` を除外（OneDrive の認証情報を含む。新 Vault では Dropbox で設定し直す）
- PC の旧 Vault にしかない買い物テストノート（`2026-10-21_おためし`／`ためし`／`せぶん`／`ラーメン大戦争_0954`）は**コピーしない**（コピー元の OneDrive 側には存在しない）

## Dropbox 開発者アプリの登録（Web アプリ用）

1. https://www.dropbox.com/developers/apps を開き「Create app」
   - Choose an API: **Scoped access**
   - Choose the type of access: **Full Dropbox**（`Apps/remotely-save` に書き込むため）
   - Name: 例 `Dairys-diary`（全世界で一意の名前が必要）
2. 「Settings」タブ
   - **OAuth 2 → Redirect URIs** に追加: `https://publisher-web.github.io/Dairys/` と `http://localhost:5173/Dairys/`
   - **Allow public clients (Implicit Grant & PKCE)**: Allow
   - **App key** を Claude に伝える（公開されても問題ない値。App secret は不要）
3. 「Permissions」タブで `files.metadata.read`、`files.content.read`、`files.content.write` にチェックして「Submit」
