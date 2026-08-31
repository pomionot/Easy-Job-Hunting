# メール→カレンダー自動登録機能 - セットアップガイド

## 機能概要
メールの内容からワンクリックでカレンダーに予定を自動登録できます。
Gemini AIがメール本文から面接日時を自動抽出し、確認・編集後にカレンダーに登録できます。

## 実装ファイル一覧

### バックエンド
| ファイル | 説明 |
|---------|------|
| `backend/migrations/003_create_events_table.sql` | イベントテーブル作成マイグレーション |
| `backend/handlers/events.go` | イベント管理のAPI実装（抽出・取得・作成・削除） |
| `backend/main.go` | 新しいAPIルーティングの追加 |

### フロントエンド
| ファイル | 説明 |
|---------|------|
| `frontend/src/components/EventExtractModal.jsx` | イベント抽出・編集モーダルコンポーネント |
| `frontend/src/pages/MailList.jsx` | 「カレンダーに登録」ボタン追加 |

## セットアップ手順

### 1. データベースマイグレーション
```sql
-- MySQLで以下を実行
USE easy_job_hunting;
SOURCE backend/migrations/003_create_events_table.sql;
```

Docker を使用している場合：
```bash
docker exec -i easy-job-hunting-db mysql -uroot -proot easy_job_hunting < backend/migrations/003_create_events_table.sql
```

### 2. 環境変数確認
`.env` ファイルに以下が設定されていることを確認：
```
GEMINI_API_KEY=your_gemini_api_key
```

### 3. バックエンド起動
```bash
cd backend
go run main.go
# サーバーが http://localhost:8080 で起動します
```

### 4. フロントエンド起動
```bash
cd frontend
npm install
npm run dev
# クライアントが http://localhost:5173 で起動します
```

## 使用方法

### ユーザー手順
1. ダッシュボード/メール一覧ページにアクセス
2. メールを選択して詳細を表示
3. **「このメールからカレンダーに登録」** ボタンをクリック
4. モーダルが開き、AIが自動抽出した日程を表示
5. 内容を確認・編集
6. **「カレンダーに登録」** ボタンで確定

## API エンドポイント

### イベント抽出（AI処理）
```
POST /api/extract-event
Content-Type: application/json

リクエスト:
{
  "mail_id": "メールID",
  "subject": "件名",
  "body": "本文",
  "from": "差出人"
}

レスポンス:
{
  "has_event": true,
  "events": [
    {
      "company": "企業名",
      "title": "イベント種別",
      "date": "2026-05-25",
      "start_time": "14:00",
      "end_time": "15:00",
      "notes": "備考",
      "confidence": 0.95
    }
  ]
}
```

### イベント一覧取得
```
GET /api/events?uid=123
または
GET /api/events?email=user@example.com

レスポンス:
[
  {
    "id": 1,
    "date": "2026-05-25",
    "company": "企業名",
    "title": "一次選考",
    "time": "14:00 - 15:00",
    "description": "備考",
    "created_from_mail_id": "メールID"
  }
]
```

### イベント作成
```
POST /api/events?uid=123
Content-Type: application/json

リクエスト:
{
  "company": "企業名",
  "title": "イベント種別",
  "date": "2026-05-25",
  "start_time": "14:00",
  "end_time": "15:00",
  "description": "備考",
  "created_from_mail_id": "メールID"
}

レスポンス:
{
  "id": 1,
  "message": "イベントが正常に作成されました"
}
```

### イベント削除
```
DELETE /api/events/1?uid=123

レスポンス:
{
  "message": "イベントが削除されました"
}
```

## 技術スタック

| 項目 | 技術 |
|------|------|
| AI エンジン | Google Gemini 1.5 Flash |
| バックエンド | Go + Gin Framework |
| フロントエンド | React + Tailwind CSS |
| データベース | MySQL 8.0 |

## トラブルシューティング

### Gemini API キーエラー
- `.env` に `GEMINI_API_KEY` が正しく設定されているか確認
- API キーに有効期限がないか確認

### モーダルが表示されない
- ブラウザのコンソールでエラーを確認
- CORS 設定を確認（main.go でPUT/DELETEが許可されている）

### イベント抽出に失敗
- メール本文に日時情報が含まれているか確認
- 日時形式が明確か確認（例：「5月25日14時」）

## 今後の改善案

- [ ] Google Calendar API との連携
- [ ] 時間帯の自動最適化提案
- [ ] 複数イベント同時登録
- [ ] イベント更新機能
- [ ] カレンダーからメール本文への逆参照
