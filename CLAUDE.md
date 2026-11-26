# Dairys — Claude Code 向けプロジェクト指示

毎日の日記を無理なく続けるための入力 Web アプリ。入力した内容を Dropbox 上の Obsidian Vault に Markdown として書き込み、Remotely Save で各端末の Obsidian に同期する。

## セッション開始時に読むもの

1. `docs/plan.md` — 作業計画・現在地・次の一手・未決事項
2. `docs/decisions.md` — 決定事項のログ（覆す前に必ず確認）
3. 実装中は `docs/requirements.md`（確定した要件）、`docs/mvp-plan.md`（マイルストーン）、**`docs/design.md`（デザインの決まり。UI に絵文字禁止・自作 SVG アイコン・配色）**
4. 必要に応じて `docs/spike-result.md`（技術検証の結果と注意点）、`docs/setup-dropbox.md`（同期設定・Dropbox アプリ）、`docs/vault-migration-log.md`（Vault 移行の記録）、`docs/analysis-current-state.md`（旧運用の分析）、`docs/tech-research.md`（技術調査）、`docs/handoff-2026-11-26.md`（claude.ai からの引き継ぎ原文）

## メモの運用（重要）

- ユーザーに頼まれなくても、セッションをまたいで役立つ情報は**自発的に** `docs/` に書き残す
  - 決定事項 → `docs/decisions.md` に追記（日付・理由つき）
  - 進捗・次の一手・未決事項 → `docs/plan.md` を更新
  - Web で裏取りした技術情報 → `docs/tech-research.md`（出典 URL つき）
  - ハマりどころ・検証結果 → `docs/` に適宜ファイルを追加し、この一覧に追記
- 作業の区切りごとに `docs/plan.md` の「現在地」を更新する
- **このリポジトリは Public**。実在の人物名、日記本文、住所、トークン、Client Secret などは書かない。必要なら `private/`（.gitignore 済み）に置く

## ユーザーの作業ルール

- 日本語。挨拶・前置き・締めは不要。結論を先に書き、箇条書きや表で整理する
- **Git 操作は Dairys リポジトリ内に限りすべて許可**（commit / push / branch / PR、Settings 変更含む）。区切りの良いところで自発的に commit・push してよい
- **Dairys 以外のリポジトリの操作は一切禁止**（Ktaniguchi1207/Dairys も含む）
- 複雑なタスクは計画を提示し、承認を得てから1ステップずつ進める
- 不明点は勝手に補完せず質問する。問題点は根拠つきで遠慮なく指摘する
- 重要な事実主張には [確証] / [一般知識] / [推測] / [不明] を付ける。技術仕様は Web で裏取りする
- 波ダッシュは「～」（U+FF5E）を使う
- コード内にコメントを書かない（説明はチャットで行う）

## 環境

| 項目 | 値 |
|---|---|
| リポジトリ | https://github.com/publisher-web/Dairys （Public） |
| ローカル | `C:\Users\User3\Dairys` |
| GitHub アカウント | `publisher-web` を使う。gh の既定（active）アカウントは `Ktaniguchi1207` のままなので、gh を使うときは `GH_TOKEN=$(gh auth token --user publisher-web)` を付ける。remote URL は `https://publisher-web@github.com/...` に設定済み |
| 旧リポジトリ | https://github.com/Ktaniguchi1207/Dairys （README のみ。使わない） |
| Obsidian Vault（Dropbox） | `/アプリ/remotely-save/Diary`。Apps フォルダ名はアカウントの言語でローカライズされる（Remotely Save の画面表示は `/Apps/...` だが実体は `/アプリ/...`）。Web アプリは `src/dropbox/vault.ts` で動的に探す |
| Obsidian Vault（PC ローカル） | `C:\Users\User3\Documents\Obsidian\Diary`（Remotely Save で Dropbox と同期。`_` 始まりのファイルは同期されない） |
| 旧 Vault（バックアップ・触らない） | OneDrive `C:\Users\User3\OneDrive\アプリ\remotely-save\Main`、PC `C:\Users\User3\Documents\ObsidianBackUp\Main`、iPhone の `Main` |
| Dropbox 開発者アプリ | `Dairys-diary`、App key `h4hrp6tm6h78tf6`（`src/config.ts`）。管理画面 https://www.dropbox.com/developers/apps |
| デスクトップ操作 | `desktop-control` スキル（`dsk`）の使用許可あり。パスワード入力・ログインはユーザー本人が行う |
| 技術スタック | Vite＋React＋TypeScript、oxlint。`npm run build` / `npm run lint` |
| Git 作成者 | リポジトリのローカル設定で `publisher-web <359089006+publisher-web@users.noreply.github.com>`（グローバルの Gmail アドレスを公開しないため） |
| push | publisher-web のトークンに `workflow` スコープ追加済み（2026-11-26）。push は `git -c credential.helper= -c credential.helper='!f() { echo username=publisher-web; echo password=$GH_TOKEN; }; f' push` に `GH_TOKEN=$(gh auth token --user publisher-web)` を付けて実行 |
| 注意 | OneDrive が停止しているとオンライン専用ファイルが読めない（`The cloud file provider is not running`） |
