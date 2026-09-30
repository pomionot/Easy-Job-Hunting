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
    <div className="bg-gray-50 text-gray-800 flex min-h-screen overflow-hidden">
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <Link to="/dashboard" className="text-xl font-bold text-orange-600 flex items-center gap-2">
            <i className="fa-solid fa-seedling" aria-hidden="true" />
            Easy Job Hunting
          </Link>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {[
            ["/dashboard", "fa-solid fa-house", "ホーム"],
            ["/mails", "fa-regular fa-envelope", "メール一覧"],
            ["/company-list", "fa-regular fa-building", "企業管理リスト"],
            ["/roadmap", "fa-solid fa-map-location-dot", "就活ロードマップ"],
            ["/profile", "fa-regular fa-id-card", "プロフィール設定"],
            ["/mail-filters", "fa-solid fa-sliders", "メールフィルター"],
          ].map(([to, icon, label]) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 hover:text-orange-500 rounded-xl font-medium transition-colors"
            >
              <i className={`${icon} w-5`} aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 min-h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 sm:px-8 shrink-0">
          <h1 className="text-xl font-semibold text-gray-800">企業情報登録</h1>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-2xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8 text-sm">
              <Link to="/dashboard" className="text-orange-600 hover:text-orange-700 font-medium flex items-center gap-2 transition-colors">
                <i className="fa-solid fa-arrow-left" aria-hidden="true" />
                ダッシュボードへ戻る
              </Link>
              <div className="flex gap-4 sm:gap-6">
                <Link to="/company-list" className="text-gray-600 hover:text-orange-500 font-medium flex items-center gap-2 transition-colors">
                  <i className="fa-regular fa-building" aria-hidden="true" />
                  企業リストを見る
                </Link>
                <Link to="/roadmap" className="text-gray-600 hover:text-orange-500 font-medium flex items-center gap-2 transition-colors">
                  <i className="fa-solid fa-map-location-dot" aria-hidden="true" />
                  就活ロードマップ
                </Link>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm">
              <div className="flex items-start gap-4 mb-8 border-b border-gray-100 pb-6">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-500 flex items-center justify-center text-2xl shrink-0">
                  <i className="fa-regular fa-building" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">企業情報登録</h2>
                  <p className="text-gray-500 text-sm mt-1">企業を登録して選考状況をまとめます</p>
                </div>
              </div>

              {!uid && (
                <div className="p-4 mb-6 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl text-sm flex items-start gap-2">
                  <i className="fa-solid fa-triangle-exclamation text-amber-700 mt-0.5" aria-hidden="true" />
                  ログインセッションが見つかりません。ダッシュボードから再度ログインしてください。
                </div>
              )}

              {message && (
                <div className={`p-4 mb-6 rounded-xl text-sm font-medium ${message.includes("🎉") ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-rose-50 border border-rose-200 text-rose-800"}`} role="status">
                  {message}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="company_name" className="block text-sm font-bold text-gray-700 mb-2">
                    企業名 <span className="text-red-500 ml-1" title="必須">*</span>
                  </label>
                  <input id="company_name" type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required disabled={!uid} placeholder="株式会社〇〇" className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-base rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 block p-3.5 outline-none transition-colors disabled:opacity-50" />
                </div>

                <div>
                  <label htmlFor="industry" className="block text-sm font-bold text-gray-700 mb-2">業界</label>
                  <input id="industry" type="text" value={industry} onChange={(e) => setIndustry(e.target.value)} disabled={!uid} placeholder="例: IT・通信、メーカー、金融" className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-base rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 block p-3.5 outline-none transition-colors disabled:opacity-50" />
                </div>

                <div>
                  <label htmlFor="business_type" className="block text-sm font-bold text-gray-700 mb-2">業種</label>
                  <input id="business_type" type="text" value={businessType} onChange={(e) => setBusinessType(e.target.value)} disabled={!uid} placeholder="例: ソフトウェア開発、インターネットサービス" className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-base rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 block p-3.5 outline-none transition-colors disabled:opacity-50" />
                </div>

                <div>
                  <label htmlFor="homepage_url" className="block text-sm font-bold text-gray-700 mb-2">企業ホームページURL</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400">
                      <i className="fa-solid fa-link" aria-hidden="true" />
                    </div>
                    <input id="homepage_url" type="url" value={homepageUrl} onChange={(e) => setHomepageUrl(e.target.value)} disabled={!uid} placeholder="https://example.com" className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-base rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 block pl-11 p-3.5 outline-none transition-colors disabled:opacity-50" />
                  </div>
                </div>

                <div className="pt-2">
                  <button type="submit" disabled={loading || !uid} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-8 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed">
                    <i className="fa-regular fa-floppy-disk" aria-hidden="true" />
                    {loading ? "登録中..." : "企業情報を保存する"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
