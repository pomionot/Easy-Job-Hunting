# Easy Job Hunting

Gmail、選考予定、企業情報、プロフィール、就活ロードマップをまとめて管理する就活支援アプリです。

## 構成

```text
Easy-Job-Hunting/
├── backend/
│   ├── main.go                 # Gin APIサーバー
│   ├── auth/                   # Google OAuth
│   ├── config/                 # DB接続、Gmail検索条件
│   ├── handlers/               # APIハンドラーと機能テスト
│   ├── models/                 # データモデル
│   └── migrations/             # DBマイグレーション
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # ルーティングとログイン
│   │   ├── Dashboard.jsx       # ダッシュボード
│   │   ├── components/         # モーダル、共通アイコン
│   │   └── pages/              # 画面コンポーネント
│   └── tests/
│       ├── setup.js            # Testing Library共通設定
│       └── screens/             # 画面ごとのテスト
├── docker-compose.yml          # MySQL環境
├── screen_description.md       # 画面・API・DB仕様
└── roadmap.md                  # 実装状況と今後の課題
```

## 必要環境

- Go 1.21以上
- Node.js 18以上
- MySQL 8、またはDocker Desktop
- Google OAuth認証情報
- Gmail APIを利用するGoogleアカウント
- Gemini APIキー（メールイベント抽出、企業分析、ロードマップAIを使う場合）

## セットアップ

### 1. データベースを起動

```bash
docker compose up -d db
```

Dockerを使わない場合は、MySQLに `easy_job_hunting` データベースを作成してください。

### 2. 環境変数を設定

`backend/.env` に次の値を設定します。

```dotenv
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URL=http://localhost:8080/auth/callback
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.6-flash
```

OAuthのリダイレクトURIには `http://localhost:8080/auth/callback` を登録してください。

### 3. バックエンドを起動

```bash
cd backend
go run main.go
```

APIは `http://localhost:8080` で起動します。

### 4. フロントエンドを起動

```bash
cd frontend
npm install
npm run dev
```

画面は通常 `http://localhost:5173` で起動します。

## テスト

### バックエンド

```bash
cd backend
go test ./...
```

対象には次の機能テストが含まれます。

- `config/filters_test.go`: Gmail検索条件、送信元メールアドレス正規化
- `handlers/mail_preprocess_test.go`: AI送信前の個人情報・URLマスキング
- `handlers/events_test.go`: イベント入力必須項目、Geminiキー検証
- `handlers/roadmap_test.go`: ロードマップのユーザーID、進捗率、現在地判定

### フロントエンド

```bash
cd frontend
npm test -- --run
```

画面ごとに次のファイルへ分離しています。

- `tests/screens/App.test.jsx`: ログイン画面
- `tests/screens/Dashboard.test.jsx`: ダッシュボード
- `tests/screens/MailList.test.jsx`: メール一覧・本文表示
- `tests/screens/EventExtractModal.test.jsx`: イベント抽出・編集
- `tests/screens/MailFilterSettings.test.jsx`: メールフィルター
- `tests/screens/Profile.test.jsx`: プロフィール設定
- `tests/screens/CompanyRegister.test.jsx`: 企業登録
- `tests/screens/CompanyList.test.jsx`: 企業管理リスト
- `tests/screens/CompanyRoadmap.test.jsx`: 就活ロードマップ

監視モードで実行する場合:

```bash
npm run test:watch
```

### ビルドとLint

```bash
cd frontend
npm run build
npm run lint
```

現在のLintには、既存画面のReact Hooks規則に関する課題が残っています。画面テストと本番ビルドは独立して実行できます。

## 主な画面

| 画面 | ルート | 主な機能 |
| --- | --- | --- |
| ログイン | `/` | Google OAuth開始 |
| ダッシュボード | `/dashboard` | カレンダー、最新メール、ロードマップ概要 |
| メール一覧 | `/mails` | Gmail一覧、本文表示、イベント抽出 |
| メールフィルター | `/mail-filters` | 包含・除外送信元の管理 |
| プロフィール | `/profile` | 就活プロフィールの登録・更新 |
| 企業登録 | `/company-register` | 企業情報の登録 |
| 企業管理 | `/company-list` | 企業ステータス、AI分析、ロードマップ概要 |
| 就活ロードマップ | `/roadmap` | ステップ、現在地、次アクション、AI対策 |

各画面のAPI、DB、外部サービスの詳細は [screen_description.md](screen_description.md) を参照してください。

## API概要

- `GET /login`: Google OAuth URL取得
- `GET /auth/callback`: OAuthコールバック
- `/api/fetch-mails`, `/api/mails/:id`: Gmailメール取得
- `/api/extract-event`: メールからイベント抽出
- `/api/events`: イベントの取得・登録・更新・削除
- `/api/mail-filters`: メールフィルター管理
- `/api/profile`: プロフィール管理
- `/api/companies`: 企業管理
- `/api/companies/:id/roadmap`: ロードマップ管理
- `/api/companies/:id/roadmap/advice`: AI対策アドバイス

## セキュリティ上の注意

現在はログイン後の `uid` / `email` をlocalStorageとAPIクエリに使用しています。本番公開前にサーバー側セッションまたはJWTへ移行してください。OAuthシークレット、Gmailトークン、Gemini APIキーはGitへコミットしないでください。

## 関連ドキュメント

- [画面機能仕様書](screen_description.md)
- [実装状況・ロードマップ](roadmap.md)
- [カレンダー機能セットアップ](CALENDAR_FEATURE_SETUP.md)
