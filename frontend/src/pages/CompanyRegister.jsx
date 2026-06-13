import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function CompanyRegister() {
  const [uid, setUid] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [homepageUrl, setHomepageUrl] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // ローカルストレージからログイン中のUIDを取得
    const savedUid = localStorage.getItem("login_user_uid");
    if (savedUid) {
      setUid(savedUid);
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (!uid) {
      setMessage("❌ エラー: ログイン情報が見つかりません。");
      setLoading(false);
      return;
    }

    const companyData = {
      uid: parseInt(uid),
      company_name: companyName,
      industry: industry,
      business_type: businessType,
      homepage_url: homepageUrl,
    };

    // Goの企業登録APIへPOSTリクエスト
    fetch("http://localhost:8080/api/companies", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(companyData),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setMessage(`❌ エラー: ${data.error}`);
        } else {
          setMessage("🎉 企業情報を正常に登録しました！");
          // 入力フォームをリセット
          setCompanyName("");
          setIndustry("");
          setBusinessType("");
          setHomepageUrl("");
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("企業登録エラー:", err);
        setMessage("❌ 通信に失敗しました。");
        setLoading(false);
      });
  };

  return (
    <div className="min-h-screen bg-slate-100 p-8 flex flex-col items-center">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mt-10">
        {/* 上部ナビゲーション */}
        <div className="mb-6">
          <Link
            to="/"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
          >
            ← ダッシュボードへ戻る
          </Link>
        </div>

        <h2 className="text-2xl font-bold text-slate-800 border-b border-slate-200 pb-4 mb-6 flex items-center gap-2">
          🏢 企業情報登録
        </h2>

        {!uid && (
          <div className="p-4 mb-6 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-sm">
            ⚠️
            ログインセッションが見つかりません。ダッシュボードから再度ログインしてください。
          </div>
        )}

        {message && (
          <div
            className={`p-4 mb-6 rounded-xl text-sm font-medium ${
              message.includes("🎉")
                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                : "bg-rose-50 border border-rose-200 text-rose-800"
            }`}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              企業名 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              disabled={!uid}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition disabled:opacity-50"
              placeholder="株式会社〇〇"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              業界
            </label>
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              disabled={!uid}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition disabled:opacity-50"
              placeholder="例: IT・通信、メーカー、金融"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              業種
            </label>
            <input
              type="text"
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              disabled={!uid}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition disabled:opacity-50"
              placeholder="例: ソフトウェア開発、インターネットサービス"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              企業ホームページURL
            </label>
            <input
              type="url"
              value={homepageUrl}
              onChange={(e) => setHomepageUrl(e.target.value)}
              disabled={!uid}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition disabled:opacity-50"
              placeholder="https://example.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !uid}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition disabled:opacity-50 mt-4"
          >
            {loading ? "登録中..." : "企業情報を保存する"}
          </button>
        </form>
      </div>
    </div>
  );
}
