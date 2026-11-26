# 技術調査メモ

## OneDrive / Microsoft Graph

| 項目 | 内容 | ラベル | 出典 |
|---|---|---|---|
| Remotely Save 無料版の保存先 | OneDrive の App Folder（`Apps/remotely-save`）のみ。PRO 版はルートにも接続可 | [確証] | [Remotely Save docs](https://gitea.astro-vps.duckdns.org/bruno/remotely-save/raw/branch/master/docs/remote_services/onedrive/README.md) |
| App Folder 権限の範囲 | `Files.ReadWrite.AppFolder` は自アプリのフォルダ（`Apps/{アプリ名}`）のみ。他アプリ（Remotely Save）のフォルダには届かない | [確証] | [What is an App Folder](https://learn.microsoft.com/en-us/onedrive/developer/rest-api/concepts/special-folders-appfolder) |
| 必要な権限 | `Files.ReadWrite`（委任、個人アカウント可） | [確証] | [Upload small files](https://learn.microsoft.com/en-us/graph/api/driveitem-put-content) |
| ファイル作成・上書き | `PUT /me/drive/root:/{path}:/content`、250MB まで | [確証] | 同上 |
| SPA の認証 | MSAL.js で Auth Code + PKCE フロー | [確証] | [SPA quickstart](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-v2-javascript-auth-code) |
| Graph 上のパス | ローカル表示は「アプリ」だが Graph では `/Apps/remotely-save` の見込み | [推測] | Step 1 で検証する |
| 個人アカウントでのアプリ登録可否 | 制限が入ったという話がある | [不明] | Step 1 で検証する |
| 楽観ロック（If-Match / eTag） | PUT content のドキュメントには記載なし | [不明] | Step 1 で検証する |

## 天気

| 項目 | 内容 | ラベル | 出典 |
|---|---|---|---|
| Open-Meteo | API キー不要。非商用は 10,000回/日・5,000回/時・600回/分まで無料。CC-BY 4.0 の表記が必要 | [確証] | [Open-Meteo Terms](https://open-meteo.com/en/terms) |

## ホスティング

| 項目 | 内容 | ラベル |
|---|---|---|
| GitHub Pages | 無料プランでは Public リポジトリが必要 | [推測]（要裏取り） |
