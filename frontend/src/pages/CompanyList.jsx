import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AppSidebar from "../components/AppSidebar";

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
  const [roadmapsSummary, setRoadmapsSummary] = useState({});
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
      fetchRoadmapsSummary(savedUid);
    } else {
      setLoading(false);
      setError("ログインセッションが見つかりません。");
    }
  }, []);

  const fetchRoadmapsSummary = (userUid) => {
    fetch(`/api/roadmaps/summary?uid=${userUid}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const map = {};
        if (Array.isArray(data)) {
          data.forEach((item) => {
            map[item.company_id] = item;
          });
        }
        setRoadmapsSummary(map);
      })
      .catch((err) => console.error("ロードマップサマリー取得失敗:", err));
  };

  const fetchCompanies = (userUid) => {
    fetch(`/api/companies?uid=${userUid}`)
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
    fetch("/api/companies/status", {
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

    fetch("/api/ai/analyze", {
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
    <div className="bg-gray-50 text-gray-800 flex min-h-screen overflow-hidden">
      <AppSidebar activePath="/company-list" />

      <main className="flex-1 flex flex-col min-w-0 min-h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 sm:px-8 shrink-0">
          <h1 className="text-xl font-semibold text-gray-800">企業管理リスト</h1>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-500 flex items-center justify-center text-xl shrink-0">
                  <i className="fa-regular fa-building" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">エントリー企業管理リスト</h2>
                  <p className="text-gray-500 text-xs mt-0.5">登録企業の選考状況を一目で追えます。</p>
                </div>
              </div>
              <Link to="/company-register" className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-5 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 text-sm shrink-0">
                <i className="fa-solid fa-plus" aria-hidden="true" />
                新しい企業を追加
              </Link>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm" role="alert">
                {error}
              </div>
            )}

            {loading ? (
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-12 text-center text-gray-500">
                <i className="fa-solid fa-spinner animate-spin text-orange-500 text-xl mb-2" aria-hidden="true" />
                <p>企業情報を読み込み中...</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                {companies.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    登録企業がありません。新しい企業を追加してください。
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-bold">
                        <tr>
                          <th className="px-6 py-4">企業名</th>
                          <th className="px-6 py-4">業界 / 業種</th>
                          <th className="px-6 py-4 w-96">就活ロードマップ (現在地・次に行うこと)</th>
                          <th className="px-6 py-4">AIアシスト</th>
                          <th className="px-6 py-4">選考ステータス</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-700">
                        {companies.map((company) => {
                          const summary = roadmapsSummary[company.id];
                          return (
                            <tr key={company.id} className="hover:bg-orange-50/30 transition-colors">
                              <td className="px-6 py-5 align-top">
                                <div className="font-bold text-base text-gray-900 mb-1">{company.company_name}</div>
                                {company.homepage_url && (
                                  <a href={company.homepage_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:text-blue-700 hover:underline flex items-center gap-1 inline-flex">
                                    HPを見る <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" aria-hidden="true" />
                                  </a>
                                )}
                              </td>
                              <td className="px-6 py-5 align-top">
                                <div className="text-sm">{company.industry || "未設定"}</div>
                                <div className="text-xs text-gray-400 mt-1">{company.business_type || "業種未設定"}</div>
                              </td>
                              <td className="px-6 py-5 align-top whitespace-normal min-w-[300px]">
                                {summary && summary.total_steps > 0 ? (
                                  <div className="space-y-2 max-w-md">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-1 rounded-md">
                                        <i className="fa-solid fa-thumbtack" aria-hidden="true" />
                                        {summary.current_step_title || "進行中"}
                                      </span>
                                      <span className="text-xs text-gray-400 font-medium">{summary.completed_count}/{summary.total_steps}</span>
                                    </div>
                                    <div className="text-xs text-gray-600 leading-relaxed line-clamp-2">
                                      <span className="font-bold text-gray-800">次:</span> {summary.next_action || "次のアクションを設定してください"}
                                    </div>
                                    <Link to={`/roadmap?companyId=${company.id}`} className="text-xs font-bold text-orange-500 hover:text-orange-700 hover:underline flex items-center gap-1 inline-flex">
                                      <i className="fa-solid fa-map-location-dot" aria-hidden="true" />
                                      ロードマップ確認・編集 <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" aria-hidden="true" />
                                    </Link>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <span className="text-xs text-gray-400 block">未作成</span>
                                    <Link to={`/roadmap?companyId=${company.id}`} className="text-xs font-bold text-orange-500 hover:text-orange-700 hover:underline flex items-center gap-1 inline-flex">
                                      <i className="fa-solid fa-map-location-dot" aria-hidden="true" />
                                      ロードマップを作成
                                    </Link>
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-5 align-top">
                                <div className="flex flex-col gap-2">
                                  <button type="button" onClick={() => handleAIAnalyze(company.id, company.company_name, "research")} className="text-xs font-bold text-orange-600 bg-white border border-orange-200 hover:bg-orange-50 px-3 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                                    <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                                    企業研究
                                  </button>
                                  <button type="button" onClick={() => handleAIAnalyze(company.id, company.company_name, "motive")} className="text-xs font-bold text-purple-600 bg-white border border-purple-200 hover:bg-purple-50 px-3 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                                    <i className="fa-regular fa-lightbulb" aria-hidden="true" />
                                    志望動機案
                                  </button>
                                </div>
                              </td>
                              <td className="px-6 py-5 align-top">
                                <select value={company.status} onChange={(e) => handleStatusChange(company.id, e.target.value)} className={`bg-gray-50 border text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full p-2 outline-none font-medium cursor-pointer ${statusStyles[company.status] || "border-gray-300 text-gray-700"}`}>
                                  {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
              <div className="bg-gradient-to-r from-purple-500 to-orange-400 text-white px-6 py-4 flex items-center justify-between shrink-0">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" />
                  Gemini AI 解析結果: {activeCompanyName}
                </h3>
                <button type="button" onClick={() => setShowModal(false)} aria-label="モーダルを閉じる" className="text-white hover:text-gray-200 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20">
                  <i className="fa-solid fa-xmark text-xl" aria-hidden="true" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {aiLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <i className="fa-solid fa-spinner animate-spin text-2xl text-orange-500 mb-3" aria-hidden="true" />
                    Geminiが企業データを分析して生成しています...
                  </div>
                ) : aiResult}
              </div>
              <footer className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end shrink-0">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2 bg-gray-800 text-white text-sm font-bold rounded-xl shadow-sm hover:bg-gray-900 transition-colors">
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
