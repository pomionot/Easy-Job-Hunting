import React, { useEffect, useState } from "react";

export default function EventExtractModal({ mail, isOpen, onClose, onSave }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEvents([]);
      setLoading(false);
    }
  }, [isOpen, mail?.id]);

  const extractEvent = async () => {
    if (!mail || !mail.body) {
      alert("メール本文がありません");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:8080/api/extract-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mail_id: mail.id,
          subject: mail.subject,
          body: mail.body,
          from: mail.from,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        alert(`エラー: ${data.error || "不明なエラーが発生しました"}\n\n詳細: ${data.details || ""}`);
        setEvents([]);
        return;
      }

      if (data.has_event && data.events?.length > 0) {
        setEvents(data.events);
      } else {
        alert("このメール内容からイベント情報を抽出できませんでした。\n\n開催日、開催時刻、イベント種別が必要です。");
        setEvents([]);
      }
    } catch (error) {
      console.error("イベント抽出エラー:", error);
      alert(`通信エラーが発生しました: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEventFieldChange = (index, field, value) => {
    setEvents((previousEvents) =>
      previousEvents.map((event, eventIndex) =>
        eventIndex === index ? { ...event, [field]: value } : event,
      ),
    );
  };

  const handleDeleteEvent = (index) => {
    setEvents((previousEvents) => previousEvents.filter((_, eventIndex) => eventIndex !== index));
  };

  const handleSaveAll = async () => {
    const userUid = localStorage.getItem("login_user_uid") || "";
    const userEmail = localStorage.getItem("login_user_email") || "";
    const userQuery = userUid
      ? `?uid=${encodeURIComponent(userUid)}`
      : userEmail
        ? `?email=${encodeURIComponent(userEmail)}`
        : "";

    let savedCount = 0;
    const errors = [];
    for (const event of events) {
      try {
        const response = await fetch(`http://localhost:8080/api/events${userQuery}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company: event.company,
            title: event.title,
            date: event.date,
            start_time: event.start_time,
            end_time: event.end_time,
            description: event.notes,
            created_from_mail_id: mail.id,
          }),
        });

        if (response.ok) {
          savedCount += 1;
        } else {
          const data = await response.json().catch(() => ({}));
          errors.push(data.error || `HTTP ${response.status}`);
        }
      } catch (error) {
        console.error("イベント保存エラー:", error);
        errors.push(error.message);
      }
    }

    onSave?.(savedCount);
    if (savedCount > 0) {
      alert(`${savedCount}件のイベントがカレンダーに登録されました！`);
      setEvents([]);
      onClose();
    } else {
      alert(`イベントを登録できませんでした。\n\n${errors.join("\n") || "ログイン状態を確認してください。"}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-orange-500 text-white px-6 py-5 flex items-start justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <i className="fa-regular fa-calendar-check text-3xl shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <h2 className="text-xl font-bold tracking-wider">イベント自動抽出</h2>
              <p className="text-orange-100 text-xs mt-1">
                メール本文からカレンダー予定を自動抽出しました。内容を確認・編集してください。
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="モーダルを閉じる"
            className="text-white hover:text-orange-200 hover:bg-orange-600 rounded-full w-8 h-8 flex items-center justify-center transition-colors shrink-0"
          >
            <i className="fa-solid fa-xmark text-xl" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6 shadow-sm">
            <div className="flex items-start gap-3 mb-3">
              <i className="fa-regular fa-envelope text-gray-400 mt-1" aria-hidden="true" />
              <div className="min-w-0">
                <h3 className="font-bold text-gray-800 text-sm md:text-base truncate">{mail?.subject}</h3>
                <p className="text-sm text-gray-500 mt-1">From: {mail?.from?.split("<")[0]?.trim()}</p>
              </div>
            </div>
            <details className="group mt-2">
              <summary className="text-xs font-medium text-orange-600 cursor-pointer hover:text-orange-700 flex items-center gap-1 select-none">
                <i className="fa-solid fa-chevron-right transition-transform group-open:rotate-90" aria-hidden="true" />
                元のメール本文を確認する
              </summary>
              <div className="mt-3 p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs text-gray-600 max-h-32 overflow-y-auto whitespace-pre-wrap font-mono leading-relaxed">
                {mail?.body || "本文がありません"}
              </div>
            </details>
          </div>

          {events.length === 0 ? (
            <div className="text-center py-10">
              <i className="fa-solid fa-wand-magic-sparkles text-5xl text-orange-300 mb-4" aria-hidden="true" />
              <p className="text-gray-600 mb-4">メール本文を分析してカレンダー予定を抽出します</p>
              <button
                type="button"
                onClick={extractEvent}
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <i className="fa-solid fa-spinner animate-spin" aria-hidden="true" />
                    抽出中...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" />
                    イベントを抽出
                  </>
                )}
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <i className="fa-solid fa-wand-magic-sparkles text-orange-500" aria-hidden="true" />
                  AIが抽出した予定 ({events.length}件)
                </h3>
              </div>

              {events.map((event, index) => (
                <div key={index} className="bg-white border-2 border-orange-100 rounded-2xl p-5 mb-4 shadow-sm relative transition-all hover:border-orange-300">
                  <button
                    type="button"
                    onClick={() => handleDeleteEvent(index)}
                    title="この予定を削除"
                    aria-label={`${event.title || "予定"}を削除`}
                    className="absolute top-4 right-4 text-gray-400 hover:text-red-500 hover:bg-red-50 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                  >
                    <i className="fa-solid fa-trash-can" aria-hidden="true" />
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-2">
                    {[
                      ["company", "企業名", "text", `event-company-${index}`],
                      ["title", "イベントタイトル", "text", `event-title-${index}`],
                      ["date", "日付", "date", `event-date-${index}`],
                    ].map(([field, label, type, id]) => (
                      <div key={field} className="space-y-1">
                        <label className="text-xs font-bold text-gray-600" htmlFor={id}>{label}</label>
                        <input
                          id={id}
                          type={type}
                          value={event[field] || ""}
                          onChange={(e) => handleEventFieldChange(index, field, e.target.value)}
                          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                        />
                      </div>
                    ))}

                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ["start_time", "開始時刻", `event-start-${index}`],
                        ["end_time", "終了時刻", `event-end-${index}`],
                      ].map(([field, label, id]) => (
                        <div key={field} className="space-y-1">
                          <label className="text-xs font-bold text-gray-600" htmlFor={id}>{label}</label>
                          <input
                            id={id}
                            type="time"
                            value={event[field] || ""}
                            onChange={(e) => handleEventFieldChange(index, field, e.target.value)}
                            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="col-span-1 md:col-span-2 space-y-1">
                      <label className="text-xs font-bold text-gray-600" htmlFor={`event-notes-${index}`}>メモ</label>
                      <textarea
                        id={`event-notes-${index}`}
                        rows="2"
                        value={event.notes || ""}
                        onChange={(e) => handleEventFieldChange(index, "notes", e.target.value)}
                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="p-5 border-t border-gray-200 bg-white flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            キャンセル
          </button>
          {events.length > 0 && (
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-6 py-2.5 text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              <i className="fa-regular fa-calendar-check" aria-hidden="true" />
              表示中の予定をすべて登録
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
