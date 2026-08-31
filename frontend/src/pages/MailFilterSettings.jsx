import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MaterialIcon from "../components/MaterialIcon";

export default function MailFilterSettings() {
  const [uid, setUid] = useState(localStorage.getItem("login_user_uid") || "");
  const [includeEmails, setIncludeEmails] = useState("");
  const [excludeEmails, setExcludeEmails] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const currentUid = localStorage.getItem("login_user_uid") || "";
    setUid(currentUid);
    if (!currentUid) {
      setLoading(false);
      return;
    }

    fetch(`http://localhost:8080/api/mail-filters?uid=${encodeURIComponent(currentUid)}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("メールフィルターの取得に失敗しました");
        }
        return res.json();
      })
      .then((data) => {
        setIncludeEmails(data.include_emails || "");
        setExcludeEmails(data.exclude_emails || "");
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!uid) {
      setMessage("ログイン情報が見つかりません。再ログインしてください。")
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("http://localhost:8080/api/mail-filters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: Number(uid),
          include_emails: includeEmails,
          exclude_emails: excludeEmails,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "保存に失敗しました");
      }

      setMessage("メールフィルターを保存しました。");
    } catch (err) {
      console.error(err);
      setMessage(err.message || "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

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
              <p className="text-sm text-slate-500 mt-1">必ず含めるメールアドレスと除外するメールアドレスを管理</p>
            </div>
          </div>
          <Link to="/dashboard" className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1">
            <MaterialIcon name="arrow_back" className="text-[16px]" />
            ダッシュボードへ戻る
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
            <div className="flex items-center gap-2 mb-3">
              <MaterialIcon name="check_circle" className="text-[20px] text-emerald-700" />
              <h3 className="text-base font-bold text-slate-900 m-0">必ず含めるメールアドレス</h3>
            </div>
            <textarea
              value={includeEmails}
              onChange={(e) => setIncludeEmails(e.target.value)}
              placeholder="例: recruit@company.com, hr@startup.jp"
              className="w-full min-h-[180px] rounded-xl border border-emerald-200 bg-white p-3 text-sm text-slate-700 resize-none outline-none focus:ring-2 focus:ring-emerald-200"
            />
            <p className="text-xs text-slate-500 mt-2">カンマ区切りで複数入力できます。これらの送信元メールを優先的に拾います。</p>
          </div>

          <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
            <div className="flex items-center gap-2 mb-3">
              <MaterialIcon name="block" className="text-[20px] text-rose-700" />
              <h3 className="text-base font-bold text-slate-900 m-0">除外するメールアドレス</h3>
            </div>
            <textarea
              value={excludeEmails}
              onChange={(e) => setExcludeEmails(e.target.value)}
              placeholder="例: no-reply@newsletter.com, info@service.jp"
              className="w-full min-h-[180px] rounded-xl border border-rose-200 bg-white p-3 text-sm text-slate-700 resize-none outline-none focus:ring-2 focus:ring-rose-200"
            />
            <p className="text-xs text-slate-500 mt-2">ここに入れたアドレスは Gmail 検索時に除外されます。</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="text-sm text-slate-600">
            {message && <span className={message.includes("保存") ? "text-emerald-700" : "text-rose-700"}>{message}</span>}
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !uid}
            className="app-button app-button-primary inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <MaterialIcon name="save" className="text-[18px] text-white" />
            {saving ? "保存中..." : "設定を保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
