# 作業計画と現在地

## 現在地（2026-11-26 更新）

- 旧運用の分析が完了（`analysis-current-state.md`）
- 構成方針が決定（`decisions.md` #1～#10）。技術スタックは Vite＋React＋TypeScript、公開先は GitHub Pages
- 雛形を作成し commit 済み（`80b4502`）。Pages は Actions ビルドで有効化済み
- **ブロッカー1**: push が拒否された。publisher-web の gh トークンに `workflow` スコープがない。ユーザーが `gh auth switch -u publisher-web` → `gh auth refresh -h github.com -s workflow` → `gh auth switch -u Ktaniguchi1207` を実行する必要がある
- ~~ブロッカー2~~: 個人 MS アカウントではアプリ登録ができない → **Dropbox に変更すると決定**（decisions #11）
- Step 1 の検証ページを実装済み（`src/Spike.tsx`、`src/dropbox/`）。App key が空のため未実行
- **ユーザー作業待ち**: `docs/setup-dropbox.md` の A（Dropbox アプリ登録 → App key を Claude に伝える）、B（Remotely Save を Dropbox に移行）
- **次の一手**: App key を `src/config.ts` に設定 → push → iPhone で検証ページの 1～3 を実行 → Obsidian に同期されるか確認 → 結果を `docs/spike-result.md` に記録

## 構成案

```
iPhone Safari（Webアプリ / ホーム画面に追加）
   │  Dropbox でログイン（OAuth2 Auth Code + PKCE, token_access_type=offline）
   ▼
Dropbox API（files/upload, mode=update+rev で楽観ロック）
   │  /Apps/remotely-save/Main/40_Diary/YYYY-MM-DD.md
   ▼
Dropbox（Apps/remotely-save/Main）
   │  Remotely Save の次回同期で取り込み
   ▼
Obsidian（iPhone / Windows）で閲覧・振り返り
```

## ステップ

| Step | 内容 | 成果物 | 状態 |
|---|---|---|---|
| 1 | 技術検証：Dropbox アプリ登録 → PKCE ログイン → `40_Diary` にテストファイル書き込み（日本語パス・rev 競合検出も）→ Obsidian に同期されるか確認 | 検証ページ、`docs/spike-result.md` | 実装済み・ユーザー作業待ち |
| 2 | 要件定義：日記フォーマット、入力項目（必須／自動取得／任意）、画面フロー | `docs/requirements.md` | 未着手 |
| 3 | MVP 実装：今日の日記に出来事を追記（時刻・天気は自動、ムード1タップ、人物・場所は候補選択、写真） | Web アプリ | 未着手 |
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
