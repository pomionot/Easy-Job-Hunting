package config

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/go-sql-driver/mysql"
)

var DB *sql.DB

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
	fmt.Println("MySQLへの接続に成功しました。")
}