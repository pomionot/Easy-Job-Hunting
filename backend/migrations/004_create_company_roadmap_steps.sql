-- 企業ごとの就活ロードマップ・選考ステップテーブルを作成するマイグレーション

CREATE TABLE IF NOT EXISTS company_roadmap_steps (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  user_id INT NOT NULL,
  step_order INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'completed', 'current', 'pending', 'skipped'
  target_date VARCHAR(50) DEFAULT '',            -- 予定日・期日 (YYYY-MM-DD 等)
  next_action TEXT,                              -- 現在地および各ステップで次に行うべきこと (ToDo)
  notes TEXT,                                    -- 補足メモ・対策ポイント
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_roadmap_companies FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_roadmap_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_roadmap_company_order (company_id, step_order),
  INDEX idx_roadmap_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
