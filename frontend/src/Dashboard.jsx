import React, { useState } from "react";

// ダミーデータ（後ほどGoのバックエンドから取得する本物のデータに置き換えます）
const dummyMails = [
  {
    id: 1,
    company: "株式会社スタンバイ",
    subject: "【面接のご案内】一次選考について",
    date: "2026/05/25",
    status: "要対応",
  },
  {
    id: 2,
    company: "TechInnovation",
    subject: "インターンシップ選考結果のお知らせ",
    date: "2026/05/24",
    status: "確認済み",
  },
  {
    id: 3,
    company: "未来ソリューションズ",
    subject: "会社説明会動画ご視聴のお礼",
    date: "2026/05/22",
    status: "アーカイブ",
  },
];

export default function Dashboard() {
  const [mails, setMails] = useState(dummyMails);

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
            📬 メール一覧
          </a>
          <a
            href="#"
            className="block py-2.5 px-4 rounded hover:bg-slate-800 transition text-slate-400"
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
        {/* ヘッダー */}
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800">
            就活ダッシュボード
          </h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-slate-600 font-medium">
              ようこそ、ユーザーさん
            </span>
            <button className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm hover:bg-slate-50 transition">
              ログアウト
            </button>
          </div>
        </header>

        {/* 状況サマリーカード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <p className="text-sm text-slate-500 font-medium">
              未対応の重要メール
            </p>
            <p className="text-3xl font-bold text-red-500 mt-2">1 件</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <p className="text-sm text-slate-500 font-medium">今週の面接予定</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">0 件</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <p className="text-sm text-slate-500 font-medium">
              解析済み総メール数
            </p>
            <p className="text-3xl font-bold text-slate-800 mt-2">
              {mails.length} 件
            </p>
          </div>
        </div>

        {/* メール一覧セクション */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-bold text-slate-700">
              自動検知された就活メール
            </h3>
          </div>
          <div className="divide-y divide-slate-200">
            {mails.map((mail) => (
              <div
                key={mail.id}
                className="p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50 transition"
              >
                <div className="mb-2 sm:mb-0">
                  <span className="inline-block bg-slate-100 text-slate-800 text-xs px-2.5 py-1 rounded-md font-semibold mb-1">
                    {mail.company}
                  </span>
                  <h4 className="text-base font-medium text-slate-800">
                    {mail.subject}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    受信日時: {mail.date}
                  </p>
                </div>
                <div>
                  <span
                    className={`inline-block text-xs font-bold px-3 py-1.5 rounded-full ${
                      mail.status === "要対応"
                        ? "bg-red-100 text-red-700"
                        : mail.status === "確認済み"
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {mail.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
