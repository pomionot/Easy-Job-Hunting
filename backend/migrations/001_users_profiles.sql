-- users テーブルに uid を追加し、プロフィールを別テーブルで管理するためのマイグレーション
-- 実行は 1 回だけ行ってください。

ALTER TABLE users
  ADD COLUMN id INT NOT NULL AUTO_INCREMENT UNIQUE FIRST;

CREATE TABLE IF NOT EXISTS profiles (
  user_id INT PRIMARY KEY,
  name VARCHAR(100) DEFAULT '',
  university VARCHAR(100) DEFAULT '',
  faculty VARCHAR(100) DEFAULT '',
  target_industry VARCHAR(100) DEFAULT '',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_profiles_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);