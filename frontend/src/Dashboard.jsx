import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const [events, setEvents] = useState([]);
  const [mails, setMails] = useState([]);
  const [loadingCalendar, setLoadingCalendar] = useState(true);
  const [loadingMails, setLoadingMails] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [errorMail, setErrorMail] = useState("");

  // 🔄 1. 選考予定（カレンダー）を取得
  useEffect(() => {
    fetch("http://localhost:8080/api/events")
      .then((res) => {
        if (!res.ok) throw new Error("カレンダーデータの取得に失敗しました");
        return res.json();
      })
      .then((data) => {
        const formattedEvents = data.map((event) => {
          const times = event.time.split(" - ");
          return {
            id: event.id,
            title: `${event.company} | ${event.title}`,
            start: `${event.date}T${times[0]}:00`,
            end: `${event.date}T${times[1]}:00`,
            extendedProps: {
              company: event.company,
              jobTitle: event.title,
              timeStr: event.time,
              dateStr: event.date,
            },
          };
        });
        setEvents(formattedEvents);
        setLoadingCalendar(false);
      })
      .catch((err) => {
        console.error(err);
        setLoadingCalendar(false);
      });
  }, []);

  // 🔄 2. 就活メールを取得
  useEffect(() => {
    fetch("http://localhost:8080/api/fetch-mails")
      .then((res) => {
        if (res.status === 401) {
          throw new Error(
            "ログインセッションが切れているか、未ログイン状態です。トップ画面から再度ログインを試してください。",
          );
        }
        if (!res.ok) throw new Error("メールデータの取得に失敗しました");
        return res.json();
      })
      .then((data) => {
        setMails(data || []);
        setLoadingMails(false);
      })
      .catch((err) => {
        console.error(err);
        setErrorMail(err.message || "メールの取得中にエラーが発生しました");
        setLoadingMails(false);
      });
  }, []);

  const handleEventClick = (info) => {
    setSelectedEvent(info.event.extendedProps);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* サイドバー */}
      <aside className="w-64 bg-slate-900 text-white p-6 hidden md:block">
        <h2 className="text-xl font-bold mb-8 tracking-wider">
          Easy Job Hunting
        </h2>
        <nav className="space-y-4">
          <a
            href="#"
            className="block py-2.5 px-4 rounded bg-blue-600 font-semibold transition"
          >
            📬 メインダッシュボード
          </a>
        </nav>
      </aside>

      {/* メインコンテンツ */}
      <main className="flex-1 p-8">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800">
            就活管理ダッシュボード
          </h1>
          <span className="text-sm text-slate-600 font-medium">
            ようこそ、ユーザーさん
          </span>
        </header>

        {/* 📬 就活メール機能への導線 */}
        <div
          style={{
            marginTop: "20px",
            padding: "20px",
            border: "1px solid #e0e0e0",
            borderRadius: "12px",
            backgroundColor: "#fff",
            boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
            maxWidth: "400px",
          }}
        >
          <h3 style={{ margin: "0 0 10px 0", fontSize: "18px", color: "#333" }}>
            📬 就活メールチェッカー
          </h3>
          <p
            style={{
              fontSize: "14px",
              color: "#666",
              margin: "0 0 15px 0",
              lineHeight: "1.5",
            }}
          >
            AIフィルターがメルマガを自動で弾き、面接や選考に関する重要なメールだけを厳選して表示します。
          </p>
          <Link
            to="/mails"
            style={{
              display: "inline-block",
              padding: "10px 20px",
              backgroundColor: "#1a73e8",
              color: "#fff",
              textDecoration: "none",
              borderRadius: "6px",
              fontWeight: "bold",
              fontSize: "14px",
              boxShadow: "0 2px 4px rgba(26,115,232,0.3)",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#1557b0")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#1a73e8")
            }
          >
            メール一覧を見る →
          </Link>
        </div>

        {/* カレンダーセクション */}
        <div className="mb-12">
          <h2 className="text-lg font-bold text-slate-700 mb-4">
            📅 選考カレンダー
          </h2>
          {loadingCalendar ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-500">
              カレンダーを読み込み中です...
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <FullCalendar
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
                  locale="ja"
                  events={events}
                  eventClick={handleEventClick}
                  headerToolbar={{
                    left: "prev,next today",
                    center: "title",
                    right: "dayGridMonth,timeGridWeek",
                  }}
                  buttonText={{ today: "今日", month: "月", week: "週" }}
                  height="auto"
                  eventColor="#2563eb"
                  eventTextColor="#ffffff"
                />
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit">
                <h3 className="font-bold text-slate-800 text-base mb-4 pb-2 border-b border-slate-100">
                  選考の詳細
                </h3>
                {selectedEvent ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                      <span className="inline-block bg-blue-600 text-white text-xs px-2 py-0.5 rounded font-semibold mb-2">
                        {selectedEvent.company}
                      </span>
                      <h4 className="font-bold text-slate-800 text-sm mb-1">
                        {selectedEvent.jobTitle}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium mt-2">
                        📅 日付: {selectedEvent.dateStr.replace(/-/g, "/")}
                      </p>
                      <p className="text-xs text-slate-500 font-medium">
                        🕒 時間: {selectedEvent.timeStr}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedEvent(null)}
                      className="w-full py-2 text-xs bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition"
                    >
                      詳細を閉じる
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    カレンダーの予定をクリックすると詳細が表示されます。
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* メール解析セクション */}
        <div>
          <h2 className="text-lg font-bold text-slate-700 mb-4">
            📬 自動検知された就活メール（最新5件）
          </h2>

          {loadingMails ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-500">
              Gmailから就活メールをスキャンしています...
            </div>
          ) : errorMail ? (
            <div className="p-6 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-sm">
              🚨 {errorMail}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="divide-y divide-slate-200">
                {mails.length > 0 ? (
                  mails.map((mail) => (
                    <div
                      key={mail.id}
                      className="p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50 transition"
                    >
                      <div className="mb-2 sm:mb-0">
                        <span className="inline-block bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-md font-semibold mb-1">
                          {mail.company}
                        </span>
                        <h4 className="text-base font-semibold text-slate-800 mt-1">
                          {mail.subject}
                        </h4>
                        <p className="text-xs text-slate-400 mt-1.5">
                          📨 受信日時: {mail.date}
                        </p>
                      </div>
                      <div>
                        <span className="inline-block text-xs font-bold px-3 py-1.5 rounded-full bg-amber-100 text-amber-800">
                          自動解析済
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    就活に関連するメール（面接・選考・インターンなど）は見つかりませんでした。
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
