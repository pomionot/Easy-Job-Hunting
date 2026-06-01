import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

export default function Dashboard() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // 🔄 Goのバックエンドから選考予定を取得
  useEffect(() => {
    fetch("http://localhost:8080/api/events")
      .then((res) => {
        if (!res.ok) throw new Error("データの取得に失敗したで");
        return res.json();
      })
      .then((data) => {
        // FullCalendarが認識できるデータ形式（start, end, titleなど）にマッピング
        const formattedEvents = data.map((event) => {
          // 「14:00 - 15:00」のような文字列から時間を切り出す簡易処理
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
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  // カレンダー内の予定をクリックした時の処理
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
            className="block py-2.5 px-4 rounded hover:bg-slate-800 transition text-slate-400"
          >
            📬 メール一覧
          </a>
          <a
            href="#"
            className="block py-2.5 px-4 rounded bg-blue-600 font-semibold transition"
          >
            📅 選考カレンダー
          </a>
          <a
            href="#"
            className="block py-2.5 px-4 rounded hover:bg-slate-800 transition text-slate-400"
          >
            🏢 エントリー企業一覧
          </a>
        </nav>
      </aside>

      {/* メメインコンテンツ */}
      <main className="flex-1 p-8">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800">選考カレンダー</h1>
          <span className="text-sm text-slate-600 font-medium">
            ようこそ、ユーザーさん
          </span>
        </header>

        {loading ? (
          <div className="text-center py-12 text-slate-500">
            データを読み込み中やで...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* 🗓️ 左側：FullCalendar本体 (3カラム分使って広く見せる) */}
            <div className="lg:col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                locale="ja" // 日本語化
                events={events}
                eventClick={handleEventClick}
                headerToolbar={{
                  left: "prev,next today",
                  center: "title",
                  right: "dayGridMonth,timeGridWeek", // 月表示、週表示の切り替えボタン
                }}
                buttonText={{
                  today: "今日",
                  month: "月",
                  week: "週",
                }}
                height="auto"
                eventColor="#2563eb" // 予定の背景色（青）
                eventTextColor="#ffffff" // 予定の文字色（白）
              />
            </div>

            {/* 🔍 右側：選択した予定の詳細表示 (1カラム分) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit">
              <h3 className="font-bold text-slate-800 text-lg mb-4 pb-2 border-b border-slate-100">
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
                <div className="text-center py-12 text-slate-400 text-sm">
                  カレンダー内の予定をクリックすると、ここに詳細が表示されるで！
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
