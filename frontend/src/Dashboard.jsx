import React, { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css"; // カレンダーの基本スタイル
import "./calendar-custom.css"; // 後ほど作成するカスタムスタイル

// 就活の予定ダミーデータ（日付ごとに管理）
const dummyEvents = [
  {
    id: 1,
    date: "2026-05-25",
    company: "株式会社スタンバイ",
    title: "一次選考（オンライン面接）",
    time: "14:00 - 15:00",
  },
  {
    id: 2,
    date: "2026-05-25",
    company: "未来ソリューションズ",
    title: "会社説明会",
    time: "16:00 - 17:30",
  },
  {
    id: 3,
    date: "2026-05-28",
    company: "TechInnovation",
    title: "最終面接（対面）",
    time: "11:00 - 12:00",
  },
];

export default function Dashboard() {
  const [value, onChange] = useState(new Date());
  const [events, setEvents] = useState(dummyEvents);

  // 選択された日付を 'YYYY-MM-DD' の形式に変換する関数
  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const selectedDateStr = formatDate(value);

  // 選択された日付に一致する予定をフィルタリング
  const activeEvents = events.filter((event) => event.date === selectedDateStr);

  // 💡 カレンダーの日にちにドット（印）をつけるための判定
  const hasEvent = (date) => {
    return events.some((event) => event.date === formatDate(date));
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

      {/* メインコンテンツ */}
      <main className="flex-1 p-8">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800">選考カレンダー</h1>
          <span className="text-sm text-slate-600 font-medium">
            ようこそ、ユーザーさん
          </span>
        </header>

        {/* カレンダー＆予定のレイアウト */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左側：カレンダー本体 (2カラム分) */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex justify-center">
            <div className="w-full max-w-xl">
              <Calendar
                onChange={onChange}
                value={value}
                locale="ja-JP" // カレンダーを日本語化
                className="w-full border-none"
                tileContent={({ date, view }) =>
                  view === "month" && hasEvent(date) ? (
                    <div className="flex justify-center mt-1">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    </div>
                  ) : null
                }
              />
            </div>
          </div>

          {/* 右側：選択した日の予定一覧 (1カラム分) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 text-lg mb-4 pb-2 border-b border-slate-100">
              {selectedDateStr.replace(/-/g, "/")} の予定
            </h3>

            {activeEvents.length > 0 ? (
              <div className="space-y-4">
                {activeEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-4 bg-blue-50 border border-blue-100 rounded-xl"
                  >
                    <span className="inline-block bg-blue-600 text-white text-xs px-2 py-0.5 rounded font-semibold mb-2">
                      {event.company}
                    </span>
                    <h4 className="font-bold text-slate-800 text-sm mb-1">
                      {event.title}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium">
                      🕒 {event.time}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 text-sm">
                この日の選考予定はありません。
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
