# 画面機能仕様書

このファイルは、Easy Job Hunting の画面単位の機能、画面から呼び出すAPI、Goバックエンドの処理、データベースとの接続関係を記録する。

## 共通仕様

### フロントエンド

- React + Vite 構成。画面ルーティングは `frontend/src/App.jsx` の `BrowserRouter` で管理する。
- ログイン後にURLの `uid` と `email` を `localStorage` に保存する。
	- `login_user_uid`
	- `login_user_email`
- 主要APIのベースURLは `http://localhost:8080`。
- ログイン済み画面の一部は `uid` をクエリパラメータとしてGo APIへ渡す。

### バックエンド

- エントリーポイントは `backend/main.go`。
- GinでHTTP APIを提供し、起動時に `config.InitDB()` を呼び出してMySQLへ接続する。
- DB接続先は現在 `root:root@tcp(127.0.0.1:3306)/easy_job_hunting?parseTime=true` に固定されている。
- `backend/config/database.go` の `ensureSchema()` が以下のテーブルを作成する。
	- `users`: Googleアカウント、OAuthアクセストークン、リフレッシュトークン
	- `profiles`: ユーザープロフィール
	- `mail_filter_entries`: メール送信元の包含・除外設定
	- `companies`: 登録企業と選考ステータス
	- `events`: カレンダー予定
	- `company_roadmap_steps`: 企業ごとの選考ロードマップステップ、現在地、次に行うべきこと（アクション）
- ユーザーを識別する外部キーは各テーブルの `user_id`。ユーザー削除時は関連プロフィール、フィルター、企業、予定も削除される。
- 現在はCookieやAuthorizationヘッダーによるセッション認証ではなく、フロントエンドから渡された `uid` または `email` を使ってユーザーを識別している。公開環境ではサーバー側セッションまたはJWT等への置き換えが必要。

## 画面一覧

### 1. ログイン画面

**ルート**: `/`

**実装**: `frontend/src/App.jsx` の `LoginScreen`

**機能**

- Easy Job Hunting の概要を表示する。
- 「Googleアカウントでログイン」ボタンからGoogle OAuth認証を開始する。
- ログイン成功後、バックエンドから返された `uid` と `email` を保存し、ダッシュボードへ遷移する。
- 未ログイン時に `/dashboard`、`/profile`、`/company-register` へアクセスした場合は `/` へリダイレクトする。

**API・処理経路**

1. `GET /login`
2. `backend/main.go` が `auth.GoogleOauthConfig.AuthCodeURL()` でGoogle認証URLを生成する。
3. Google認証後、`GET /auth/callback?code=...` が呼ばれる。
4. `auth.GoogleOauthConfig.Exchange()` で認証コードをトークンへ交換する。
5. Google UserInfo APIからメールアドレスを取得する。
6. `users` にメールアドレス、アクセストークン、リフレッシュトークン、有効期限をINSERTまたはUPDATEする。
7. `/` に `login=success&uid=<ユーザーID>&email=<メールアドレス>` を付けてリダイレクトする。

**DB**

- `users.email`: Googleアカウントのメールアドレス
- `users.access_token`: Gmail API呼び出し用アクセストークン
- `users.refresh_token`: OAuth更新用トークン
- `users.expiry`: トークン有効期限

### 2. メインダッシュボード

**ルート**: `/dashboard`

**実装**: `frontend/src/Dashboard.jsx`

**機能**

- 選考カレンダーを表示する。
- 最新の就活関連メールを最大5件表示する。
- 選考ロードマップ状況（登録企業の現在地、次に行うべきこと、進捗率）を表示し、ロードマップ画面へ移動できる。
- メール一覧、企業登録、企業一覧、メールフィルター、プロフィール、就活ロードマップへ移動する。
- カレンダー上で予定を新規登録、選択した予定を編集、削除する。

**API**

- `GET /api/roadmaps/summary?uid=<uid>` または `?email=<email>`
	- ハンドラ: `handlers.GetRoadmapSummaryHandler`
	- ユーザーが登録している全企業の選考ロードマップ要約（企業名、ステータス、現在地ステップ、次に行うべきこと、進捗率、ステップ数）を一括取得する。
- `GET /api/events?uid=<uid>` または `GET /api/events?email=<email>`
	- ハンドラ: `handlers.GetEventsHandler`
	- `events` から対象ユーザーの予定を日付・開始時刻順に取得する。
	- DBの `event_date`、`start_time`、`end_time` をフロント用の `date`、`time` に変換する。
- `POST /api/events?uid=<uid>`
	- ハンドラ: `handlers.CreateEventHandler`
	- 日付と時刻を検証して `events` にINSERTする。
- `PUT /api/events/:id?uid=<uid>`
	- ハンドラ: `handlers.UpdateEventHandler`
	- `events` の `company_name`、`event_title`、日時、説明を更新する。
- `DELETE /api/events/:id?uid=<uid>`
	- ハンドラ: `handlers.DeleteEventHandler`
	- `id` と `user_id` が一致する予定を削除する。
- `GET /api/fetch-mails?uid=<uid>` または `?email=<email>`
	- ハンドラ: `handlers.GetMailsHandler`
	- ダッシュボードでは返却されたメールの先頭5件を表示する。

**DB**

- `events.user_id` でユーザーの予定だけを取得する。
- 予定の作成元メールIDは `events.created_from_mail_id` に保存する。
- DB接続は `config.DB` を利用し、SQLの値はプレースホルダーで渡す。

### 3. メール一覧・本文画面

**ルート**: `/mails`

**実装**: `frontend/src/pages/MailList.jsx`

**機能**

- Gmailからメール一覧を取得する。
- 送信者、件名、日時、スニペットを表示する。
- メールを選択すると本文を取得して表示する。
- 「このメールからカレンダーに登録」でイベント抽出モーダルを開く。

**API・処理経路**

- `GET /api/fetch-mails?uid=<uid>` または `?email=<email>`
	- ハンドラ: `handlers.GetMailsHandler`
	- DBの `users` からGmailアクセストークンを取得する。
	- DBの `mail_filter_entries` から包含・除外メールアドレスを取得する。
	- `config.BuildGmailQuery()` で就活キーワード、包含送信元、除外キーワード、除外送信元をGmail検索クエリへ変換する。
	- Gmail API `Users.Messages.List` で最大10件を検索する。
	- 各メールのメタデータを `MailSummary` として返す。
- `GET /api/mails/:id?uid=<uid>` または `?email=<email>`
	- ハンドラ: `handlers.GetMailDetailHandler`
	- Gmail API `Users.Messages.Get(...).Format("full")` で本文を取得する。
	- Base64URLをデコードし、multipart内の `text/plain` または `text/html` を抽出する。
	- 本文を取得できない場合はGmailのスニペットを返す。

**外部サービス・DB**

- DB: `users.access_token` をOAuth2の静的トークンとしてGmail APIクライアントへ渡す。
- Gmail: メール本文はDBへ保存せず、画面表示時にGmailから取得する。
- 本文をAIへ渡す場合は、後述のイベント抽出APIでGo側のマスキングを必ず通す。

### 4. メールからカレンダー予定を抽出するモーダル

**表示元**: `/mails` のメール詳細画面

**実装**: `frontend/src/components/EventExtractModal.jsx`

**機能**

- 選択したメールの件名、送信者、本文を表示する。
- メールから面接、説明会、選考、締切等のイベントをAIで抽出する。
- 抽出結果の企業名、タイトル、日付、開始時刻、終了時刻、メモを編集する。
- 不要な抽出結果を削除し、複数の予定をまとめてカレンダーへ登録する。

**API・処理経路**

- `POST /api/extract-event`
	- ハンドラ: `handlers.ExtractEventFromMailHandler`
	- 入力: `mail_id`、`subject`、`body`、`from`
	- Go側でAI送信前処理を行う。
		- メールアドレス、電話番号、氏名・住所欄をマスキング
		- URLをホスト名だけ残して置換
		- HTML、引用返信、不要な空行を除去
		- 本文を最大12,000文字に制限
	- サニタイズ済みの件名、差出人、本文だけをGemini APIへ渡す。
	- GeminiのJSONレスポンスを `has_event` と `events` に変換して返す。
	- AIレスポンス本文はログやエラー応答へ出力しない。
- `POST /api/events?uid=<uid>`
	- モーダルで編集後、イベントごとに呼び出す。
	- `created_from_mail_id` に元メールIDを設定して `events` へ保存する。

**外部API・DB**

- 外部API: `GEMINI_API_KEY` と `GEMINI_MODEL` を使ってGemini `generateContent` APIを呼び出す。
- DB: AI抽出時は直接DBへ保存せず、ユーザーが確認・編集して保存した結果だけを `events` にINSERTする。

### 5. メールフィルター設定画面

**ルート**: `/mail-filters`

**実装**: `frontend/src/pages/MailFilterSettings.jsx`

**機能**

- 必ず含める送信元メールアドレスを追加、編集、削除する。
- 除外する送信元メールアドレスを追加、編集、削除する。
- メール一覧取得時に設定をGmail検索へ反映する。

**API・DB**

- `GET /api/mail-filters?uid=<uid>`
	- ハンドラ: `handlers.GetMailFilterHandler`
	- `mail_filter_entries` を `entry_type` ごとに取得する。
- `POST /api/mail-filters/items`
	- ハンドラ: `handlers.AddMailFilterEntryHandler`
	- `mail_filter_entries` へ `user_id`、`entry_type`、`email` をINSERTする。
- `PUT /api/mail-filters/items/:id`
	- ハンドラ: `handlers.UpdateMailFilterEntryHandler`
	- `id` と `user_id` が一致する設定を更新する。
- `DELETE /api/mail-filters/items/:id`
	- ハンドラ: `handlers.DeleteMailFilterEntryHandler`
	- `id` と `user_id` が一致する設定を削除する。
- `POST /api/mail-filters` または `PUT /api/mail-filters`
	- ハンドラ: `handlers.UpdateMailFilterHandler`
	- 既存設定を全削除して、包含・除外リストを再登録する一括更新API。

**フィルター適用順**

1. 就活キーワード: `面接`、`選考`、`インターン`、`説明会`、`書類選考`
2. `from:<含めるメールアドレス>`
3. 除外キーワード: `メルマガ`、`おすすめ情報`、`お知らせ`、`配信停止`
4. `-from:<除外メールアドレス>`

### 6. プロフィール設定画面

**ルート**: `/profile`

**実装**: `frontend/src/pages/Profile.jsx`

**機能**

- 氏名、大学名、学部・学科、志望業界、自己PRを入力する。
- 既存プロフィールを読み込んで編集する。
- 自己PRは企業研究・志望動機生成のAI入力に利用される。

**API・DB**

- `GET /api/profile?uid=<uid>`
	- ハンドラ: `handlers.GetProfileHandler`
	- `users` と `profiles` をLEFT JOINしてプロフィールを取得する。
- `POST /api/profile`
	- ハンドラ: `handlers.UpdateProfileHandler`
	- `profiles` にINSERTする。既存ユーザーの場合は `ON DUPLICATE KEY UPDATE` で更新する。
- 保存先は `profiles.user_id`、`name`、`university`、`faculty`、`target_industry`、`self_pr`。

### 7. 企業情報登録画面

**ルート**: `/company-register`

**実装**: `frontend/src/pages/CompanyRegister.jsx`

**機能**

- 企業名、業界、業種、企業ホームページURLを入力する。
- 企業名を必須として企業情報を登録する。
- 登録後、企業一覧へ移動できる。

**API・DB**

- `POST /api/companies`
	- ハンドラ: `handlers.RegisterCompanyHandler`
	- 入力の `uid` と企業名を検証する。
	- `companies` に企業情報をINSERTする。
	- 初期ステータスは `検討中`。
- 保存先は `companies.user_id`、`company_name`、`industry`、`business_type`、`homepage_url`、`status`。

### 8. 企業管理リスト画面

**ルート**: `/company-list`

**実装**: `frontend/src/pages/CompanyList.jsx`

**機能**

- 登録企業を一覧表示する。
- 企業ホームページを別タブで開く。
- 選考ステータスを変更する。
- 各企業の就活ロードマップ状況（現在地、次に行うべきこと、進捗率）を表示し、ワンクリックでロードマップ画面へ遷移する。
- 「企業研究」で企業の強みと面接予想質問をAI生成する。
- 「志望動機案」でプロフィールを踏まえた志望動機をAI生成する。

**API・DB**

- `GET /api/companies?uid=<uid>`
	- ハンドラ: `handlers.GetCompaniesHandler`
	- `companies` から `user_id` が一致する企業を取得する。
- `GET /api/roadmaps/summary?uid=<uid>`
	- ハンドラ: `handlers.GetRoadmapSummaryHandler`
	- 各企業のロードマップ現在地と次のアクション、進捗率を取得する。
- `PUT /api/companies/status`
	- ハンドラ: `handlers.UpdateCompanyStatusHandler`
	- `companies.status` を更新する。
- `POST /api/ai/analyze`
	- ハンドラ: `handlers.AnalyzeCompanyHandler`
	- `company_id` から `companies` の企業名、業界、業種を取得する。
	- `user_id` からユーザー情報を取得し、企業情報とプロフィールをGeminiへ渡す。
	- `prompt_type` が `research` の場合は企業研究、`motive` の場合は志望動機を生成する。
	- 結果はDBへ保存せず、画面のモーダルへ返す。

**実装上の注意**

- 現在の `AnalyzeCompanyHandler` は `users.skills` と `users.self_pr` を参照する実装になっているが、プロフィールの実データは `profiles` テーブルに保存される。企業AI機能を正しくプロフィール連携するには、`profiles` を参照する処理へ統一する必要がある。
- `UpdateCompanyStatusHandler` は現在、リクエストの企業IDだけでステータスを更新している。公開環境では必ずログインユーザーの `user_id` と組み合わせて更新対象を制限する。

### 9. 就活ロードマップ画面

**ルート**: `/roadmap`

**実装**: `frontend/src/pages/CompanyRoadmap.jsx`

**機能**

- 登録企業ごとに就活ロードマップを個別に管理・可視化する。
- 上部の企業選択セレクターで対象企業を切り替える（URLクエリ `?companyId=<id>` に連動）。
- **現在の状況（現在地と次に行うべきこと）のハイライト表示**:
	- 📍 現在地（進行中ステップ名）
	- ⚡ 次に行うべきこと（具体的なToDo・アクション）
	- 目標期日、メモ、進捗率（完了数/全ステップ数）
	- 「このステップを完了して次へ進む」ボタンでワンクリック進行
	- 「AI対策アドバイス」でGeminiによる現在地ステップの具体的な選考突破アドバイスをモーダル表示
- **就活タイムライン（可視化）**:
	- 各ステップを縦型タイムライン/フロー図で視覚化
	- 各ステップのステータス（完了 / 現在地 / 未着手）
	- 目標期日、次に行うべきToDo、メモを表示
	- 「ここを現在地にする」「完了にする」「未完了に戻す」「編集」「削除」の操作が可能
- **ロードマップ作成・自動生成**:
	- 未作成時は「標準テンプレートで作成（企業研究〜ES・面接〜内定）」または「AIで企業特化ロードマップ生成（業界やプロフィールに特化した選考フロー）」をワンクリックで実行
	- 自由なステップ追加・カスタマイズに対応

**API・DB**

- `GET /api/companies/:id/roadmap?uid=<uid>`
	- ハンドラ: `handlers.GetCompanyRoadmapHandler`
	- 対象企業のステップ一覧、現在地ステップ、次のアクション、進捗率を取得。
- `POST /api/companies/:id/roadmap/init?uid=<uid>`
	- ハンドラ: `handlers.InitCompanyRoadmapHandler`
	- テンプレートまたはGemini AIにより、対象企業の選考ロードマップステップを一括生成して `company_roadmap_steps` に保存。
- `POST /api/companies/:id/roadmap/steps?uid=<uid>`
	- ハンドラ: `handlers.AddRoadmapStepHandler`
	- 新しい選考ステップを追加。
- `PUT /api/companies/:id/roadmap/steps/:step_id?uid=<uid>`
	- ハンドラ: `handlers.UpdateRoadmapStepHandler`
	- ステップのタイトル、ステータス、期日、次に行うこと、メモを更新。
- `DELETE /api/companies/:id/roadmap/steps/:step_id?uid=<uid>`
	- ハンドラ: `handlers.DeleteRoadmapStepHandler`
	- 指定ステップを削除。
- `PUT /api/companies/:id/roadmap/current?uid=<uid>`
	- ハンドラ: `handlers.SetCurrentRoadmapStepHandler`
	- 現在地ステップを切り替え、前後のステップ状態や企業の選考ステータスと連動。
- `POST /api/companies/:id/roadmap/advice?uid=<uid>`
	- ハンドラ: `handlers.GetRoadmapAdviceHandler`
	- 現在地ステップおよび次に行うべきことに対して、Gemini APIが具体的な選考対策指針をアドバイス生成。

**DB**

- `company_roadmap_steps`: `company_id`, `user_id`, `step_order`, `title`, `status`, `target_date`, `next_action`, `notes`

## APIルート一覧

| Method | Route | 主な用途 | DB/外部サービス |
| --- | --- | --- | --- |
| GET | `/login` | Google OAuth URL取得 | Google OAuth |
| GET | `/auth/callback` | OAuthコールバック | Google UserInfo、`users` |
| GET | `/api/events` | 予定一覧 | `events` |
| POST | `/api/events` | 予定登録 | `events` |
| PUT | `/api/events/:id` | 予定更新 | `events` |
| DELETE | `/api/events/:id` | 予定削除 | `events` |
| POST | `/api/extract-event` | メールから予定抽出 | Gemini API |
| GET | `/api/fetch-mails` | Gmailメール一覧 | `users`、`mail_filter_entries`、Gmail API |
| GET | `/api/mails/:id` | Gmailメール本文 | `users`、Gmail API |
| GET | `/api/mail-filters` | フィルター一覧 | `mail_filter_entries` |
| POST/PUT | `/api/mail-filters` | フィルター一括更新 | `mail_filter_entries` |
| POST | `/api/mail-filters/items` | フィルター追加 | `mail_filter_entries` |
| PUT | `/api/mail-filters/items/:id` | フィルター更新 | `mail_filter_entries` |
| DELETE | `/api/mail-filters/items/:id` | フィルター削除 | `mail_filter_entries` |
| GET | `/api/profile` | プロフィール取得 | `users`、`profiles` |
| POST | `/api/profile` | プロフィール保存 | `profiles` |
| GET | `/api/companies` | 企業一覧 | `companies` |
| POST | `/api/companies` | 企業登録 | `companies` |
| PUT | `/api/companies/status` | 選考ステータス更新 | `companies` |
| POST | `/api/ai/analyze` | 企業研究・志望動機生成 | `companies`、プロフィール、Gemini API |
| GET | `/api/companies/:id/roadmap` | 企業のロードマップ詳細取得 | `companies`、`company_roadmap_steps` |
| POST | `/api/companies/:id/roadmap/init` | ロードマップ初期化（テンプレート/AI） | `companies`、`profiles`、`company_roadmap_steps`、Gemini API |
| POST | `/api/companies/:id/roadmap/steps` | ロードマップステップ追加 | `company_roadmap_steps` |
| PUT | `/api/companies/:id/roadmap/steps/:step_id` | ステップ更新 | `company_roadmap_steps` |
| DELETE | `/api/companies/:id/roadmap/steps/:step_id` | ステップ削除 | `company_roadmap_steps` |
| PUT | `/api/companies/:id/roadmap/current` | 現在地ステップ切り替え・進行 | `company_roadmap_steps`、`companies` |
| GET | `/api/roadmaps/summary` | 全企業のロードマップ概要一括取得 | `companies`、`company_roadmap_steps` |
| POST | `/api/companies/:id/roadmap/advice` | 現在地ステップのAI対策アドバイス生成 | `companies`、`profiles`、Gemini API |

## 今後の更新ルール

新しい画面、画面内の機能、APIルート、DBテーブル、外部API連携を追加・変更した場合は、実装変更と同じ作業単位でこのファイルも更新する。

更新時は次の項目を必ず確認する。

1. 画面ルートと実装ファイル
2. ユーザー操作と画面状態
3. 呼び出すAPIのHTTPメソッド、パス、リクエスト、レスポンス
4. Go側のハンドラと主要な処理
5. SQL、テーブル、主要カラム、ユーザー識別条件
6. 外部API、環境変数、個人情報の取り扱い
7. 既存仕様から変更された場合の注意点

仕様変更だけを行った場合も、実装と一致するよう該当セクションとAPI一覧を更新する。
