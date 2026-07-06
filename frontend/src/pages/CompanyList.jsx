import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import MaterialIcon from "../components/MaterialIcon";

const statusStyles = {
  エントリー前: "bg-slate-100 text-slate-700 border-slate-300",
  書類選考中: "bg-blue-50 text-blue-700 border-blue-200",
  面接中: "bg-amber-50 text-amber-700 border-amber-200",
  内定: "bg-emerald-50 text-emerald-700 border-emerald-200",
  お見送り: "bg-rose-50 text-rose-700 border-rose-200",
};

const statusOptions = [
  "エントリー前",
  "書類選考中",
  "面接中",
  "内定",
  "お見送り",
];

export default function CompanyList() {
  const [companies, setCompanies] = useState([]);
  const [uid, setUid] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // AI機能用のState
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeCompanyName, setActiveCompanyName] = useState("");

  useEffect(() => {
    const savedUid = localStorage.getItem("login_user_uid");
    if (savedUid) {
      setUid(savedUid);
      fetchCompanies(savedUid);
    } else {
      setLoading(false);
      setError("ログインセッションが見つかりません。");
    }
  }, []);

  const fetchCompanies = (userUid) => {
    fetch(`http://localhost:8080/api/companies?uid=${userUid}`)
      .then((res) => {
        if (!res.ok) throw new Error("企業データの取得に失敗しました");
        return res.json();
      })
      .then((data) => {
        setCompanies(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  const handleStatusChange = (companyId, newStatus) => {
    fetch("http://localhost:8080/api/companies/status", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: companyId, status: newStatus }),
    }).then(() => {
      setCompanies((prev) =>
        prev.map((c) => (c.id === companyId ? { ...c, status: newStatus } : c)),
      );
    });
  };

  // ✨ Gemini AIを呼び出す関数
  const handleAIAnalyze = (companyId, companyName, type) => {
    setAiLoading(true);
    setAiResult("");
    setActiveCompanyName(companyName);
    setShowModal(true);

    fetch("http://localhost:8080/api/ai/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_id: companyId, prompt_type: type }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setAiResult(`❌ エラー: ${data.error}`);
        } else {
          setAiResult(data.result);
        }
        setAiLoading(false);
      })
      .catch((err) => {
        setAiResult("❌ 通信に失敗しました。");
        setAiLoading(false);
      });
  };

  return (
    <div className="min-h-screen bg-transparent flex app-shell">
      <aside className="hidden md:flex w-72 flex-col gap-6 p-6 border-r border-slate-200/80 bg-slate-950/95 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-11 w-11 rounded-2xl bg-blue-500/15 flex items-center justify-center">
              <MaterialIcon
                name="work_outline"
                className="text-[24px] text-blue-200"
              />
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight">
                Easy Job Hunting
              </div>
              <div className="text-xs text-slate-300">企業管理リスト</div>
            </div>
          </div>
        </div>
        <nav className="space-y-2">
          <Link
            to="/"
            className="app-nav-link flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium bg-white/5 text-slate-200 hover:bg-white/10"
          >
            <MaterialIcon
              name="space_dashboard"
              className="text-[20px] text-blue-200"
            />
            メインダッシュボード
          </Link>
          <Link
            to="/company-register"
            className="app-nav-link flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium bg-white/5 text-slate-200 hover:bg-white/10"
          >
            <MaterialIcon
              name="domain_add"
              className="text-[20px] text-blue-200"
            />
            企業情報登録
          </Link>
          <a
            href="#"
            className="app-nav-link flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium bg-blue-500 text-white shadow-lg shadow-blue-950/20"
          >
            <MaterialIcon name="stacks" className="text-[20px] text-white" />
            企業管理リスト
          </a>
          <Link
            to="/profile"
            className="app-nav-link flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium bg-white/5 text-slate-200 hover:bg-white/10"
          >
            <MaterialIcon name="person" className="text-[20px] text-blue-200" />
            プロフィール登録
          </Link>
        </nav>
      </aside>

      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <header className="section-card glass-panel px-5 py-4 sm:px-6 sm:py-5 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-left">
          <div>
            <div className="chip mb-2 w-fit">
              <MaterialIcon name="stacks" className="text-[18px]" />
              企業管理リスト
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1 flex items-center gap-2">
              <MaterialIcon name="domain" className="text-[26px]" />
              エントリー企業管理リスト
            </h1>
            <p className="text-sm text-slate-600">
              登録企業の選考状況を一目で追えます。
            </p>
          </div>
          <Link
            to="/company-register"
            className="app-button app-button-primary inline-flex items-center gap-2 text-white px-4 py-2.5 rounded-2xl font-bold text-sm shadow-sm"
          >
            <MaterialIcon name="add" className="text-[20px] text-white" />
            新しい企業を追加
          </Link>
        </header>

        {loading ? (
          <div className="section-card p-12 text-center text-slate-500">
            読み込み中...
          </div>
        ) : (
          <div className="section-card overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 text-sm font-semibold">
                  <th className="p-4 pl-6">企業名</th>
                  <th className="p-4">業界 / 業種</th>
                  <th className="p-4">AIアシスト</th>
                  <th className="p-4 pr-6">選考ステータス</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 bg-white/70">
                {companies.map((company) => (
                  <tr
                    key={company.id}
                    className="hover:bg-slate-50/80 transition text-sm"
                  >
                    <td className="p-4 pl-6 font-bold text-slate-800">
                      {company.company_name}
                      {company.homepage_url && (
                        <a
                          href={company.homepage_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 block font-normal hover:underline"
                        >
                          HPを見る ↗
                        </a>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="text-slate-500 text-xs block">
                        {company.industry || "未設定"}
                      </span>
                      <span className="text-slate-400 text-xs">
                        {company.business_type}
                      </span>
                    </td>

                    {/* ✨ AIボタン設置 */}
                    <td className="p-4 space-x-2">
                      <button
                        onClick={() =>
                          handleAIAnalyze(
                            company.id,
                            company.company_name,
                            "research",
                          )
                        }
                        className="inline-flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-indigo-200 transition"
                      >
                        <MaterialIcon
                          name="search"
                          className="text-[16px] text-indigo-700"
                        />
                        企業研究
                      </button>
                      <button
                        onClick={() =>
                          handleAIAnalyze(
                            company.id,
                            company.company_name,
                            "motive",
                          )
                        }
                        className="inline-flex items-center gap-1 bg-purple-50 hover:bg-purple-100 text-purple-700 px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-purple-200 transition"
                      >
                        <MaterialIcon
                          name="edit_note"
                          className="text-[16px] text-purple-700"
                        />
                        志望動機案
                      </button>
                    </td>

                    <td className="p-4 pr-6">
                      <select
                        value={company.status}
                        onChange={(e) =>
                          handleStatusChange(company.id, e.target.value)
                        }
                        className={`px-3 py-1.5 rounded-full border text-xs font-bold ${statusStyles[company.status] || "bg-slate-100 text-slate-700"}`}
                      >
                        {statusOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 🤖 AI結果表示用ポップアップモーダル */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <header className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <MaterialIcon name="smart_toy" className="text-[20px]" />
                  Gemini AI 解析結果: {activeCompanyName}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                >
                  &times;
                </button>
              </header>
              <div className="p-6 overflow-y-auto flex-1 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {aiLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3"></div>
                    Geminiが企業データを分析して生成しています...
                  </div>
                ) : (
                  aiResult
                )}
              </div>
              <footer className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end rounded-b-2xl">
                <button
                  onClick={() => setShowModal(false)}
                  className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold transition"
                >
                  閉じる
                </button>
              </footer>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
