import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MaterialIcon from "../components/MaterialIcon";

const EMPTY_FORM = { email: "", type: "include" };

export default function MailFilterSettings() {
  const [uid, setUid] = useState(localStorage.getItem("login_user_uid") || "");
  const [includeEmails, setIncludeEmails] = useState([]);
  const [excludeEmails, setExcludeEmails] = useState([]);
  const [draft, setDraft] = useState({ ...EMPTY_FORM });
  const [addingType, setAddingType] = useState("include");
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
      setAddingType("include");
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

  const renderEntryList = (entries, type) => (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-3">
      <div className="flex items-center justify-between gap-2 mb-3">
        <strong className="text-sm font-bold text-slate-800">
          {type === "include" ? "必ず含める" : "除外する"}
        </strong>
        <button
          type="button"
          onClick={() => {
            setAddingType(type);
            setDraft({ email: "", type });
          }}
          className="inline-flex items-center gap-1 rounded-full bg-blue-600 text-white px-2.5 py-1.5 text-xs font-semibold"
        >
          <MaterialIcon name="add" className="text-[16px]" />
          追加
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="text-xs text-slate-500">まだ登録はありません</div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
              <input
                value={entry.email}
                onChange={(e) => {
                  const next = entries.map((item) => item.id === entry.id ? { ...item, email: e.target.value } : item);
                  if (type === "include") setIncludeEmails(next);
                  else setExcludeEmails(next);
                }}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-200"
              />
              <button
                type="button"
                onClick={() => updateEntry(entry.id, type, entry.email)}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold"
              >
                保存
              </button>
              <button
                type="button"
                onClick={() => deleteEntry(entry.id)}
                className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold"
              >
                削除
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen soft-grid flex items-center justify-center p-6">
        <div className="section-card glass-panel p-8 text-center max-w-md w-full">
          <MaterialIcon name="filter_alt" className="text-[36px] mb-3" />
          <div className="font-semibold text-slate-900 mb-1">フィルター設定を読み込み中</div>
          <div className="text-sm text-slate-500">メールアドレス設定を確認しています...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen soft-grid p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl w-full section-card glass-panel p-6 sm:p-8 text-left">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center">
              <MaterialIcon name="filter_alt" className="text-[24px] text-blue-700" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 m-0">メールフィルター設定</h2>
              <p className="text-sm text-slate-500 mt-1">送信元メールアドレスを1件ずつ管理して、メールを厳選します</p>
            </div>
          </div>
          <Link to="/dashboard" className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1">
            <MaterialIcon name="arrow_back" className="text-[16px]" />
            ダッシュボードへ戻る
          </Link>
        </div>

        {(addingType || draft.email) && (
          <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50/60 p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value })}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                <option value="include">必ず含める</option>
                <option value="exclude">除外する</option>
              </select>
              <input
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                placeholder="例: recruit@company.com"
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-200"
              />
              <button
                type="button"
                onClick={addEntry}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
              >
                <MaterialIcon name="add" className="text-[18px]" />
                追加する
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          {renderEntryList(includeEmails, "include")}
          {renderEntryList(excludeEmails, "exclude")}
        </div>

        <div className="mt-6 text-sm text-slate-600">
          {message && <span className={message.includes("失敗") || message.includes("入力") ? "text-rose-700" : "text-emerald-700"}>{message}</span>}
        </div>
      </div>
    </div>
  );
}
