# Dropbox 移行・アプリ登録の手順

方式: **新しい Vault「Diary」を作り、Dropbox 同期を設定してからデータを移す**（2026-11-26 決定、decisions #12）。旧 Vault は一切変更せずバックアップとして残す。

## 場所

| 用途 | パス | 扱い |
|---|---|---|
| 新 Vault（PC） | `C:\Users\User3\Documents\Obsidian\Diary` | これから使う |
| 新 Vault（Dropbox） | `/Apps/remotely-save/Diary`（Remotely Save の設定画面の表示で確認済み [確証]） | Web アプリの書き込み先 |
| 旧 Vault（OneDrive） | `C:\Users\User3\OneDrive\アプリ\remotely-save\Main` | バックアップ。コピー元（2026-11-26 時点で最新） |
| 旧 Vault（PC） | `C:\Users\User3\Documents\ObsidianBackUp\Main` | バックアップ。10/21 頃で止まっている |
| 旧 Vault（iPhone） | Obsidian アプリ内 `Main` | バックアップ。2026-11-26 に OneDrive と同期済み |

## 手順

| # | 作業 | 担当 | 状態 |
|---|---|---|---|
| 1 | iPhone の旧 Vault を OneDrive と同期 | ユーザー | 完了（2026-11-26） |
| 2 | OneDrive から新 Vault へコピーし、掃除する（下記） | Claude | 完了（2026-11-26、`vault-migration-log.md`） |
| 3 | PC の Obsidian で新 Vault を開き、Remotely Save を Dropbox に接続して同期する。**暗号化パスワードは設定しない** | Claude（desktop-control）＋ユーザー（Dropbox ログイン） | 完了（2026-11-26） |
| 4 | Dropbox に `/Apps/remotely-save/Diary/` ができていることを確認 | Claude | 完了。2回目の同期計画が「equal 489件 / folder_existed_both 37件」で全件アップロード済み |
| 5 | iPhone の Obsidian で空の Vault「Diary」を作り、コミュニティプラグインを有効化 → Remotely Save を入れて Dropbox に接続 → 同期 | ユーザー | — |
| 6 | iPhone でプラグインと設定が反映されているか確認。`.obsidian` が同期されない場合は入れ直す [推測] | ユーザー | — |

### 手順2の掃除内容

- `.obsidian/` の同期競合による複製を除外: `app(1).json`、`appearance(1).json`、`appearance 2～6.json`、`community-plugins(1).json`、`community-plugins 2.json`、`community-plugins 3.json`、`community-plugins.json 2.json`、`core-plugins(1).json`
- `.obsidian/plugins/remotely-save/data.json` を除外（OneDrive の認証情報を含む。新 Vault では Dropbox で設定し直す）
- PC の旧 Vault にしかない買い物テストノート（`2026-10-21_おためし`／`ためし`／`せぶん`／`ラーメン大戦争_0954`）は**コピーしない**（コピー元の OneDrive 側には存在しない）

## Dropbox 開発者アプリの登録（Web アプリ用）

**2026-11-26 Claude が desktop-control で代行して登録済み**

| 項目 | 値 |
|---|---|
| App 名 | `Dairys-diary` |
| App key | `h4hrp6tm6h78tf6`（公開してよい値。`src/config.ts` に設定済み。App secret は使わない） |
| 権限タイプ | Scoped access / Full Dropbox |
| Permissions | `files.metadata.read`（必須・既定）、`files.content.read`、`files.content.write` |
| Redirect URIs | `https://publisher-web.github.io/Dairys/`、`http://localhost:5173/Dairys/` |
| 公開クライアント（PKCE）を許可 | ON（既定で ON だった） |
| ステータス | 開発（作成したアカウントのみ利用可。追加ユーザー不要） |
| 管理画面 | https://www.dropbox.com/developers/apps （Dropbox API 利用規約に同意済み） |

### 登録手順（参考）

1. https://www.dropbox.com/developers/apps を開き「Create app」
   - Choose an API: **Scoped access**
   - Choose the type of access: **Full Dropbox**（`Apps/remotely-save` に書き込むため）
   - Name: 例 `Dairys-diary`（全世界で一意の名前が必要）
2. 「Settings」タブ
   - **OAuth 2 → Redirect URIs** に追加: `https://publisher-web.github.io/Dairys/` と `http://localhost:5173/Dairys/`
   - **Allow public clients (Implicit Grant & PKCE)**: Allow
   - **App key** を Claude に伝える（公開されても問題ない値。App secret は不要）
3. 「Permissions」タブで `files.metadata.read`、`files.content.read`、`files.content.write` にチェックして「Submit」

## 新 Vault の Remotely Save 設定（PC, 2026-11-26）

| 項目 | 値 | 理由・注意 |
|---|---|---|
| Remote Service | Dropbox | 同期先は `/Apps/remotely-save/Diary`（画面表示で確認） |
| Encryption Password | 空 | Web アプリから平文で読み書きするため |
| Sync Config Dir | **Enable** | 旧 OneDrive 側に `.obsidian` があった＝以前も有効だった。iPhone にプラグイン・設定を配るため |
| Sync _ Files Or Folders | Disable（既定） | **`_` で始まるファイル・フォルダは同期されない**。Web アプリが作るファイル名は `_` で始めないこと |
| その他 | 既定 | 自動同期は未設定（手動）。削除・変更が 50% を超える同期は中止される保護あり |

### ハマりどころ

- 初回確認画面（"HUGE updates on the sync algorithm"）で2つのチェック＋Agree が必要
- 初回は「Failed to sync」が2回出たが、3回目で完了した。原因のエラーメッセージは取得できていない [不明]。再発したら同期をやり直す
- `Remotely Save: export sync plans (latest 1)` で同期計画を `_debug_remotely_save/` に書き出せる（`_` 始まりなので同期されない）
