import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import MaterialIcon from "../components/MaterialIcon";
import EventExtractModal from "../components/EventExtractModal";
import AppSidebar from "../components/AppSidebar";

export default function MailList() {
  const [mails, setMails] = useState([]);
  const [selectedMail, setSelectedMail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const userUid = localStorage.getItem("login_user_uid") || "";
  const userEmail = localStorage.getItem("login_user_email") || "";

  // 1. フィルターされたメール一覧をバックエンドから取得
  const loadMails = (showLoading = false) => {
    const userQuery = userUid
      ? `?uid=${encodeURIComponent(userUid)}`
      : userEmail
        ? `?email=${encodeURIComponent(userEmail)}`
        : "";

    setLoading(showLoading);
    setRefreshing(!showLoading);
    fetch(`/api/fetch-mails${userQuery}`)
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
        setRefreshing(false);
      })
      .catch((err) => {
        console.error("メール一覧の取得に失敗:", err);
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    loadMails(true);
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

    fetch(`/api/mails/${id}${userQuery}`)
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
    <div className="bg-gray-50 text-gray-800 flex min-h-screen overflow-hidden">
      <AppSidebar activePath="/mails" />

      <main className="flex-1 flex flex-col min-w-0 min-h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-8 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-xl font-semibold text-gray-800 truncate">就活メール一覧</h1>
            <span className="hidden sm:inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-md shrink-0">
              フィルタ適用中
            </span>
          </div>
          <button
            type="button"
            onClick={() => loadMails(false)}
            disabled={refreshing}
            title="メールを再取得"
            className="text-gray-500 hover:text-orange-500 transition-colors disabled:opacity-50 p-2"
          >
            <i className={`fa-solid fa-arrow-rotate-right ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden p-4 sm:p-6 gap-4 sm:gap-6">
          <section className="w-full md:w-1/3 lg:w-2/5 xl:w-1/3 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden shrink-0 min-h-[24rem] md:min-h-0">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2 text-gray-700 font-bold">
                <i className="fa-regular fa-envelope text-orange-500" aria-hidden="true" />
                厳選された就活メール
              </div>
              <span className="text-xs text-gray-500">{mails.length}件</span>
            </div>

            <div className="flex-1 overflow-y-auto">
              {mails.length === 0 ? (
                <div className="p-6 text-sm text-gray-500">
                  重要な就活メールは現在ありません。メルマガは綺麗に弾かれています！
                </div>
              ) : (
                mails.map((mail) => (
                  <button
                    key={mail.id}
                    type="button"
                    onClick={() => handleMailClick(mail.id)}
                    className={`w-full text-left p-4 border-b border-gray-100 border-l-4 cursor-pointer transition-colors ${selectedMail?.id === mail.id ? "border-l-orange-500 bg-orange-50/30" : "border-l-transparent hover:bg-gray-50"}`}
                  >
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <span className="text-sm font-bold text-gray-800 truncate pr-2">
                        {mail.from.split("<")[0].trim()}
                      </span>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {mail.date.substring(0, 16)}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 mb-1 line-clamp-1">
                      {mail.subject}
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                      {mail.snippet}
                    </p>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="w-full md:flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden relative min-h-[32rem] md:min-h-0">
            {selectedMail ? (
              detailLoading ? (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  本文を読み込み中...
                </div>
              ) : (
                <>
                  <div className="p-5 sm:p-6 border-b border-gray-100 shrink-0">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <h2 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight break-words">
                        {selectedMail.subject}
                      </h2>
                      <span className="shrink-0 bg-green-50 text-green-700 border border-green-200 text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1">
                        <i className="fa-solid fa-check" aria-hidden="true" />
                        解析済
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-lg shrink-0">
                          {selectedMail.from.trim().charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-800 truncate">{selectedMail.from}</p>
                          <p className="text-xs text-gray-500 truncate">To: ログイン中のアカウント</p>
                        </div>
                      </div>
                      <div className="text-gray-500 text-xs flex items-center gap-1 shrink-0">
                        <i className="fa-regular fa-clock" aria-hidden="true" />
                        {selectedMail.date}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-5 sm:p-8 bg-white">
                    <div className="text-gray-700 text-sm leading-loose whitespace-pre-wrap font-sans max-w-3xl">
                      {selectedMail.body}
                    </div>
                  </div>

                  <div className="p-4 border-t border-gray-100 bg-gray-50/80 flex justify-end items-center shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsEventModalOpen(true)}
                      className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2"
                    >
                      <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" />
                      このメールからカレンダーに登録
                    </button>
                  </div>
                </>
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500 text-center gap-4 p-6">
                <i className="fa-regular fa-envelope-open text-5xl text-gray-300" aria-hidden="true" />
                <p className="text-sm leading-6 max-w-xs">
                  左側の一覧からメールをクリックすると、ここに本文が表示されます。
                </p>
              </div>
            )}
          </section>
        </div>
      </main>

      <EventExtractModal
        mail={selectedMail}
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onSave={() => {}}
      />
    </div>
  );
}
