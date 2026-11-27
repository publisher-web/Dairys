# デザインガイド（2026-11-27 刷新）

ユーザーの要望: 参考画像（ゲーム内スマホ UI 風のクリーム画面、ミント×クリームイエローのピル型タグ、ティールのリボン帯）をベースに、「可愛くて安っぽくない」見た目。**特定ゲームの画面・アイコン・ロゴ・キャラクターは複製しない**（雰囲気と作りの要素だけを取り入れたオリジナル）。

## 守ること

| # | ルール |
|---|---|
| 1 | **UI にシステム絵文字を使わない**。アイコンは `src/ui/Icon.tsx` の自作 SVG を使う（日記ファイルのデータとしての絵文字は対象外。画面に出すときは SVG に置き換える: 気分 → `MoodIcon`、天気 → `WeatherIcon`） |
| 2 | 太い下影＋単純な角丸カードの「テンプレ感」を避ける。影はうすく（`--shadow-card`）、ボタンは内側の細い影だけ |
| 3 | 文言は自然な日本語。ひらがなの多用（「とどきます」「れんぞく」「ほぞん」など）をしない |
| 4 | 新しいアイコンを足したら `npm run dev` → `http://localhost:5173/Dairys/?gallery` で一覧表示し、拡大して崩れを確認する（開発時のみ有効） |
| 5 | 実装後は PC 幅とスマホ幅（390px）の両方でスクリーンショットを撮って確認する |
| 6 | ホームの「日記を書く」カードの位置は動かさない。お知らせ類はカードの下に出す（ユーザー指定） |

## 配色（`src/index.css` の `:root`）

| トークン | 値 | 用途 |
|---|---|---|
| `--page` | `#f2ead6` | PC で端末パネルの外側（点模様） |
| `--screen` | `#faf5e8` | 画面の地（クリーム） |
| `--card` | `#fffdf7` | カード |
| `--ink` / `--ink-soft` / `--ink-faint` | `#5b4636` / `#9a876e` / `#bcae94` | 文字（ブラウン系） |
| `--teal` | `#34a09c` | 主ボタン、リボン、ウィザードの帯 |
| `--mint` / `--mint-ink` | `#c6eedb` / `#2d6a54` | ラベル用ピル（「気分」「場所」など） |
| `--cream` / `--cream-ink` | `#fff0b0` / `#79591a` | 補助ピル（時刻・未記入・連続日数） |

ダークモードは廃止（クリーム画面に統一）。

## 部品

| 部品 | クラス・コンポーネント | 特徴 |
|---|---|---|
| 端末パネル | `.device` | 560px 以上では幅 430px・角丸 44px の端末風パネル。スマホでは全面 |
| ステータスバー | `StatusBar` | 日付・時刻・保管庫の接続（葉っぱ。接続中はティール） |
| タイトルバー | `.titlebar` | 中央に画面名、右に設定（歯車タイル）、左に戻る |
| リボン見出し | `.ribbon`（`.yellow`） | 両端に切れ込み、縫い目風の点線 |
| ウィザードの帯 | `.band` | ティールの帯、下端が波形（スカラップ）、進捗バー |
| ピル | `.tag.mint` / `.tag.cream` / `.tag.plain` | ラベルと値の行（`.summary-row`、`.list-row`） |
| ボタン | `.btn.primary` / `.secondary` / `.soft` / `.danger` | 高さ 52px のピル型 |
| 罫線ノート | `.field.lined` | 今日の一言の入力欄 |
| 下から出るシート | `.sheet`（`Picker`） | スマホでは下からスライド、PC では中央のモーダル。候補行 `.pick-row`、頭文字アバター `.avatar`（色は名前のハッシュ） |
| シート | `Sheet`（`src/ui/Sheet.tsx`） | Visual Viewport に合わせて配置し、iPhone のキーボードの上に出す。候補・金額・写真の表示で共通 |
| 外せるピル | `.tag.removable` | × ボタンつき。追加ボタンは点線の `.chip-add` |
| 写真の選択エリア | `.photo-drop` | ストライプ地＋点線枠、中央にカメラタイル |
| 金額シート | `.amount-sheet`・`.toggle`・`.amount-field` | 支出（クリーム）/ 収入（ミント）の切り替え、大きな数字入力 |
| スイッチ | `.switch`（`role="switch"`） | 設定のオン・オフ |
| フォーム | `FieldRow`／`TextField`／`ListField`／`Segments`／`FamilyField`（`src/ui/Fields.tsx`） | ラベル `.form-label`、補足 `.form-note`。選択肢は `.tag-button`（選択中ミント）。家族欄は「人物から選ぶ」「文字で追加」のチップ |
| 保存バー | `.save-bar` | 編集画面の下に貼り付く半透明の帯。未保存の変更があると表示 |
| 写真の一覧 | `.photo-grid` / `.photo-strip` / `.photo-cell` | 3列グリッド（写真ステップ）と横並び（カード・確認画面）。左下に時刻ピル、右上に × |
| カレンダー | `.cal-grid` / `.cal-day`（`.written` ティール淡色・`.today` ティール枠・`.future` 薄く）/ `.cal-photo` | 日曜はコーラル、土曜はティール。左右スワイプで月移動 |
| 日記パネル | `DayPanel`（`Sheet` を利用）/ `.day-body` / `.day-quote` / `.day-photos` | 本文は `.day-body` 内でスクロール。写真はタップで `PhotoViewer`（その写真から表示） |

## アイコン（`src/ui/Icon.tsx`）

- `TileIcon`: スクワークル（`SQUIRCLE` パス）のパステル土台＋フラット図形。calendar / quill / leaf / gear / flame / clock / bubble / smile / clipboard / stamp / cloud / moon / people / pin / camera / coin
- `MoodIcon`: 気分5段階（great / good / okay / meh / down）。対応は `src/diary/mood.ts`
- `Glyph`: 24px 線画（currentColor）。chevron（左右下）/ map / link / plus / trash / pin / people / yen / clock / check / logout / refresh / flask / photo / pencil / leaf / close / search / question
- `WeatherIcon`: 日記の天気絵文字 → SVG（対応表は `src/ui/weather.ts`）
- ファビコン: `public/favicon.svg`（ティールの土台＋羽根ペン）
- アプリアイコン: `public/icon.svg`（1024角・全面塗り。iOS が角を丸める）。変更したら `npm run icons` で PNG を作り直す
