import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import MaterialIcon from "../components/MaterialIcon";

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
    <div className="min-h-screen soft-grid p-4 sm:p-6 lg:p-8 flex flex-col items-center">
      <div className="w-full max-w-2xl section-card glass-panel p-6 sm:p-8 mt-4 sm:mt-6 text-left">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
          >
            <MaterialIcon name="arrow_back" className="text-[18px]" />
            ダッシュボードへ戻る
          </Link>
          <Link
            to="/company-list"
            className="text-sm text-slate-600 hover:text-blue-600 font-medium flex items-center gap-1"
          >
            <MaterialIcon name="dashboard" className="text-[18px]" />
            企業リストを見る
          </Link>
        </div>
        <div className="flex items-center gap-3 border-b border-slate-200/70 pb-4 mb-6">
          <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center">
            <MaterialIcon name="domain_add" className="text-[24px]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 m-0">
              企業情報登録
            </h2>
            <p className="text-sm text-slate-500">
              企業を登録して選考状況をまとめます
            </p>
          </div>
        </div>

        {!uid && (
          <div className="p-4 mb-6 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl text-sm flex items-start gap-2">
            <MaterialIcon
              name="warning"
              className="text-[18px] text-amber-700 mt-0.5"
            />
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
              className="w-full px-4 py-3 bg-white/80 border border-slate-200 rounded-2xl text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition disabled:opacity-50"
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
              className="w-full px-4 py-3 bg-white/80 border border-slate-200 rounded-2xl text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition disabled:opacity-50"
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
              className="w-full px-4 py-3 bg-white/80 border border-slate-200 rounded-2xl text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition disabled:opacity-50"
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
              className="w-full px-4 py-3 bg-white/80 border border-slate-200 rounded-2xl text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition disabled:opacity-50"
              placeholder="https://example.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !uid}
            className="app-button app-button-primary w-full py-3.5 px-4 text-white font-bold rounded-2xl shadow-sm transition disabled:opacity-50 mt-4 inline-flex items-center justify-center gap-2"
          >
            <MaterialIcon name="save" className="text-[20px] text-white" />
            {loading ? "登録中..." : "企業情報を保存する"}
          </button>
        </form>
      </div>
    </div>
  );
}
