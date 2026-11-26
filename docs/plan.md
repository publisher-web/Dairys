# 作業計画と現在地

## 現在地（2026-11-26 更新）

- 旧運用の分析が完了（`analysis-current-state.md`）。決定事項は `decisions.md` #1～#15
- 新 Vault「Diary」へ移行済み。PC・iPhone とも Dropbox（`/アプリ/remotely-save/Diary`）と同期できている（`setup-dropbox.md`、`vault-migration-log.md`）
- push 権限追加済み。GitHub Pages: https://publisher-web.github.io/Dairys/
- Dropbox 開発者アプリ登録済み。**Step 1（技術検証）完了・成立**（`spike-result.md`）
- **Step 2（要件定義）完了**: `docs/requirements.md` 確定（R1～R7、decisions #16～#22）
- Step 3 承認済み。**M1（基盤）完了**（`docs/mvp-plan.md` の進捗メモ）
- **M2 完了**、**デザイン全面刷新 完了**（`docs/design.md`、decisions #24）
- **M3（人物・場所の候補）完了**
- **次の一手**: M3 の報告 → ユーザー確認後に M4（写真）
- 残タスク（小）:
  - iPhone Safari で検証ページのログインと書き込みを確認（任意）
  - Vault のテストファイル `40_Diary/dairys-test.md`・`dairys-テスト.md`・`2001-01-01.md` を削除
  - `C:\Users\User3\Documents\Obsidian\Diary\_debug_remotely_save` を削除（ユーザー作業。同期対象外なので放置でも害はない）

## 構成案

```
iPhone Safari（Webアプリ / ホーム画面に追加）
   │  Dropbox でログイン（OAuth2 Auth Code + PKCE, token_access_type=offline）
   ▼
Dropbox API（files/upload, mode=update+rev で楽観ロック）
   │  /アプリ/remotely-save/Diary/40_Diary/YYYY-MM-DD.md（Apps フォルダ名はローカライズされる）
   ▼
Dropbox（/アプリ/remotely-save/Diary）
   │  Remotely Save の次回同期で取り込み
   ▼
Obsidian（iPhone / Windows）で閲覧・振り返り
```

## ステップ

| Step | 内容 | 成果物 | 状態 |
|---|---|---|---|
| 1 | 技術検証：Dropbox アプリ登録 → PKCE ログイン → `40_Diary` にテストファイル書き込み（日本語パス・rev 競合検出も）→ Obsidian に同期されるか確認 | 検証ページ、`docs/spike-result.md` | **完了（成立）** |
| 2 | 要件定義：日記フォーマット、入力項目（必須／自動取得／任意）、画面フロー | `docs/requirements.md` | **完了** |
| 3 | MVP 実装：夜のふりかえりウィザード（写真→できごと→気分→一言）。M1～M6 に分割 | Web アプリ、`docs/mvp-plan.md` | 進行中（M1～M3 完了、デザイン刷新済み） |
| 4 | 公開・1～2週間試用 → 改善点洗い出し | 試用メモ | 未着手 |

Step 1 を先にする理由: リスク #1（アプリ登録可否）・#3（同期競合）が NG だと構成自体が成り立たない。

## リスク

| # | リスク | 対策案 |
|---|---|---|
| 1 | ~~個人 MS アカウントで Entra アプリ登録ができない~~ → 確定したため Dropbox に変更 | 解消 |
| 2 | Full Dropbox 権限（Dropbox 全体）が必要 | 書き込み先を `40_Diary` と `attachments` にコードで限定 |
| 3 | Web アプリと Obsidian で同じ日のファイルを同時編集すると Remotely Save が競合・上書きする恐れ | 書き込み直前に最新を読み直して追記。当日分は原則 Web アプリから書く運用 |
| 4 | Remotely Save の同期まで Obsidian に反映されない | 仕様として受容 |

## 未回答の質問（2026-11-26 時点）

| # | 質問 | 推奨 |
|---|---|---|
| 1 | 技術スタック | Vite＋TypeScript＋React（MSAL 公式サンプルが多い）[一般知識] |
| 2 | 公開先 | GitHub Pages（publisher-web/Dairys から公開） |
| 3 | Step 1 のアプリ登録作業 | 手順は Claude が書き、Azure ポータルでの操作はユーザーが行う |
| 4 | この計画で Step 1 に進んでよいか | — |

## 将来検討（MVP 対象外）

- 既存カレンダープラグイン（obsidian-event-calendar）を新しい日記形式に対応させる（日記内の支出を集計するなど）
- 場所の候補を GPS から近い順に並べる（場所ノートには住所はあるが座標はない）
- 旧 Dataview クエリの旧キー（`参加者`／`場所`／`開始`／`カテゴリ`）の修正
