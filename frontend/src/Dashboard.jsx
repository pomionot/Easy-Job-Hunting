import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Link } from "react-router-dom";
import MaterialIcon from "./components/MaterialIcon";

const navItems = [
  {
    to: "/dashboard",
    label: "メインダッシュボード",
    icon: "space_dashboard",
    active: true,
  },
  { to: "/company-register", label: "企業情報登録", icon: "domain_add" },
  { to: "/company-list", label: "企業管理リスト", icon: "stacks" },
  { to: "/mail-filters", label: "メールフィルター設定", icon: "filter_alt" },
  { to: "/profile", label: "プロフィール登録", icon: "person" },
];

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
  }, []); // 👈 カレンダーのuseEffectはここで綺麗に閉じる！

  // 🔄 2. 就活メール（最新5件）を取得
  useEffect(() => {
    const userUid = localStorage.getItem("login_user_uid") || "";
    const userEmail = localStorage.getItem("login_user_email") || "";
    const userQuery = userUid
      ? `?uid=${encodeURIComponent(userUid)}`
      : userEmail
        ? `?email=${encodeURIComponent(userEmail)}`
        : "";

    fetch(`http://localhost:8080/api/fetch-mails${userQuery}`)
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
        if (!Array.isArray(data)) {
          throw new Error(data?.error || "メールデータの形式が不正です");
        }
        // ダッシュボード用なので、最新の5件だけを切り出して表示する
        setMails(data.slice(0, 5));
        setLoadingMails(false);
      })
      .catch((err) => {
        console.error(err);
        setErrorMail(err.message || "メールの取得中にエラーが発生しました");
        setLoadingMails(false);
      });
  }, []); // 👈 メール専用のuseEffectとして独立させる！

  const handleEventClick = (info) => {
    setSelectedEvent(info.event.extendedProps);
  };

  return (
    <div className="min-h-screen bg-transparent flex app-shell">
      <aside className="hidden md:flex w-72 flex-col gap-6 p-6 border-r border-slate-200/80 bg-slate-950/95 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-11 w-11 rounded-2xl bg-blue-500/15 flex items-center justify-center">
              <MaterialIcon
                name="work_outline"
                className="text-[24px] text-blue-200"
              />
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight">
                Easy Job Hunting
              </div>
              <div className="text-xs text-slate-300">
                就活管理ダッシュボード
              </div>
            </div>
          </div>
          <p className="text-sm text-slate-300 leading-6">
            メール、選考予定、企業メモをまとめて見渡せるようにした管理画面です。
          </p>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`app-nav-link flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium ${item.active ? "bg-blue-500 text-white shadow-lg shadow-blue-950/20" : "bg-white/5 text-slate-200 hover:bg-white/10"}`}
            >
              <MaterialIcon
                name={item.icon}
                className={`text-[20px] ${item.active ? "text-white" : "text-blue-200"}`}
              />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <header className="section-card glass-panel px-5 py-4 sm:px-6 sm:py-5 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-left">
          <div>
            <div className="chip mb-2 w-fit">
              <MaterialIcon name="calendar_month" className="text-[18px]" />
              就活管理ダッシュボード
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1">
              今日の就活状況をまとめて確認
            </h1>
            <p className="text-sm text-slate-600">
              メールと予定を同じ画面で追えるように整理しています。
            </p>
          </div>
          <span className="chip text-sm">
            <MaterialIcon name="person" className="text-[18px]" />
            ようこそ、ユーザーさん
          </span>
        </header>

        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-6">
          <div className="section-card glass-panel p-6 text-left">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                <MaterialIcon name="mail" className="text-[24px]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  就活メールチェッカー
                </h3>
                <p className="text-sm text-slate-500">
                  重要メールだけを拾って表示します
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-7">
              AIフィルターがメルマガを自動で弾き、面接や選考に関する重要なメールだけを厳選して表示します。
            </p>
            <Link
              to="/mails"
              className="app-button app-button-primary inline-flex items-center gap-2 rounded-2xl px-4 py-3 mt-5 text-sm font-semibold"
            >
              <MaterialIcon
                name="arrow_forward"
                className="text-[20px] text-white"
              />
              メール一覧を見る
            </Link>
          </div>

          <div className="section-card glass-panel p-5 text-left">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <MaterialIcon name="event_note" className="text-[20px]" />
              選考の見通し
            </h3>
            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              {[
                ["mail", "重要メール", "最新5件を表示"],
                ["schedule", "日程管理", "面接予定を確認"],
                ["database", "企業情報", "登録済み企業を一覧化"],
              ].map(([icon, title, desc]) => (
                <div
                  key={title}
                  className="rounded-2xl border border-slate-200/70 bg-white/70 p-4"
                >
                  <MaterialIcon name={icon} className="text-[22px] mb-2" />
                  <div className="font-semibold text-slate-900">{title}</div>
                  <div className="text-slate-500 text-xs mt-1 leading-5">
                    {desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-8 mt-8">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 text-left">
            <MaterialIcon name="calendar_month" className="text-[20px]" />
            選考カレンダー
          </h2>
          {loadingCalendar ? (
            <div className="section-card p-12 text-slate-500">
              カレンダーを読み込み中です...
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-3 section-card p-4 sm:p-6 overflow-hidden">
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

              <div className="section-card p-6 h-fit text-left">
                <h3 className="font-bold text-slate-800 text-base mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                  <MaterialIcon name="info" className="text-[18px]" />
                  選考の詳細
                </h3>
                {selectedEvent ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                      <span className="inline-flex items-center gap-1 bg-blue-600 text-white text-xs px-2.5 py-1 rounded-full font-semibold mb-2">
                        <MaterialIcon
                          name="apartment"
                          className="text-[16px] text-white"
                        />
                        {selectedEvent.company}
                      </span>
                      <h4 className="font-bold text-slate-800 text-sm mb-1 flex items-center gap-2">
                        <MaterialIcon
                          name="assignment_ind"
                          className="text-[18px]"
                        />
                        {selectedEvent.jobTitle}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium mt-2 flex items-center gap-2">
                        <MaterialIcon name="event" className="text-[16px]" />
                        日付: {selectedEvent.dateStr.replace(/-/g, "/")}
                      </p>
                      <p className="text-xs text-slate-500 font-medium flex items-center gap-2">
                        <MaterialIcon name="schedule" className="text-[16px]" />
                        時間: {selectedEvent.timeStr}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedEvent(null)}
                      className="app-button w-full py-2.5 text-xs bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition border border-slate-200"
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
        <div className="text-left">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <MaterialIcon name="mark_email_unread" className="text-[20px]" />
            自動検知された就活メール（最新5件）
          </h2>

          {loadingMails ? (
            <div className="section-card p-12 text-slate-500 text-center">
              Gmailから就活メールをスキャンしています...
            </div>
          ) : errorMail ? (
            <div className="p-6 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-sm section-card">
              <MaterialIcon
                name="error"
                className="text-[18px] text-red-600 mr-2"
              />
              {errorMail}
            </div>
          ) : (
            <div className="section-card overflow-hidden">
              <div className="divide-y divide-slate-200">
                {mails.length > 0 ? (
                  mails.map((mail) => (
                    <div
                      key={mail.id}
                      className="p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50/80 transition text-left"
                    >
                      <div className="mb-2 sm:mb-0">
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full font-semibold mb-1">
                          <MaterialIcon
                            name="mail"
                            className="text-[16px] text-blue-600"
                          />
                          {mail.from}
                        </span>
                        <h4 className="text-base font-semibold text-slate-800 mt-1 flex items-center gap-2">
                          <MaterialIcon
                            name="subject"
                            className="text-[18px]"
                          />
                          {mail.subject}
                        </h4>
                        <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-2">
                          <MaterialIcon
                            name="schedule"
                            className="text-[16px]"
                          />
                          受信日時: {mail.date}
                        </p>
                      </div>
                      <div>
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-amber-100 text-amber-800">
                          <MaterialIcon
                            name="bolt"
                            className="text-[16px] text-amber-700"
                          />
                          自動解析済
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-500">
                    重要な就活メールは現在ありません。
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
