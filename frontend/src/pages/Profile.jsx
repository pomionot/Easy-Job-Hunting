import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppSidebar from "../components/AppSidebar";

export default function Profile() {
  const [uid, setUid] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [university, setUniversity] = useState("");
  const [faculty, setFaculty] = useState("");
  const [selfPr, setSelfPr] = useState("");
  const [targetIndustry, setTargetIndustry] = useState("");
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  // 1. 初期データ読み込み
  useEffect(() => {
    const savedUid = localStorage.getItem("login_user_uid") || "";
    const savedEmail = localStorage.getItem("login_user_email") || "";

    if (savedUid) {
      setUid(savedUid);
      setEmail(savedEmail);

      // バックエンドからプロフィールを取得
      fetch(
        `http://localhost:8080/api/profile?uid=${encodeURIComponent(savedUid)}`,
      )
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setName(data.name || "");
            setUniversity(data.university || "");
            setFaculty(data.faculty || "");
            setTargetIndustry(data.target_industry || "");
            setSelfPr(data.self_pr || "");
          }
        })
        .catch((err) =>
          console.error("🚨 プロフィールの取得に失敗しました:", err),
        );
    }
  }, []);

  // 2. 保存処理
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("http://localhost:8080/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: Number(uid),
          name,
          university,
          faculty,
          target_industry: targetIndustry,
          self_pr: selfPr,
        }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "プロフィールを保存しました！" });
      } else {
        setMessage({
          type: "error",
          text: "保存に失敗しました。もう一度お試しください。",
        });
      }
    } catch (err) {
      setMessage({ type: "error", text: "サーバーとの通信に失敗しました。" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 text-gray-800 flex min-h-screen overflow-hidden">
      <AppSidebar activePath="/profile" />

      <main className="flex-1 flex flex-col min-w-0 min-h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 sm:px-8 shrink-0">
          <h1 className="text-xl font-semibold text-gray-800">プロフィール設定</h1>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-2xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8 text-sm">
              <Link to="/dashboard" className="text-orange-600 hover:text-orange-700 font-medium flex items-center gap-2 transition-colors">
                <i className="fa-solid fa-arrow-left" aria-hidden="true" />
                ダッシュボードへ戻る
              </Link>
              <div className="flex gap-4 sm:gap-6">
                <Link to="/roadmap" className="text-gray-600 hover:text-orange-500 font-medium flex items-center gap-2 transition-colors">
                  <i className="fa-solid fa-map-location-dot" aria-hidden="true" />
                  就活ロードマップ
                </Link>
                <Link to="/company-list" className="text-gray-600 hover:text-orange-500 font-medium flex items-center gap-2 transition-colors">
                  <i className="fa-regular fa-building" aria-hidden="true" />
                  企業リスト
                </Link>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm">
              <div className="flex items-start gap-4 mb-8 border-b border-gray-100 pb-6">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-500 flex items-center justify-center text-2xl shrink-0">
                  <i className="fa-regular fa-user" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">就活プロフィール設定</h2>
                  <p className="text-gray-500 text-sm mt-1">{email || "ログイン中のアカウント"}</p>
                </div>
              </div>

              {message && (
                <div className={`p-4 rounded-xl mb-6 text-sm font-medium ${message.type === "success" ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-rose-50 border border-rose-200 text-rose-800"}`} role="status">
                  {message.text}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <i className="fa-regular fa-id-badge text-gray-400" aria-hidden="true" /> 氏名
                  </label>
                  <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="就活 太郎" required className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-base rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 block p-3.5 outline-none transition-colors" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="university" className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                      <i className="fa-solid fa-graduation-cap text-gray-400" aria-hidden="true" /> 大学名
                    </label>
                    <input id="university" type="text" value={university} onChange={(e) => setUniversity(e.target.value)} placeholder="〇〇大学" className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-base rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 block p-3.5 outline-none transition-colors" />
                  </div>
                  <div>
                    <label htmlFor="faculty" className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                      <i className="fa-solid fa-book-open text-gray-400" aria-hidden="true" /> 学部・学科
                    </label>
                    <input id="faculty" type="text" value={faculty} onChange={(e) => setFaculty(e.target.value)} placeholder="理工学部 情報工学科" className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-base rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 block p-3.5 outline-none transition-colors" />
                  </div>
                </div>

                <div>
                  <label htmlFor="target_industry" className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <i className="fa-solid fa-arrow-trend-up text-gray-400" aria-hidden="true" /> 志望業界
                  </label>
                  <input id="target_industry" type="text" value={targetIndustry} onChange={(e) => setTargetIndustry(e.target.value)} placeholder="IT・ソフトウェア・通信" className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-base rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 block p-3.5 outline-none transition-colors" />
                </div>

                <div>
                  <label htmlFor="self_pr" className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <i className="fa-solid fa-wand-magic-sparkles text-orange-500" aria-hidden="true" /> 自己PR <span className="text-xs font-normal text-gray-500">（AI生成にも使用されます）</span>
                  </label>
                  <textarea id="self_pr" rows="6" value={selfPr} onChange={(e) => setSelfPr(e.target.value)} placeholder="あなたの強みや、学生時代に注力した開発、研究内容（Go、PHP、JavaScript、機械学習など）について詳しく記入してください。" className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-base rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 block p-3.5 outline-none transition-colors resize-y" />
                </div>

                <div className="pt-2">
                  <button type="submit" disabled={loading || !uid} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-8 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed">
                    <i className="fa-regular fa-floppy-disk" aria-hidden="true" />
                    {loading ? "登録中..." : "プロフィールを保存する"}
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
