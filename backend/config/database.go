package config

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/go-sql-driver/mysql"
)

var DB *sql.DB

func ensureSchema() {
	queries := []string{
		`
		CREATE TABLE IF NOT EXISTS users (
			id INT NOT NULL AUTO_INCREMENT,
			email VARCHAR(255) NOT NULL,
			access_token TEXT,
			refresh_token TEXT,
			expiry DATETIME NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (id),
			UNIQUE KEY uk_users_email (email)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
		`,
		`
		CREATE TABLE IF NOT EXISTS profiles (
			user_id INT NOT NULL,
			name VARCHAR(100) DEFAULT '',
			university VARCHAR(100) DEFAULT '',
			faculty VARCHAR(100) DEFAULT '',
			target_industry VARCHAR(100) DEFAULT '',
			self_pr TEXT,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			PRIMARY KEY (user_id),
			CONSTRAINT fk_profiles_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
		`,
		`
		CREATE TABLE IF NOT EXISTS mail_filter_entries (
			id INT NOT NULL AUTO_INCREMENT,
			user_id INT NOT NULL,
			entry_type VARCHAR(16) NOT NULL,
			email VARCHAR(255) NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (id),
			UNIQUE KEY uk_mail_filter_entries (user_id, entry_type, email),
			CONSTRAINT fk_mail_filter_entries_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
		`,
		`
		CREATE TABLE IF NOT EXISTS companies (
			id INT NOT NULL AUTO_INCREMENT,
			user_id INT NOT NULL,
			company_name VARCHAR(255) NOT NULL,
			industry VARCHAR(255) DEFAULT '',
			business_type VARCHAR(255) DEFAULT '',
			homepage_url VARCHAR(500) DEFAULT '',
			status VARCHAR(50) DEFAULT '検討中',
			PRIMARY KEY (id),
			KEY idx_companies_user_id (user_id),
			CONSTRAINT fk_companies_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
		`,
		`
		CREATE TABLE IF NOT EXISTS events (
			id INT NOT NULL AUTO_INCREMENT,
			user_id INT NOT NULL,
			company_name VARCHAR(255) NOT NULL,
			event_title VARCHAR(255) NOT NULL,
			event_date DATE NOT NULL,
			start_time TIME NOT NULL,
			end_time TIME NOT NULL,
			description TEXT,
			created_from_mail_id VARCHAR(255),
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			PRIMARY KEY (id),
			INDEX idx_user_date (user_id, event_date),
			CONSTRAINT fk_events_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
		`,
		`
		CREATE TABLE IF NOT EXISTS company_roadmap_steps (
			id INT NOT NULL AUTO_INCREMENT,
			company_id INT NOT NULL,
			user_id INT NOT NULL,
			step_order INT NOT NULL,
			title VARCHAR(255) NOT NULL,
			status VARCHAR(50) NOT NULL DEFAULT 'pending',
			target_date VARCHAR(50) DEFAULT '',
			next_action TEXT,
			notes TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			PRIMARY KEY (id),
			INDEX idx_roadmap_company_order (company_id, step_order),
			INDEX idx_roadmap_user (user_id),
			CONSTRAINT fk_roadmap_companies FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
			CONSTRAINT fk_roadmap_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
		`,
	}

	for _, query := range queries {
		if _, err := DB.Exec(query); err != nil {
			log.Fatal("必須テーブルの作成に失敗しました: ", err)
		}
	}
}

func InitDB() {
	var err error
	// パスワードは先ほど疎通確認が取れた 'root' に設定しています
	dst := "root:root@tcp(127.0.0.1:3306)/easy_job_hunting?parseTime=true"
	DB, err = sql.Open("mysql", dst)
	if err != nil {
		log.Fatal("データベースの接続設定に失敗しました: ", err)
	}

	err = DB.Ping()
	if err != nil {
		log.Fatal("MySQLに接続できませんでした。Dockerコンテナが起動しているか確認してください: ", err)
	}

	ensureSchema()
	fmt.Println("MySQLへの接続に成功しました。")
}
