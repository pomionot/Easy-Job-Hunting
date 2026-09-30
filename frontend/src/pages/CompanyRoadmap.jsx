import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import MaterialIcon from "../components/MaterialIcon";
import AppSidebar from "../components/AppSidebar";

export default function CompanyRoadmap() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [uid, setUid] = useState("");
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // モーダル・フォーム管理
  const [stepModalOpen, setStepModalOpen] = useState(false);
  const [editingStep, setEditingStep] = useState(null);
  const [stepForm, setStepForm] = useState({
    title: "",
    status: "pending",
    target_date: "",
    next_action: "",
    notes: "",
  });

  // AIアドバイスモーダル
  const [adviceModalOpen, setAdviceModalOpen] = useState(false);
  const [adviceContent, setAdviceContent] = useState("");
  const [adviceLoading, setAdviceLoading] = useState(false);

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

  // 企業一覧を取得
  const fetchCompanies = (userUid) => {
    fetch(`http://localhost:8080/api/companies?uid=${userUid}`)
      .then((res) => {
        if (!res.ok) throw new Error("企業データの取得に失敗しました");
        return res.json();
      })
      .then((data) => {
        setCompanies(data);
        setLoading(false);

        // クエリパラメータの企業IDがあればそれを選択、無ければ先頭企業
        const paramCompId = searchParams.get("companyId");
        if (paramCompId && data.some((c) => String(c.id) === paramCompId)) {
          setSelectedCompanyId(paramCompId);
          fetchRoadmap(paramCompId, userUid);
        } else if (data.length > 0) {
          const firstId = String(data[0].id);
          setSelectedCompanyId(firstId);
          fetchRoadmap(firstId, userUid);
        }
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  // 選択企業のロードマップを取得
  const fetchRoadmap = (companyId, userUid = uid) => {
    if (!companyId) return;
    setRoadmapLoading(true);
    setError("");
    fetch(`http://localhost:8080/api/companies/${companyId}/roadmap?uid=${userUid}`)
      .then((res) => {
        if (!res.ok) throw new Error("ロードマップの取得に失敗しました");
        return res.json();
      })
      .then((data) => {
        setRoadmap(data);
        setRoadmapLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setRoadmapLoading(false);
      });
  };

  // 企業切り替えハンドラ
  const handleCompanyChange = (e) => {
    const newId = e.target.value;
    setSelectedCompanyId(newId);
    setSearchParams({ companyId: newId });
    fetchRoadmap(newId);
  };

  // ロードマップ作成（テンプレートまたはAI）
  const handleInitRoadmap = (type) => {
    if (!selectedCompanyId) return;
    setActionLoading(true);
    fetch(`http://localhost:8080/api/companies/${selectedCompanyId}/roadmap/init?uid=${uid}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("ロードマップの作成に失敗しました");
        return res.json();
      })
      .then((data) => {
        setSuccessMessage(data.message || "ロードマップを作成しました！");
        setTimeout(() => setSuccessMessage(""), 3000);
        fetchRoadmap(selectedCompanyId);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setActionLoading(false);
      });
  };

  // 現在地を設定する
  const handleSetCurrentStep = (stepId, markPrevious = true) => {
    setActionLoading(true);
    fetch(`http://localhost:8080/api/companies/${selectedCompanyId}/roadmap/current?uid=${uid}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step_id: stepId,
        mark_previous_completed: markPrevious,
        sync_company_status: true,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("現在地の更新に失敗しました");
        return res.json();
      })
      .then(() => {
        setSuccessMessage("現在地を更新しました！");
        setTimeout(() => setSuccessMessage(""), 3000);
        fetchRoadmap(selectedCompanyId);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setActionLoading(false);
      });
  };

  // ステップ完了にして次へ進む
  const handleCompleteAndNext = () => {
    if (!roadmap || !roadmap.steps || !roadmap.current_step) return;
    const currentIndex = roadmap.steps.findIndex((s) => s.id === roadmap.current_step.id);
    if (currentIndex === -1) return;

    if (currentIndex + 1 < roadmap.steps.length) {
      const nextStep = roadmap.steps[currentIndex + 1];
      handleSetCurrentStep(nextStep.id, true);
    } else {
      // 最後のステップを完了にする
      handleUpdateStepStatus(roadmap.current_step.id, "completed");
    }
  };

  // 単一ステップのステータス変更
  const handleUpdateStepStatus = (stepId, newStatus) => {
    const target = roadmap.steps.find((s) => s.id === stepId);
    if (!target) return;
    fetch(`http://localhost:8080/api/companies/${selectedCompanyId}/roadmap/steps/${stepId}?uid=${uid}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...target,
        status: newStatus,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("ステータスの変更に失敗しました");
        fetchRoadmap(selectedCompanyId);
      })
      .catch((err) => setError(err.message));
  };

  // ステップ編集モーダルを開く
  const openEditModal = (step) => {
    setEditingStep(step);
    setStepForm({
      title: step.title,
      status: step.status,
      target_date: step.target_date || "",
      next_action: step.next_action || "",
      notes: step.notes || "",
    });
    setStepModalOpen(true);
  };

  // 新規ステップ追加モーダルを開く
  const openCreateModal = () => {
    setEditingStep(null);
    setStepForm({
      title: "",
      status: "pending",
      target_date: "",
      next_action: "",
      notes: "",
    });
    setStepModalOpen(true);
  };

  // ステップ保存（追加または更新）
  const handleSaveStep = (e) => {
    e.preventDefault();
    if (!stepForm.title.trim()) return;

    const isEdit = !!editingStep;
    const url = isEdit
      ? `http://localhost:8080/api/companies/${selectedCompanyId}/roadmap/steps/${editingStep.id}?uid=${uid}`
      : `http://localhost:8080/api/companies/${selectedCompanyId}/roadmap/steps?uid=${uid}`;
    const method = isEdit ? "PUT" : "POST";

    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(stepForm),
    })
      .then((res) => {
        if (!res.ok) throw new Error("ステップの保存に失敗しました");
        return res.json();
      })
      .then(() => {
        setStepModalOpen(false);
        setSuccessMessage(isEdit ? "ステップを更新しました" : "ステップを追加しました");
        setTimeout(() => setSuccessMessage(""), 3000);
        fetchRoadmap(selectedCompanyId);
      })
      .catch((err) => setError(err.message));
  };

  // ステップ削除
  const handleDeleteStep = (stepId) => {
    if (!window.confirm("このステップを削除してもよろしいですか？")) return;
    fetch(`http://localhost:8080/api/companies/${selectedCompanyId}/roadmap/steps/${stepId}?uid=${uid}`, {
      method: "DELETE",
    })
      .then((res) => {
        if (!res.ok) throw new Error("削除に失敗しました");
        fetchRoadmap(selectedCompanyId);
      })
      .catch((err) => setError(err.message));
  };

  // AIアドバイスを取得
  const handleGetAdvice = () => {
    if (!roadmap || !roadmap.current_step) return;
    setAdviceModalOpen(true);
    setAdviceLoading(true);
    setAdviceContent("");

    fetch(`http://localhost:8080/api/companies/${selectedCompanyId}/roadmap/advice?uid=${uid}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step_title: roadmap.current_step.title,
        next_action: roadmap.current_step.next_action,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setAdviceContent(data.advice || "アドバイスを取得できませんでした");
        setAdviceLoading(false);
      })
      .catch((err) => {
        setAdviceContent("通信エラーが発生しました: " + err.message);
        setAdviceLoading(false);
      });
  };

  const currentComp = companies.find((c) => String(c.id) === String(selectedCompanyId));

  return (
    <div className="bg-gray-50 text-gray-800 flex min-h-screen overflow-hidden">
      <AppSidebar activePath="/roadmap" />

      <main className="flex-1 flex flex-col min-w-0 min-h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0 relative z-10 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-500 flex items-center justify-center shrink-0">
              <i className="fa-solid fa-map-location-dot" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900 leading-tight truncate">企業別 就活ロードマップ</h1>
              <p className="text-[10px] text-gray-500 hidden sm:block truncate">現在地と次に行うべきことを整理し、内定までのルートを描きます。</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
              <i className="fa-regular fa-building text-gray-400 text-sm" aria-hidden="true" />
              <select id="company-select" value={selectedCompanyId} onChange={handleCompanyChange} className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer max-w-[180px] sm:max-w-none">
                {companies.length === 0 ? <option value="">企業が未登録です</option> : companies.map((c) => <option key={c.id} value={c.id}>{c.company_name} ({c.status || "未設定"})</option>)}
              </select>
            </div>
            <Link to="/company-register" className="hidden sm:inline-flex text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors items-center gap-1">
              <i className="fa-solid fa-plus" aria-hidden="true" /> 企業を追加
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-8">

        {/* 通知バー */}
        {successMessage && (
          <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-50 text-emerald-800 p-4 text-sm flex items-center gap-2">
            <MaterialIcon name="check_circle" className="text-[20px] text-emerald-600" />
            {successMessage}
          </div>
        )}
        {error && (
          <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-50 text-rose-800 p-4 text-sm flex items-center gap-2">
            <MaterialIcon name="error" className="text-[20px] text-rose-600" />
            {error}
          </div>
        )}

        {/* ロード画面 */}
        {loading || roadmapLoading ? (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-16 text-center text-gray-500">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mb-3"></div>
            <div>ロードマップを読み込み中...</div>
          </div>
        ) : companies.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-12 text-center text-gray-600">
            <MaterialIcon name="domain_disabled" className="text-[48px] text-slate-300 mb-3" />
            <h3 className="text-lg font-bold text-slate-800 mb-2">登録されている企業がありません</h3>
            <p className="text-sm text-slate-500 mb-6">
              まずは企業情報を登録して、選考ロードマップを作成しましょう。
            </p>
            <Link
              to="/company-register"
              className="bg-orange-500 hover:bg-orange-600 inline-flex items-center gap-2 text-white px-5 py-3 rounded-xl font-bold text-sm shadow-md"
            >
              <MaterialIcon name="add" className="text-[20px]" />
              企業情報を登録する
            </Link>
          </div>
        ) : !roadmap || roadmap.total_steps === 0 ? (
          /* ロードマップ未作成時の案内カード */
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 sm:p-10 text-center">
            <div className="inline-flex p-4 rounded-2xl bg-orange-100 text-orange-600 mb-4">
              <MaterialIcon name="add_road" className="text-[36px]" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              「{currentComp?.company_name}」のロードマップを作成しましょう
            </h2>
            <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto mb-8 leading-relaxed">
              選考フローをステップ形式で可視化し、今どのフェーズにいて、次は何を準備すべきかを明確にできます。
            </p>

            <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
              <button
                onClick={() => handleInitRoadmap("template")}
                disabled={actionLoading}
                className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-orange-200 bg-white hover:bg-orange-50 hover:border-orange-400 transition shadow-sm group text-center"
              >
                <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                  <MaterialIcon name="format_list_bulleted" className="text-[26px]" />
                </div>
                <div className="font-bold text-slate-900 mb-1">標準テンプレートで作成</div>
                <div className="text-xs text-slate-500">
                  企業研究・ES・1次〜最終面接・内定の標準選考ステップを一括作成
                </div>
              </button>

              <button
                onClick={() => handleInitRoadmap("ai")}
                disabled={actionLoading}
                className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 hover:border-indigo-400 transition shadow-sm group text-center"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                  <MaterialIcon name="auto_awesome" className="text-[26px]" />
                </div>
                <div className="font-bold text-indigo-950 mb-1">AIで企業特化ロードマップ生成</div>
                <div className="text-xs text-slate-600">
                  業界（{currentComp?.industry || "一般"}）やプロフィールに最適化された独自ステップを生成
                </div>
              </button>
            </div>
          </div>
        ) : (
          /* ロードマップ作成済み表示 */
          <div className="space-y-6">
            {/* 🌟 1. 現在地と次に行うべきことのハイライトカード */}
            <div className="rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-white p-1 shadow-lg relative overflow-hidden">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 sm:p-8 h-full relative overflow-hidden">

              <div className="relative z-10">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white">
                    <MaterialIcon name="navigation" className="text-[16px] text-white" />
                    現在の選考フェーズ・現在地
                  </div>
                  <div className="text-xs text-slate-300 flex items-center gap-2 font-medium">
                    <span>進捗状況:</span>
                      <span className="text-white font-bold text-sm">
                      {roadmap.completed_count} / {roadmap.total_steps} 完了 ({roadmap.progress_rate}%)
                    </span>
                  </div>
                </div>

                {/* プログレスバー */}
                <div className="w-full bg-black/20 rounded-full h-2.5 mb-6 overflow-hidden">
                  <div
                    className="bg-white h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${roadmap.progress_rate}%` }}
                  />
                </div>

                <div className="grid lg:grid-cols-[1fr_auto] gap-6 items-start">
                  <div>
                    {roadmap.current_step ? (
                      <>
                        <div className="flex items-center gap-3 mb-3">
                            <span className="px-3 py-1 rounded-xl bg-white/20 text-white border border-white/20 text-xs font-extrabold flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block mr-1"></span>
                            📍 現在地
                          </span>
                          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                            {roadmap.current_step.title}
                          </h2>
                          {roadmap.current_step.target_date && (
                            <span className="text-xs text-slate-300 bg-white/10 px-2.5 py-1 rounded-lg">
                              期日: {roadmap.current_step.target_date}
                            </span>
                          )}
                        </div>

                        {/* 次に行うべきことの強調表示 */}
                        <div className="mt-4 p-5 rounded-xl bg-black/20 backdrop-blur-md border border-white/15">
                          <div className="text-xs font-bold text-orange-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <MaterialIcon name="bolt" className="text-[18px] text-amber-300" />
                            次に行うべきこと（Next Action）
                          </div>
                          <div className="text-base sm:text-lg font-medium text-slate-100 leading-relaxed whitespace-pre-wrap">
                            {roadmap.current_step.next_action || "次の具体的なToDoを設定してください"}
                          </div>

                          {roadmap.current_step.notes && (
                            <div className="mt-3 pt-3 border-t border-white/10 text-xs text-slate-300 flex items-start gap-1.5">
                              <MaterialIcon name="lightbulb" className="text-[16px] text-yellow-300 shrink-0 mt-0.5" />
                              <span>メモ・アドバイス: {roadmap.current_step.notes}</span>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div>
                        <h2 className="text-2xl font-bold text-emerald-300 mb-2 flex items-center gap-2">
                          <MaterialIcon name="celebration" className="text-[28px]" />
                          すべてのステップを完了しました！
                        </h2>
                        <p className="text-sm text-slate-300">
                          お疲れ様でした。必要に応じて新しいステップを追加したり、次の選考に備えましょう。
                        </p>
                      </div>
                    )}
                  </div>

                  {/* アクションボタン群 */}
                  <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
                    {roadmap.current_step && (
                      <button
                        onClick={handleCompleteAndNext}
                        disabled={actionLoading}
                        className="inline-flex items-center justify-center gap-2 bg-white hover:bg-orange-50 text-orange-600 font-bold px-5 py-3 rounded-xl text-sm transition shadow-sm active:scale-95"
                      >
                        <MaterialIcon name="done_all" className="text-[20px]" />
                        このステップを完了して次へ
                      </button>
                    )}

                    <button
                      onClick={handleGetAdvice}
                      disabled={!roadmap.current_step || actionLoading}
                      className="inline-flex items-center justify-center gap-2 bg-orange-700/50 hover:bg-orange-700/70 text-white font-semibold px-4 py-3 rounded-xl text-sm border border-orange-300/30 transition active:scale-95"
                    >
                      <MaterialIcon name="psychology" className="text-[20px] text-indigo-200" />
                      AI対策アドバイス
                    </button>

                    {roadmap.current_step && (
                      <button
                        onClick={() => openEditModal(roadmap.current_step)}
                        className="inline-flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 text-slate-200 font-medium px-4 py-2.5 rounded-2xl text-xs border border-white/10 transition"
                      >
                        <MaterialIcon name="edit" className="text-[16px]" />
                        現在地を編集
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            </div>

            {/* 🗺️ 2. ロードマップ全体タイムライン */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <MaterialIcon name="timeline" className="text-[22px] text-orange-500" />
                    選考ステップ一覧（タイムライン）
                  </h3>
                  <p className="text-xs text-slate-500">
                    ステップの並び替えや追加、現在地の切り替えができます。
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={openCreateModal}
                    className="inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-3.5 py-2 rounded-xl text-xs transition border border-blue-200"
                  >
                    <MaterialIcon name="add" className="text-[18px]" />
                    ステップを追加
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm("ロードマップを初期化して再生成しますか？")) {
                        handleInitRoadmap("template");
                      }
                    }}
                    className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-xl text-xs font-medium transition"
                    title="標準選考フローにリセット"
                  >
                    <MaterialIcon name="refresh" className="text-[16px]" />
                    リセット
                  </button>
                </div>
              </div>

              {/* タイムラインリスト */}
              <div className="relative pl-6 sm:pl-8 border-l-2 border-gray-100 space-y-6">
                {roadmap.steps.map((step, index) => {
                  const isCurrent = roadmap.current_step?.id === step.id;
                  const isCompleted = step.status === "completed";
                  const isPending = step.status === "pending";

                  return (
                    <div
                      key={step.id}
                      className={`relative group p-5 rounded-2xl border transition-all ${
                        isCurrent
                          ? "bg-orange-50 border-orange-300 shadow-md ring-2 ring-orange-400/20"
                          : isCompleted
                            ? "bg-slate-50/80 border-slate-200 opacity-90"
                            : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {/* タイムラインノード（丸アイコン） */}
                      <div
                        className={`absolute -left-[35px] sm:-left-[43px] top-6 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${
                          isCurrent
                            ? "bg-blue-600 text-white ring-4 ring-blue-100 animate-pulse"
                            : isCompleted
                              ? "bg-emerald-500 text-white"
                              : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {isCompleted ? (
                          <MaterialIcon name="check" className="text-[18px]" />
                        ) : isCurrent ? (
                          <MaterialIcon name="my_location" className="text-[18px]" />
                        ) : (
                          index + 1
                        )}
                      </div>

                      {/* ステップ上部情報 */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400">Step {index + 1}</span>
                          <h4
                            className={`font-bold text-base sm:text-lg ${
                              isCompleted ? "text-slate-600 line-through" : "text-slate-900"
                            }`}
                          >
                            {step.title}
                          </h4>

                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-extrabold border border-blue-200 flex items-center gap-1">
                              📍 現在地
                            </span>
                          )}
                          {isCompleted && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                              ✓ 完了
                            </span>
                          )}
                          {isPending && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium border border-slate-200">
                              未着手
                            </span>
                          )}
                        </div>

                        {/* ステップごとの期日 */}
                        {step.target_date && (
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            <MaterialIcon name="event" className="text-[16px] text-slate-400" />
                            予定: {step.target_date}
                          </div>
                        )}
                      </div>

                      {/* 次に行うべきこと（Next Action） */}
                      <div className="my-2.5 p-3.5 rounded-xl bg-white/70 border border-slate-100">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1 mb-1">
                          <MaterialIcon
                            name="task_alt"
                            className={`text-[15px] ${isCurrent ? "text-blue-600" : "text-slate-400"}`}
                          />
                          次に行うべきこと（アクション）
                        </div>
                        <div className="text-sm text-slate-700 leading-relaxed font-medium">
                          {step.next_action || "未設定"}
                        </div>
                      </div>

                      {/* メモ・対策ポイント */}
                      {step.notes && (
                        <div className="text-xs text-slate-500 flex items-start gap-1.5 mb-3 px-1">
                          <MaterialIcon name="info" className="text-[15px] text-slate-400 shrink-0 mt-0.5" />
                          <span>{step.notes}</span>
                        </div>
                      )}

                      {/* 操作バー */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-2">
                          {!isCurrent && (
                            <button
                              onClick={() => handleSetCurrentStep(step.id, false)}
                              className="font-semibold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
                            >
                              <MaterialIcon name="navigation" className="text-[14px]" />
                              ここを現在地にする
                            </button>
                          )}

                          {!isCompleted ? (
                            <button
                              onClick={() => handleUpdateStepStatus(step.id, "completed")}
                              className="font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
                            >
                              完了にする
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateStepStatus(step.id, "pending")}
                              className="font-medium text-slate-400 hover:text-slate-600 hover:underline"
                            >
                              未完了に戻す
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(step)}
                            className="text-slate-500 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition"
                            title="編集"
                          >
                            <MaterialIcon name="edit" className="text-[16px]" />
                          </button>
                          <button
                            onClick={() => handleDeleteStep(step.id)}
                            className="text-rose-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition"
                            title="削除"
                          >
                            <MaterialIcon name="delete" className="text-[16px]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

          </div>
        </div>

        {/* ✏️ ステップ追加・編集モーダル */}
        {stepModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <MaterialIcon name="playlist_add" className="text-[22px] text-blue-600" />
                  {editingStep ? "ステップの編集" : "新しいステップを追加"}
                </h3>
                <button
                  onClick={() => setStepModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSaveStep} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ステップ名 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="例: 一次面接（オンライン）、ES・Webテスト"
                    value={stepForm.title}
                    onChange={(e) => setStepForm({ ...stepForm, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">ステータス</label>
                    <select
                      value={stepForm.status}
                      onChange={(e) => setStepForm({ ...stepForm, status: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pending">未着手 (pending)</option>
                      <option value="current">📍 現在地 (current)</option>
                      <option value="completed">✓ 完了 (completed)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">目標予定日</label>
                    <input
                      type="date"
                      value={stepForm.target_date}
                      onChange={(e) => setStepForm({ ...stepForm, target_date: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    次に行うべきこと（Next Action）
                  </label>
                  <textarea
                    rows={3}
                    placeholder="例: 自己PRと志望動機の1分要約を準備、逆質問を3問用意する"
                    value={stepForm.next_action}
                    onChange={(e) => setStepForm({ ...stepForm, next_action: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    メモ・対策ポイント
                  </label>
                  <input
                    type="text"
                    placeholder="例: 服装自由、通信環境とカメラ位置を事前チェック"
                    value={stepForm.notes}
                    onChange={(e) => setStepForm({ ...stepForm, notes: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setStepModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    className="app-button app-button-primary px-5 py-2 rounded-xl text-white text-xs font-bold"
                  >
                    保存する
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 🤖 AIアドバイスモーダル */}
        {adviceModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                  <MaterialIcon name="psychology" className="text-[24px] text-indigo-600" />
                  Gemini 就活アドバイス
                </h3>
                <button
                  onClick={() => setAdviceModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                >
                  &times;
                </button>
              </div>

              <div className="py-4 overflow-y-auto flex-1 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {adviceLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3"></div>
                    現在地ステップの具体的な突破指針をAIが生成しています...
                  </div>
                ) : (
                  adviceContent
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setAdviceModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-xl text-xs font-bold"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
