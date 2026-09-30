import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppSidebar from "../components/AppSidebar";

const EMPTY_FORM = { email: "", type: "include" };

export default function MailFilterSettings() {
  const [uid, setUid] = useState(localStorage.getItem("login_user_uid") || "");
  const [includeEmails, setIncludeEmails] = useState([]);
  const [excludeEmails, setExcludeEmails] = useState([]);
  const [draft, setDraft] = useState({ ...EMPTY_FORM });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const fetchFilters = async () => {
    const currentUid = localStorage.getItem("login_user_uid") || "";
    setUid(currentUid);
    if (!currentUid) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`http://localhost:8080/api/mail-filters?uid=${encodeURIComponent(currentUid)}`);
      if (!res.ok) {
        throw new Error("メールフィルターの取得に失敗しました");
      }
      const data = await res.json();
      setIncludeEmails(data.include_emails || []);
      setExcludeEmails(data.exclude_emails || []);
    } catch (err) {
      console.error(err);
      setMessage(err.message || "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  const addEntry = async () => {
    const email = draft.email.trim();
    if (!uid || !email) {
      setMessage("メールアドレスを入力してください");
      return;
    }

    try {
      const response = await fetch("http://localhost:8080/api/mail-filters/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: Number(uid),
          type: draft.type,
          email,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "追加に失敗しました");
      }
      setDraft({ ...EMPTY_FORM });
      setMessage("メールアドレスを追加しました");
      await fetchFilters();
    } catch (err) {
      console.error(err);
      setMessage(err.message || "追加に失敗しました");
    }
  };

  const updateEntry = async (id, type, email) => {
    try {
      const response = await fetch(`http://localhost:8080/api/mail-filters/items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: Number(uid), type, email }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "更新に失敗しました");
      }
      setMessage("更新しました");
      await fetchFilters();
    } catch (err) {
      console.error(err);
      setMessage(err.message || "更新に失敗しました");
    }
  };

  const deleteEntry = async (id) => {
    try {
      const response = await fetch(`http://localhost:8080/api/mail-filters/items/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: Number(uid) }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "削除に失敗しました");
      }
      setMessage("削除しました");
      await fetchFilters();
    } catch (err) {
      console.error(err);
      setMessage(err.message || "削除に失敗しました");
    }
  };

  const saveAllFilters = async () => {
    if (!uid) {
      setMessage("ログイン情報が見つかりません");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("http://localhost:8080/api/mail-filters", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: Number(uid),
          include_emails: includeEmails.map((entry) => entry.email).join(","),
          exclude_emails: excludeEmails.map((entry) => entry.email).join(","),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "保存に失敗しました");
      }
      setMessage("メールフィルターを保存しました");
      await fetchFilters();
    } catch (err) {
      console.error(err);
      setMessage(err.message || "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const renderEntryList = (entries, type) => (
    <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
      <div className={`p-4 border-b border-gray-100 flex justify-between items-center ${type === "include" ? "bg-orange-50/50" : "bg-gray-50"}`}>
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <i className={`${type === "include" ? "fa-solid fa-check-circle text-orange-500" : "fa-solid fa-ban text-gray-400"}`} aria-hidden="true" />
          {type === "include" ? "必ず含める" : "除外する"}
        </h3>
        <span className="text-xs font-medium bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded-md">
          {entries.length}件
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="p-8 flex flex-col items-center justify-center text-center">
          <p className="text-sm text-gray-400">まだ登録はありません</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 flex-1">
          {entries.map((entry) => (
            <div key={entry.id} className="p-4 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors group">
              <input
                value={entry.email}
                onChange={(e) => {
                  const next = entries.map((item) => item.id === entry.id ? { ...item, email: e.target.value } : item);
                  if (type === "include") setIncludeEmails(next);
                  else setExcludeEmails(next);
                }}
                aria-label={`${type === "include" ? "含める" : "除外する"}メールアドレス`}
                className="flex-1 min-w-0 bg-transparent text-sm text-gray-700 font-medium break-all border-0 p-0 outline-none focus:ring-0"
              />
              <div className="flex items-center gap-2 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => updateEntry(entry.id, type, entry.email)}
                  title="編集内容を保存"
                  aria-label="編集内容を保存"
                  className="w-8 h-8 rounded-full text-gray-400 hover:text-orange-500 hover:bg-orange-50 flex items-center justify-center transition-colors"
                >
                  <i className="fa-solid fa-pen text-sm" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteEntry(entry.id)}
                  title="削除"
                  aria-label="削除"
                  className="w-8 h-8 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"
                >
                  <i className="fa-solid fa-trash-can text-sm" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center max-w-md w-full shadow-sm">
          <i className="fa-solid fa-filter text-4xl text-orange-500 mb-3" aria-hidden="true" />
          <div className="font-semibold text-gray-900 mb-1">フィルター設定を読み込み中</div>
          <div className="text-sm text-gray-500">メールアドレス設定を確認しています...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 text-gray-800 flex min-h-screen overflow-hidden">
      <AppSidebar activePath="/mail-filters" />

      <main className="flex-1 flex flex-col min-w-0 min-h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-8 shrink-0">
          <h1 className="text-xl font-semibold text-gray-800">メールフィルター設定</h1>
          <Link to="/dashboard" className="text-sm text-orange-600 hover:text-orange-700 hover:underline font-medium flex items-center gap-1">
            <i className="fa-solid fa-arrow-left" aria-hidden="true" />
            ダッシュボードへ戻る
          </Link>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-500 flex items-center justify-center text-xl shrink-0">
                <i className="fa-solid fa-filter" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">メールフィルター設定</h2>
                <p className="text-gray-500 text-sm mt-1">送信元メールアドレスを1件ずつ管理して、メールを厳選します</p>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center">
              <select
                value={draft.type}
                onChange={(e) => {
                  setDraft({ ...draft, type: e.target.value });
                }}
                className="w-full sm:w-40 bg-gray-50 border border-gray-300 text-gray-700 text-sm rounded-xl focus:ring-orange-500 focus:border-orange-500 block p-3 outline-none transition-colors"
              >
                <option value="include">必ず含める</option>
                <option value="exclude">除外する</option>
              </select>
              <div className="relative w-full flex-1">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                  <i className="fa-regular fa-envelope" aria-hidden="true" />
                </div>
                <input
                  type="email"
                  value={draft.email}
                  onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                  placeholder="例: recruit@company.com"
                  className="bg-white border border-gray-300 text-gray-900 text-sm rounded-xl focus:ring-orange-500 focus:border-orange-500 block w-full pl-10 p-3 outline-none transition-colors"
                />
              </div>
              <button type="button" onClick={addEntry} className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 shrink-0">
                <i className="fa-solid fa-plus" aria-hidden="true" />
                追加する
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderEntryList(includeEmails, "include")}
              {renderEntryList(excludeEmails, "exclude")}
            </div>

            <div className="bg-orange-50 border border-orange-100 rounded-xl p-5 flex gap-4">
              <div className="text-orange-500 shrink-0 mt-0.5">
                <i className="fa-solid fa-circle-info" aria-hidden="true" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-orange-800 mb-2">メール一覧の表示ロジック（適用順）</h4>
                <ol className="list-decimal list-inside text-xs text-orange-700 space-y-1">
                  <li>就活キーワード（「面接」「選考」など）を含むメールを抽出</li>
                  <li><span className="font-bold">「必ず含める」</span>に登録された送信元のメールを追加</li>
                  <li>除外キーワード（「メルマガ」など）を含むメールを除外</li>
                  <li><span className="font-bold">「除外する」</span>に登録された送信元のメールを最終的に除外</li>
                </ol>
              </div>
            </div>

            {message && (
              <p className={`text-sm ${message.includes("失敗") || message.includes("入力") || message.includes("見つかり") ? "text-red-600" : "text-green-600"}`}>
                {message}
              </p>
            )}

            <div className="flex justify-end pt-1">
              <button type="button" onClick={saveAllFilters} disabled={saving} className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 px-8 rounded-xl shadow-sm transition-colors disabled:opacity-50 disabled:cursor-wait">
                {saving ? "保存中..." : "変更を保存する"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
