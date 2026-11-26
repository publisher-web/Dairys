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
| 個人アカウントでのアプリ登録可否 | **2024年6月以降、テナント（ディレクトリ）外でのアプリ登録は不可**。Azure 登録または M365 Developer Program でテナントを用意する必要がある。既存アプリは影響なし | [確証] | [Entra breaking changes](https://learn.microsoft.com/en-us/entra/identity-platform/reference-breaking-changes) |
| テナント作成の条件 | Azure 無料アカウントには電話番号＋クレジット／デビットカード（プリペイド不可）が必要。請求はされないが、約1ドルの与信確認がかかることがある。Entra ID Free 自体は無料だが、本人確認のためカードが必要 | [確証] | [Microsoft Entra ID Free](https://learn.microsoft.com/azure/cost-management-billing/manage/microsoft-entra-id-free) |
| Azure for Students | カード不要だが、18歳以上で2年制・4年制の学位授与機関の学生であることが条件 | [確証] | 同上の検索結果 |
| 無料試用の終了後 | サブスクリプションが期限切れになってもテナントは残る。ただし、アプリ登録の編集や個人アカウントへのトークン発行が続く保証は公式にはない | [確証] | [Microsoft Q&A](https://learn.microsoft.com/en-us/answers/questions/6037952/entra-id-free-after-azure-free-trial-expiry-person) |
| M365 Developer Program | 個人では sandbox の対象外になることが多い | [確証] | [Microsoft Q&A](https://learn.microsoft.com/en-us/answers/questions/6049566/how-can-i-register-a-microsoft-oauth-application-f) |
| 楽観ロック（If-Match / eTag） | PUT content のドキュメントには記載なし | [不明] | Step 1 で検証する |

## Dropbox（代替案の調査）

| 項目 | 内容 | ラベル | 出典 |
|---|---|---|---|
| Remotely Save 無料版 | Dropbox に対応。保存先は `/Apps/remotely-save` | [確証] | [Remotely Save README](https://cdn.jsdelivr.net/gh/remotely-save/remotely-save@master/README.md) |
| 開発者アプリの登録 | 無料。開発ステータスでも自分のアカウントで使える（最大500ユーザー）。「Full Dropbox」権限を選べば、他アプリのフォルダにも書き込める | [確証] | [DBX developer guide](https://www.dropbox.com/developers/reference/developer-guide) |
| 認証 | Auth Code + PKCE（SPA 向けとして推奨） | [確証] | 同上 |

## 天気

| 項目 | 内容 | ラベル | 出典 |
|---|---|---|---|
| Open-Meteo | API キー不要。非商用は 10,000回/日・5,000回/時・600回/分まで無料。CC-BY 4.0 の表記が必要 | [確証] | [Open-Meteo Terms](https://open-meteo.com/en/terms) |

## ホスティング

| 項目 | 内容 | ラベル |
|---|---|---|
| GitHub Pages | 無料プランでは Public リポジトリが必要 | [推測]（要裏取り） |
