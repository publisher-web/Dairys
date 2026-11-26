# 作業計画と現在地

## 現在地（2026-11-26 更新）

- 旧運用の分析が完了（`analysis-current-state.md`）
- 構成方針が決定（`decisions.md` #1～#7）
- リポジトリを作成・clone 済み。メモ類を整備した
- **次の一手**: 下の「未回答の質問」に回答をもらい、承認後に Step 1（技術検証）に着手する

## 構成案

```
iPhone Safari（Webアプリ / ホーム画面に追加）
   │  Microsoft アカウントでログイン（MSAL.js, Auth Code + PKCE）
   ▼
Microsoft Graph API
   │  PUT /me/drive/root:/Apps/remotely-save/Main/40_Diary/YYYY-MM-DD.md:/content
   ▼
OneDrive（Apps/remotely-save/Main）
   │  Remotely Save の次回同期で取り込み
   ▼
Obsidian（iPhone / Windows）で閲覧・振り返り
```

## ステップ

| Step | 内容 | 成果物 | 状態 |
|---|---|---|---|
| 1 | 技術検証：Entra アプリ登録 → MSAL ログイン → `40_Diary` にテストファイル書き込み → Obsidian に同期されるか確認 | 最小の検証ページ、`docs/spike-graph-write.md` | 未着手（承認待ち） |
| 2 | 要件定義：日記フォーマット、入力項目（必須／自動取得／任意）、画面フロー | `docs/requirements.md` | 未着手 |
| 3 | MVP 実装：今日の日記に出来事を追記（時刻・天気は自動、ムード1タップ、人物・場所は候補選択、写真） | Web アプリ | 未着手 |
| 4 | 公開・1～2週間試用 → 改善点洗い出し | 試用メモ | 未着手 |

Step 1 を先にする理由: リスク #1（アプリ登録可否）・#3（同期競合）が NG だと構成自体が成り立たない。

## リスク

| # | リスク | 対策案 |
|---|---|---|
| 1 | 個人 Microsoft アカウントで Entra アプリ登録ができない可能性 [不明] | Step 1 の最初に検証。NG なら構成を見直す |
| 2 | `Files.ReadWrite`（OneDrive 全体）権限が必要 | 書き込み先を `40_Diary` と `attachments` にコードで限定 |
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
