# Step 1 技術検証の結果（2026-11-26）

**結論: 構成（Web アプリ → Dropbox API → Remotely Save → Obsidian）は成立する。**

検証環境: PC の Edge から https://publisher-web.github.io/Dairys/（`src/Spike.tsx`）。iPhone Safari での確認は未実施。

| # | 検証項目 | 結果 |
|---|---|---|
| 1 | Dropbox OAuth（PKCE、`token_access_type=offline`）でログインし、トークンを取得 | ✅ |
| 2 | Vault の一覧取得・日記の読み取り（日本語フォルダ名を含むパス） | ✅ `40_Diary` 3件、`10_People` 52件、最新の日記を読めた |
| 3 | 書き込みと読み戻し（ASCII 名・日本語名のファイル） | ✅ 内容が一致 |
| 4 | 楽観ロック: `mode: update` + 最新の rev → 成功、古い rev → 409 conflict で拒否 | ✅ 同時編集の検出に使える |
| 5 | Web アプリで書いたファイルが Remotely Save で PC の Obsidian に同期される | ✅ 日本語の内容も文字化けなし |

## 判明したこと

| 事実 | ラベル | 対応 |
|---|---|---|
| Dropbox の Apps フォルダは**アカウントの言語でローカライズされる**。このアカウントでは `/アプリ/remotely-save/Diary` が実体だった。Remotely Save の設定画面は英語で `/Apps/remotely-save/Diary` と表示するので紛らわしい | [確証] | Vault のパスを固定せず、Dropbox 直下のフォルダから `*/remotely-save/Diary` を探して localStorage にキャッシュする（`src/dropbox/vault.ts`） |
| `files/upload` は存在しない親フォルダを自動で作る | [確証] | 最初の検証で `/Apps/remotely-save/Diary/40_Diary/` を誤って作ってしまった。中身がテストファイルだけであることを確認して `/Apps` ごと削除した（Dropbox の削除済みファイルから30日間は復元できる [一般知識]）。**本番の書き込みは、Vault の実在を確認してから行う** |
| Dropbox 開発ステータスのアプリは、認可時に「ユーザー数が少ないアプリ」という警告画面を挟む | [確証] | 「続行」で進める。害はない |
| Remotely Save は `_` で始まるファイルを同期しない（既定） | [確証] | Web アプリが作るファイル名は `_` で始めない |

## 残っているもの

- Vault の `40_Diary/dairys-test.md` と `40_Diary/dairys-テスト.md`（テストファイル）。iPhone で同期されたことを確認したら削除してよい
- iPhone Safari でのログインと書き込みの確認（ホーム画面に追加した場合の localStorage の持続性も含む）
