import React, { useState } from "react";
import MaterialIcon from "./MaterialIcon";

export default function EventExtractModal({ mail, isOpen, onClose, onSave }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    company: "",
    title: "",
    date: "",
    start_time: "",
    end_time: "",
    notes: "",
  });

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
      console.log("🔍 イベント抽出レスポンス:", data);

      if (!response.ok) {
        console.error("❌ APIエラー:", data);
        alert(`エラー: ${data.error || "不明なエラーが発生しました"}\n\n詳細: ${data.details || ""}`);
        setEvents([]);
        return;
      }

      if (data.has_event && data.events && data.events.length > 0) {
        console.log(`✅ ${data.events.length}件のイベントを抽出しました`);
        setEvents(data.events);
      } else {
        console.warn("⚠️ イベント情報なし:", data);
        alert("このメール内容からイベント情報を抽出できませんでした。\n\n以下の情報が必要です：\n• 開催日（年月日）\n• 開催時刻\n• イベント種別（面接、説明会など）");
        setEvents([]);
      }
    } catch (error) {
      console.error("❌ 通信エラー:", error);
      alert(`通信エラーが発生しました: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditEvent = (index) => {
    const event = events[index];
    setFormData({
      company: event.company,
      title: event.title,
      date: event.date,
      start_time: event.start_time,
      end_time: event.end_time,
      notes: event.notes || "",
    });
    setEditing(index);
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveEdit = () => {
    if (editing !== null) {
      const updatedEvents = [...events];
      updatedEvents[editing] = {
        ...updatedEvents[editing],
        ...formData,
      };
      setEvents(updatedEvents);
      setEditing(null);
      setFormData({
        company: "",
        title: "",
        date: "",
        start_time: "",
        end_time: "",
        notes: "",
      });
    }
  };

  const handleDeleteEvent = (index) => {
    setEvents((prev) => prev.filter((_, i) => i !== index));
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
          savedCount++;
        } else {
          const data = await response.json().catch(() => ({}));
          errors.push(data.error || `HTTP ${response.status}`);
        }
      } catch (error) {
        console.error("Error saving event:", error);
        errors.push(error.message);
      }
    }

    if (onSave) {
      onSave(savedCount);
    }

    if (savedCount > 0) {
      alert(`${savedCount}件のイベントがカレンダーに登録されました！`);
      onClose();
    } else {
      alert(`イベントを登録できませんでした。\n\n${errors.join("\n") || "ログイン状態を確認してください。"}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl">
        {/* ヘッダー */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MaterialIcon name="event" className="text-[28px]" />
            <div>
              <h2 className="text-xl font-bold">イベント自動抽出</h2>
              <p className="text-sm text-blue-100">
                メール本文からカレンダー予定を自動抽出します
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition"
          >
            <MaterialIcon name="close" className="text-[24px]" />
          </button>
        </div>

        <div className="p-6">
          {/* メール情報表示 */}
          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <MaterialIcon name="mail" className="text-[20px] text-slate-600 mt-1" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 truncate">
                  {mail?.subject}
                </p>
                <p className="text-sm text-slate-600">
                  From: {mail?.from?.split("<")[0]?.trim()}
                </p>
              </div>
            </div>
          </div>

          {/* 抽出ボタン */}
          {events.length === 0 ? (
            <div className="text-center py-8">
              <MaterialIcon
                name="auto_stories"
                className="text-[56px] text-slate-300 mx-auto mb-3"
              />
              <p className="text-slate-600 mb-4">
                メール本文を分析してカレンダー予定を抽出します
              </p>
              <button
                onClick={extractEvent}
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="inline-block animate-spin">⌛</span>
                    抽出中...
                  </>
                ) : (
                  <>
                    <MaterialIcon name="search" className="text-[20px]" />
                    イベントを抽出
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 抽出されたイベント一覧 */}
              {events.map((event, index) => (
                <div
                  key={index}
                  className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  {editing === index ? (
                    // 編集フォーム
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1">
                            企業名
                          </label>
                          <input
                            type="text"
                            value={formData.company}
                            onChange={(e) =>
                              handleFormChange("company", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1">
                            イベント種別
                          </label>
                          <input
                            type="text"
                            value={formData.title}
                            onChange={(e) =>
                              handleFormChange("title", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1">
                            日付
                          </label>
                          <input
                            type="date"
                            value={formData.date}
                            onChange={(e) =>
                              handleFormChange("date", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1">
                            開始時刻
                          </label>
                          <input
                            type="time"
                            value={formData.start_time}
                            onChange={(e) =>
                              handleFormChange("start_time", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1">
                            終了時刻
                          </label>
                          <input
                            type="time"
                            value={formData.end_time}
                            onChange={(e) =>
                              handleFormChange("end_time", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                          備考
                        </label>
                        <textarea
                          value={formData.notes}
                          onChange={(e) =>
                            handleFormChange("notes", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveEdit}
                          className="flex-1 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition inline-flex items-center justify-center gap-2"
                        >
                          <MaterialIcon name="check" className="text-[18px]" />
                          保存
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          className="flex-1 px-4 py-2 bg-slate-300 text-slate-900 font-semibold rounded-lg hover:bg-slate-400 transition inline-flex items-center justify-center gap-2"
                        >
                          <MaterialIcon name="close" className="text-[18px]" />
                          キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    // 表示モード
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-900">
                            {event.company}
                          </h4>
                          <p className="text-sm text-slate-600">{event.title}</p>
                        </div>
                        {event.confidence && (
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded font-semibold">
                            信頼度 {(event.confidence * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 text-sm text-slate-600 mb-3">
                        <div className="flex items-center gap-2">
                          <MaterialIcon name="calendar_today" className="text-[16px]" />
                          <span>{event.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MaterialIcon name="schedule" className="text-[16px]" />
                          <span>
                            {event.start_time} 〜 {event.end_time}
                          </span>
                        </div>
                        {event.notes && (
                          <div className="flex gap-2">
                            <MaterialIcon name="note" className="text-[16px]" />
                            <span className="flex-1">{event.notes}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditEvent(index)}
                          className="flex-1 px-3 py-2 bg-slate-100 text-slate-900 font-semibold rounded-lg hover:bg-slate-200 transition inline-flex items-center justify-center gap-2 text-sm"
                        >
                          <MaterialIcon name="edit" className="text-[16px]" />
                          編集
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(index)}
                          className="px-3 py-2 bg-red-50 text-red-600 font-semibold rounded-lg hover:bg-red-100 transition inline-flex items-center gap-2"
                        >
                          <MaterialIcon name="delete" className="text-[16px]" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* 別のメールから抽出ボタン */}
              <button
                onClick={() => {
                  setEvents([]);
                  setEditing(null);
                }}
                className="w-full px-4 py-2 border-2 border-dashed border-slate-300 text-slate-600 font-semibold rounded-lg hover:bg-slate-50 transition inline-flex items-center justify-center gap-2"
              >
                <MaterialIcon name="add" className="text-[20px]" />
                もう一度抽出
              </button>
            </div>
          )}
        </div>

        {/* フッター */}
        {events.length > 0 && (
          <div className="sticky bottom-0 bg-slate-100 border-t border-slate-200 p-6 flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-300 text-slate-900 font-semibold rounded-lg hover:bg-slate-400 transition"
            >
              キャンセル
            </button>
            <button
              onClick={handleSaveAll}
              className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition inline-flex items-center gap-2"
            >
              <MaterialIcon name="check_circle" className="text-[20px]" />
              カレンダーに登録（{events.length}件）
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
