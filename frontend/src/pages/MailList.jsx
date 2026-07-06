import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import MaterialIcon from "../components/MaterialIcon";

export default function MailList() {
  const [mails, setMails] = useState([]);
  const [selectedMail, setSelectedMail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const userUid = localStorage.getItem("login_user_uid") || "";
  const userEmail = localStorage.getItem("login_user_email") || "";

  // 1. フィルターされたメール一覧をバックエンドから取得
  useEffect(() => {
    const userQuery = userUid
      ? `?uid=${encodeURIComponent(userUid)}`
      : userEmail
        ? `?email=${encodeURIComponent(userEmail)}`
        : "";

    fetch(`http://localhost:8080/api/fetch-mails${userQuery}`)
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
        if (!Array.isArray(data)) {
          throw new Error(data?.error || "メール一覧の形式が正しくありません");
        }
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

    const userQuery = userUid
      ? `?uid=${encodeURIComponent(userUid)}`
      : userEmail
        ? `?email=${encodeURIComponent(userEmail)}`
        : "";

    fetch(`http://localhost:8080/api/mails/${id}${userQuery}`)
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
      <div className="min-h-screen soft-grid flex items-center justify-center p-6">
        <div className="section-card glass-panel p-8 text-center max-w-md w-full">
          <MaterialIcon name="mail_lock" className="text-[36px] mb-3" />
          <div className="font-semibold text-slate-900 mb-1">
            就活メールを収集しています
          </div>
          <div className="text-sm text-slate-500">
            フィルタリング結果を読み込んでいます...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen soft-grid p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl grid lg:grid-cols-[0.95fr_1.05fr] gap-5">
        <div className="section-card glass-panel overflow-hidden text-left min-h-[70vh]">
          <div className="p-5 border-b border-slate-200/70 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <MaterialIcon name="mail" className="text-[24px]" />
              <div>
                <h2 className="text-lg font-bold text-slate-900 m-0">
                  厳選された就活メール
                </h2>
                <p className="text-xs text-slate-500">
                  {mails.length}件を表示しています
                </p>
              </div>
            </div>
            <Link
              to="/dashboard"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
            >
              <MaterialIcon name="arrow_back" className="text-[16px]" />
              戻る
            </Link>
          </div>
          {mails.length === 0 ? (
            <div className="p-8 text-slate-500">
              重要な就活メールは現在ありません。メルマガは綺麗に弾かれています！
            </div>
          ) : (
            <div className="divide-y divide-slate-200/70 max-h-[calc(70vh-73px)] overflow-auto">
              {mails.map((mail) => (
                <button
                  key={mail.id}
                  type="button"
                  onClick={() => handleMailClick(mail.id)}
                  className={`w-full text-left p-5 transition app-nav-link ${selectedMail?.id === mail.id ? "bg-blue-50/90" : "hover:bg-slate-50/90"}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <strong className="text-sm text-slate-900 block truncate max-w-[70%]">
                      {mail.from.split("<")[0]}
                    </strong>
                    <span className="text-xs text-slate-400 shrink-0">
                      {mail.date.substring(0, 16)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-2 text-blue-700 font-semibold text-sm">
                    <MaterialIcon name="subject" className="text-[18px]" />
                    {mail.subject}
                  </div>
                  <div className="text-xs text-slate-500 leading-5 line-clamp-2">
                    {mail.snippet}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="section-card glass-panel overflow-hidden p-5 sm:p-6 text-left min-h-[70vh]">
          {selectedMail ? (
            detailLoading ? (
              <div className="h-full flex items-center justify-center text-slate-500">
                本文を読み込み中...
              </div>
            ) : (
              <div className="h-full flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3 border-b border-slate-200/70 pb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                      <MaterialIcon name="mail" className="text-[24px]" />
                      {selectedMail.subject}
                    </h3>
                    <div className="text-sm text-slate-600 space-y-1">
                      <div className="inline-flex items-center gap-2 mr-4">
                        <MaterialIcon name="person" className="text-[18px]" />
                        {selectedMail.from}
                      </div>
                      <div className="inline-flex items-center gap-2">
                        <MaterialIcon name="schedule" className="text-[18px]" />
                        {selectedMail.date}
                      </div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                    <MaterialIcon
                      name="verified"
                      className="text-[16px] text-emerald-700"
                    />
                    解析済
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 text-sm leading-7 text-slate-700 whitespace-pre-wrap shadow-sm flex-1 overflow-auto">
                  {selectedMail.body}
                </div>
              </div>
            )
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center gap-4">
              <MaterialIcon
                name="visibility"
                className="text-[56px] text-slate-300"
              />
              <p className="text-sm leading-6 max-w-xs">
                左側の一覧からメールをクリックすると、ここに本文がリアルタイムに表示されます。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
