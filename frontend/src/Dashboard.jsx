import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Link } from "react-router-dom";
import AppSidebar from "./components/AppSidebar";

export default function Dashboard() {
  const [events, setEvents] = useState([]);
  const [mails, setMails] = useState([]);
  const [roadmaps, setRoadmaps] = useState([]);
  const [loadingCalendar, setLoadingCalendar] = useState(true);
  const [loadingMails, setLoadingMails] = useState(true);
  const [loadingRoadmaps, setLoadingRoadmaps] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [errorMail, setErrorMail] = useState("");
  const [calendarVersion, setCalendarVersion] = useState(0);
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [eventForm, setEventForm] = useState({
    id: null,
    company: "",
    title: "",
    date: "",
    start_time: "",
    end_time: "",
    description: "",
  });

  useEffect(() => {
    const userUid = localStorage.getItem("login_user_uid") || "";
    const userEmail = localStorage.getItem("login_user_email") || "";
    const userQuery = userUid
      ? `?uid=${encodeURIComponent(userUid)}`
      : userEmail
        ? `?email=${encodeURIComponent(userEmail)}`
        : "";

    fetch(`http://localhost:8080/api/events${userQuery}`)
      .then((res) => {
        if (!res.ok) throw new Error("カレンダーデータの取得に失敗しました");
        return res.json();
      })
      .then((data) => {
        const formattedEvents = data.map((event) => {
          const times = event.time.split(" - ");
          const date = event.date.slice(0, 10);
          return {
            id: event.id,
            title: `${event.company} | ${event.title}`,
            start: `${date}T${times[0]}:00`,
            end: `${date}T${times[1]}:00`,
            extendedProps: {
              id: event.id,
              company: event.company,
              jobTitle: event.title,
              timeStr: event.time,
              dateStr: date,
              description: event.description || "",
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
  }, [calendarVersion]);

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
        setMails(data.slice(0, 5));
        setLoadingMails(false);
      })
      .catch((err) => {
        console.error(err);
        setErrorMail(err.message || "メールの取得中にエラーが発生しました");
        setLoadingMails(false);
      });
  }, []);

  useEffect(() => {
    const userUid = localStorage.getItem("login_user_uid") || "";
    const userEmail = localStorage.getItem("login_user_email") || "";
    const userQuery = userUid
      ? `?uid=${encodeURIComponent(userUid)}`
      : userEmail
        ? `?email=${encodeURIComponent(userEmail)}`
        : "";

    fetch(`http://localhost:8080/api/roadmaps/summary${userQuery}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setRoadmaps(Array.isArray(data) ? data : []);
        setLoadingRoadmaps(false);
      })
      .catch((err) => {
        console.error("ロードマップ取得エラー:", err);
        setLoadingRoadmaps(false);
      });
  }, []);

  const handleEventClick = (info) => {
    setSelectedEvent(info.event.extendedProps);
  };

  const openNewEventForm = (date = "") => {
    setEventForm({
      id: null,
      company: "",
      title: "",
      date: date.slice(0, 10),
      start_time: "",
      end_time: "",
      description: "",
    });
    setEventFormOpen(true);
  };

  const openEditEventForm = () => {
    setEventForm({
      id: selectedEvent.id,
      company: selectedEvent.company,
      title: selectedEvent.jobTitle,
      date: selectedEvent.dateStr,
      start_time: selectedEvent.timeStr.split(" - ")[0],
      end_time: selectedEvent.timeStr.split(" - ")[1],
      description: selectedEvent.description || "",
    });
    setEventFormOpen(true);
  };

  const getEventQuery = () => {
    const uid = localStorage.getItem("login_user_uid") || "";
    const email = localStorage.getItem("login_user_email") || "";
    return uid ? `?uid=${encodeURIComponent(uid)}` : email ? `?email=${encodeURIComponent(email)}` : "";
  };

  const saveEvent = async (event) => {
    const method = event.id ? "PUT" : "POST";
    const url = `http://localhost:8080/api/events${event.id ? `/${event.id}` : ""}${getEventQuery()}`;
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...event, description: event.description }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "イベントの保存に失敗しました");
    setEventFormOpen(false);
    setSelectedEvent(null);
    setCalendarVersion((version) => version + 1);
  };

  const deleteSelectedEvent = async () => {
    if (!window.confirm("この予定を削除しますか？")) return;
    try {
      const response = await fetch(
        `http://localhost:8080/api/events/${selectedEvent.id}${getEventQuery()}`,
        { method: "DELETE" },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "イベントの削除に失敗しました");
      setSelectedEvent(null);
      setCalendarVersion((version) => version + 1);
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="bg-gray-50 text-gray-800 font-sans flex h-screen overflow-hidden">
      <AppSidebar activePath="/dashboard" />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0">
          <h1 className="text-xl font-semibold text-gray-800">ダッシュボード</h1>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 hidden sm:inline-block">
              今日もお疲れ様です！一つずつ進めていきましょう🍊
            </span>
            <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold border border-orange-200">
              S
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <i className="fa-solid fa-thumbtack text-orange-500"></i>
                進行中の選考ロードマップ
              </h2>
              <Link to="/roadmap" className="text-sm text-orange-600 hover:underline font-medium">
                すべて見る
              </Link>
            </div>

            {loadingRoadmaps ? (
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-sm text-gray-500">
                ロードマップ状況を読み込み中...
              </div>
            ) : roadmaps.length === 0 ? (
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-sm text-gray-600">
                登録企業やロードマップがまだありません。企業を登録して進行状況を管理しましょう。
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {roadmaps.slice(0, 3).map((item) => (
                  <div
                    key={item.company_id}
                    className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
                  >
                    <div
                      className={`absolute top-0 left-0 w-1 h-full ${
                        item.progress_rate >= 50 ? "bg-orange-500" : "bg-blue-500"
                      }`}
                    ></div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded-md mb-2 inline-block ${
                            item.progress_rate >= 50
                              ? "text-orange-600 bg-orange-50"
                              : "text-blue-600 bg-blue-50"
                          }`}
                        >
                          {item.company_status || "選考中"}
                        </span>
                        <h3 className="font-bold text-gray-800">{item.company_name}</h3>
                      </div>
                      <span className="text-xs text-gray-400">進捗 {item.progress_rate || 0}%</span>
                    </div>

                    <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4">
                      <div
                        className={`h-1.5 rounded-full ${
                          item.progress_rate >= 50 ? "bg-orange-500" : "bg-blue-500"
                        }`}
                        style={{ width: `${item.progress_rate || 0}%` }}
                      ></div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">次に行うべきこと⚡</p>
                      <p className="text-sm font-medium text-gray-800">
                        {item.next_action || "次のアクションを準備しましょう"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <section className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <i className="fa-regular fa-calendar text-orange-500"></i>
                  選考カレンダー
                </h2>
                <button
                  type="button"
                  onClick={() => openNewEventForm()}
                  className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                >
                  <i className="fa-solid fa-plus"></i>
                  予定を追加
                </button>
              </div>

              {loadingCalendar ? (
                <div className="flex-1 border border-gray-100 rounded-xl bg-gray-50 p-6 text-sm text-gray-500">
                  カレンダーを読み込み中です...
                </div>
              ) : (
                <>
                  <div className="flex-1 border border-gray-100 rounded-xl overflow-hidden flex flex-col min-h-[400px]">
                    <FullCalendar
                      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                      initialView="dayGridMonth"
                      locale="ja"
                      events={events}
                      eventClick={handleEventClick}
                      dateClick={(info) => openNewEventForm(info.dateStr)}
                      headerToolbar={{
                        left: "prev,next today",
                        center: "title",
                        right: "dayGridMonth,timeGridWeek",
                      }}
                      buttonText={{ today: "今日", month: "月", week: "週" }}
                      height="auto"
                      eventColor="#f97316"
                      eventTextColor="#ffffff"
                    />
                  </div>

                  <div className="mt-4 border-t border-gray-100 pt-4">
                    {selectedEvent ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-orange-600 mb-1">選考予定の詳細</p>
                            <h3 className="text-base font-bold text-gray-800">{selectedEvent.company}</h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedEvent(null)}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            閉じる
                          </button>
                        </div>
                        <div className="rounded-xl bg-orange-50 border border-orange-100 p-3 text-sm text-gray-700">
                          <div className="font-semibold mb-1">{selectedEvent.jobTitle}</div>
                          <div>日付: {selectedEvent.dateStr.replace(/-/g, "/")}</div>
                          <div>時間: {selectedEvent.timeStr}</div>
                          {selectedEvent.description && <div className="mt-2">メモ: {selectedEvent.description}</div>}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={openEditEventForm}
                            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg text-sm font-medium"
                          >
                            編集
                          </button>
                          <button
                            type="button"
                            onClick={deleteSelectedEvent}
                            className="flex-1 bg-red-50 text-red-700 hover:bg-red-100 px-3 py-2 rounded-lg text-sm font-medium"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">カレンダーの予定をクリックすると詳細が表示されます。</p>
                    )}
                  </div>
                </>
              )}
            </section>

            <section className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <i className="fa-solid fa-inbox text-orange-500"></i>
                  最新の就活メール
                </h2>
                <Link to="/mails" className="text-sm text-orange-600 hover:underline font-medium">
                  すべて見る
                </Link>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {loadingMails ? (
                  <div className="text-sm text-gray-500">Gmailから就活メールをスキャンしています...</div>
                ) : errorMail ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                    {errorMail}
                  </div>
                ) : mails.length > 0 ? (
                  mails.map((mail) => (
                    <div
                      key={mail.id}
                      className="group border border-gray-100 rounded-xl p-4 hover:border-orange-300 hover:bg-orange-50/30 transition-all cursor-pointer bg-white"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold text-gray-800 truncate pr-2">
                          {mail.from}
                        </span>
                        <span className="text-xs text-gray-400 whitespace-nowrap">{mail.date}</span>
                      </div>
                      <h3 className="text-sm font-bold text-gray-800 mb-2 line-clamp-1">
                        {mail.subject}
                      </h3>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex gap-2">
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded">就活</span>
                        </div>
                        <button
                          type="button"
                          className="text-xs text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1"
                        >
                          <i className="fa-solid fa-wand-magic-sparkles"></i>
                          予定を抽出
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">
                    重要な就活メールは現在ありません。
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

      {eventFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              saveEvent(eventForm).catch((error) => alert(error.message));
            }}
            className="bg-white w-full max-w-lg space-y-4 p-6 rounded-2xl shadow-xl border border-gray-100 text-left"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">{eventForm.id ? "予定を編集" : "予定を作成"}</h2>
              <button type="button" onClick={() => setEventFormOpen(false)} className="text-gray-500">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {[
              ["company", "企業名", "text"],
              ["title", "イベント名", "text"],
              ["date", "開催日", "date"],
              ["start_time", "開始時刻", "time"],
              ["end_time", "終了時刻", "time"],
            ].map(([field, label, type]) => (
              <label key={field} className="block text-sm font-semibold text-gray-700">
                {label}
                <input
                  required
                  value={eventForm[field]}
                  type={type}
                  onChange={(e) => setEventForm({ ...eventForm, [field]: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 font-normal text-gray-800"
                />
              </label>
            ))}

            <label className="block text-sm font-semibold text-gray-700">
              メモ
              <textarea
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                className="mt-1 min-h-[120px] w-full rounded-xl border border-gray-200 bg-white px-3 py-2 font-normal text-gray-800"
              />
            </label>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEventFormOpen(false)}
                className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="rounded-xl bg-orange-500 hover:bg-orange-600 px-4 py-2 text-sm font-semibold text-white"
              >
                保存
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
