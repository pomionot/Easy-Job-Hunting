# Easy-Job-Hunting
```
Easy-Job-Hunting/
├── frontend/             # React (Vite) プロジェクト
├── backend/              # Go プロジェクト
├── docker-compose.yml    # (任意) MySQLとGoをまとめて起動する場合
└── .env                  # 環境変数（共通または各フォルダに配置）

backend/
├── main.go               # エントリーポイント（サーバー起動）
├── .env                  # GOOGLE_CLIENT_ID などを記述
├── go.mod                # 依存ライブラリ管理
├── go.sum
├── auth/                 # 【認証関連】
│   └── google.go         # OAuthのURL生成、トークン交換ロジック
├── handler/              # 【コントローラー】HTTPリクエストの受付
│   ├── auth_handler.go   # ログインAPI
│   ├── mail_handler.go   # Gmail取得API
│   └── es_handler.go     # ES管理API
├── model/                # 【データベース構造体】MySQLのテーブル定義
│   ├── user.go           # User struct
│   └── application.go    # Application struct
├── repository/           # 【DB操作】SQLクエリを記述
│   └── user_repo.go      # usersテーブルへの保存・取得処理
└── service/              # 【ビジネスロジック】メール解析やAI連携
    └── analyzer.go       # Gemini APIなどを使った解析処理

frontend/
├── src/
│   ├── components/       # 使い回す部品（ボタン、入力欄など）
│   ├── pages/            # 画面単位（Login.tsx, Dashboard.tsx, ESManger.tsx）
│   ├── hooks/            # カスタムフック（API通信ロジックなど）
│   ├── types/            # TypeScriptの型定義
│   ├── App.tsx           # ルーティング設定
│   └── main.tsx
├── public/
├── index.html
├── package.json
└── vite.config.ts
