import React, { useState, useEffect } from "react";

export default function MailList() {
  const [mails, setMails] = useState([]);
  const [selectedMail, setSelectedMail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  // 1. フィルターされたメール一覧をバックエンドから取得
  useEffect(() => {
    fetch("http://localhost:8080/api/fetch-mails")
      .then((res) => {
        // デバッグ用：本当にJSONが返ってきているか、中身のタイプをチェック
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new TypeError(
            "ガーン！JSONじゃなくてHTMLが返ってきてるよ！プロキシかURLが怪しいです。",
          );
        }
        return res.json();
      })
      .then((data) => {
        setMails(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("メール一覧の取得に失敗:", err);
        setLoading(false);
      });
  }, []);

  // 2. メールをクリックしたときに詳細（本文）を取得
  const handleMailClick = (id) => {
    setDetailLoading(true);
    setSelectedMail({ id }); // 先にIDだけ入れて枠を表示しておく

    fetch(`http://localhost:8080/api/mails/${id}`)
      .then((res) => {
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new TypeError(
            "詳細取得でJSON以外が返ってきました。URLかバックエンドを確認してください。",
          );
        }
        return res.json();
      })
      .then((data) => {
        setSelectedMail(data);
        setDetailLoading(false);
      })
      .catch((err) => {
        console.error("メール詳細の取得に失敗:", err);
        setDetailLoading(false);
      });
  };

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        就活メールを収穫中（フィルタリング中）...
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        gap: "20px",
        padding: "20px",
        height: "80vh",
        fontFamily: "sans-serif",
      }}
    >
      {/* 左側：フィルター済みメール一覧 */}
      <div
        style={{
          flex: 1,
          border: "1px solid #ccc",
          borderRadius: "8px",
          overflowY: "auto",
          backgroundColor: "#fff",
        }}
      >
        <h2
          style={{
            padding: "15px",
            borderBottom: "1px solid #eee",
            margin: 0,
            backgroundColor: "#f8f9fa",
            fontSize: "18px",
          }}
        >
          📬 厳選された就活メール ({mails.length}件)
        </h2>
        {mails.length === 0 ? (
          <p style={{ padding: "20px", color: "#666" }}>
            重要な就活メールは現在ありません。メルマガは綺麗に弾かれています！
          </p>
        ) : (
          mails.map((mail) => (
            <div
              key={mail.id}
              onClick={() => handleMailClick(mail.id)}
              style={{
                padding: "15px",
                borderBottom: "1px solid #eee",
                cursor: "pointer",
                backgroundColor:
                  selectedMail?.id === mail.id ? "#e8f0fe" : "transparent",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor =
                  selectedMail?.id === mail.id ? "#e8f0fe" : "#f5f5f5")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor =
                  selectedMail?.id === mail.id ? "#e8f0fe" : "transparent")
              }
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "between",
                  marginBottom: "5px",
                }}
              >
                <strong
                  style={{
                    fontSize: "14px",
                    color: "#333",
                    display: "block",
                    textOverflow: "ellipsis",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    width: "200px",
                  }}
                >
                  {mail.from.split("<")[0]} {/* 名前部分だけ抽出 */}
                </strong>
                <span
                  style={{
                    fontSize: "12px",
                    color: "#999",
                    marginLeft: "auto",
                  }}
                >
                  {mail.date.substring(0, 16)}
                </span>
              </div>
              <div
                style={{
                  fontWeight: "bold",
                  fontSize: "14px",
                  marginBottom: "5px",
                  color: "#1a73e8",
                }}
              >
                {mail.subject}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#666",
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                }}
              >
                {mail.snippet}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 右側：メール本文のプレビュー表示 */}
      <div
        style={{
          flex: 1,
          border: "1px solid #ccc",
          borderRadius: "8px",
          padding: "20px",
          backgroundColor: "#fafafa",
          overflowY: "auto",
        }}
      >
        {selectedMail ? (
          detailLoading ? (
            <div
              style={{ color: "#666", textAlign: "center", marginTop: "50px" }}
            >
              本文を読み込み中...
            </div>
          ) : (
            <div>
              <h3
                style={{
                  margin: "0 0 10px 0",
                  color: "#333",
                  fontSize: "20px",
                  borderBottom: "2px solid #1a73e8",
                  paddingBottom: "10px",
                }}
              >
                {selectedMail.subject}
              </h3>
              <div
                style={{
                  marginBottom: "15px",
                  fontSize: "13px",
                  color: "#555",
                }}
              >
                <strong>差出人:</strong> {selectedMail.from} <br />
                <strong>日時:</strong> {selectedMail.date}
              </div>
              <div
                style={{
                  backgroundColor: "#fff",
                  padding: "15px",
                  borderRadius: "6px",
                  border: "1px solid #ddd",
                  whiteSpace: "pre-wrap", // 改行をそのまま反映させる
                  fontSize: "14px",
                  lineHeight: "1.6",
                  color: "#333",
                }}
              >
                {selectedMail.body}
              </div>
            </div>
          )
        ) : (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
              color: "#999",
              flexDirection: "column",
            }}
          >
            <span style={{ fontSize: "48px" }}>👀</span>
            <p>
              左側の一覧からメールをクリックすると、
              <br />
              ここに本文がリアルタイムに表示されます。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
