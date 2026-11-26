# Dairys — Claude Code 向けプロジェクト指示

毎日の日記を無理なく続けるための入力 Web アプリ。入力した内容を OneDrive 上の Obsidian Vault に Markdown として書き込む。

## セッション開始時に読むもの

1. `docs/plan.md` — 作業計画・現在地・次の一手・未決事項
2. `docs/decisions.md` — 決定事項のログ（覆す前に必ず確認）
3. 必要に応じて `docs/analysis-current-state.md`（旧運用の分析）、`docs/tech-research.md`（技術調査）、`docs/handoff-2026-11-26.md`（claude.ai からの引き継ぎ原文）

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
| Obsidian Vault | `C:\Users\User3\OneDrive\アプリ\remotely-save\Main`（Remotely Save 無料版 → OneDrive App Folder） |
| 注意 | OneDrive が停止しているとオンライン専用ファイルが読めない（`The cloud file provider is not running`） |
