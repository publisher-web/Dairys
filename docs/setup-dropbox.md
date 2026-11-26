# Dropbox 移行・アプリ登録の手順（ユーザー作業）

## 前提（2026-11-26 調査）

| 場所 | パス | 状態 |
|---|---|---|
| iPhone の Vault | Obsidian アプリ内 | 不明（最後に OneDrive と同期した時点以降の変更があるかもしれない） |
| OneDrive（リモート） | `OneDrive/アプリ/remotely-save/Main` | 10/22 の日記まであり、**最新と思われる** |
| PC の Vault | `C:\Users\User3\Documents\ObsidianBackUp\Main` | 10/21 頃で止まっている。OneDrive にない買い物テストファイル（`2026-10-21_おためし_1642.md` など）がある |

## A. Dropbox 開発者アプリの登録

1. Dropbox アカウントがなければ作る（無料の Basic プランでよい）
2. https://www.dropbox.com/developers/apps を開き「Create app」
   - Choose an API: **Scoped access**
   - Choose the type of access: **Full Dropbox**（`Apps/remotely-save` に書き込むために必要）
   - Name: 例 `Dairys-diary`（世界で一意の名前が必要。好きな名前でよい）
3. 作成したアプリの「Settings」タブ
   - **OAuth 2 → Redirect URIs** に次の2つを追加する
     - `https://publisher-web.github.io/Dairys/`
     - `http://localhost:5173/Dairys/`
   - **Allow public clients (Implicit Grant & PKCE)**: Allow
   - **App key** を控えて Claude に伝える（公開されても問題ない値。App secret は不要なので伝えなくてよい）
4. 「Permissions」タブで次にチェックを入れて「Submit」
   - `files.metadata.read`
   - `files.content.read`
   - `files.content.write`

## B. Remotely Save を OneDrive から Dropbox に移す

最新のデータを失わないよう、**順番を守る**こと。

1. **iPhone**: Obsidian を開き、Remotely Save で OneDrive と同期する（iPhone にしかない変更をアップロードするため）
2. **PC**: Obsidian（`ObsidianBackUp\Main`）を開き、Remotely Save で OneDrive と同期する。PC の Vault を最新にするため
   - 同期後、テスト用の買い物ノート（`おためし`／`ためし`／`せぶん`）が不要なら削除する
3. **PC**: Remotely Save の設定で、リモートサービスを **Dropbox** に変更して認証する
   - **暗号化パスワードは設定しない**（設定すると Web アプリから書き込めなくなる）
   - 同期を実行する → Dropbox に `/Apps/remotely-save/Main/` ができ、Vault がアップロードされる
4. Dropbox の Web 画面で `/Apps/remotely-save/Main/40_Diary/` に日記があることを確認する
5. **iPhone**: Remotely Save のリモートサービスを Dropbox に変更・認証し、同期する
6. OneDrive の `アプリ/remotely-save` は**削除せずバックアップとして残す**

## C. 完了したら Claude に伝えること

- App key
- Dropbox 上の Vault のフォルダ名（`/Apps/remotely-save/Main` 以外になった場合）
