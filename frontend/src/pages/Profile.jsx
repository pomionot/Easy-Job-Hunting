import React, { useEffect, useState } from "react";
import MaterialIcon from "../components/MaterialIcon"; // ご用意されているアイコンコンポーネント

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
        body: json.stringify({
          uid,
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
    <div className="max-w-2xl mx-auto p-6">
      {/* 👑 ヘッダー（アイコンを統合して整頓） */}
      <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-100">
        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
          <MaterialIcon name="person" className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            就活プロフィール設定
          </h2>
          <p className="text-xs text-slate-500">
            {email || "ログイン中のアカウント"}
          </p>
        </div>
      </div>

      {/* 🔔 通知メッセージ */}
      {message && (
        <div
          className={`p-4 rounded-2xl mb-6 text-sm font-medium ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-rose-50 text-rose-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 📝 入力フォーム */}
      <form onSubmit={handleSubmit} className="grid gap-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center">
            <span className="mr-1.5 text-slate-400">
              <MaterialIcon name="badge" />
            </span>
            氏名
          </label>
          <input
            type="text"
            className="block w-full rounded-2xl border border-slate-200 bg-white/80 shadow-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 p-3 outline-none transition-all"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="就活 太郎"
            required
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center">
              <span className="mr-1.5 text-slate-400">
                <MaterialIcon name="school" />
              </span>
              大学名
            </label>
            <input
              type="text"
              className="block w-full rounded-2xl border border-slate-200 bg-white/80 shadow-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 p-3 outline-none transition-all"
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              placeholder="〇〇大学"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center">
              <span className="mr-1.5 text-slate-400">
                <MaterialIcon name="history_edu" />
              </span>
              学部・学科
            </label>
            <input
              type="text"
              className="block w-full rounded-2xl border border-slate-200 bg-white/80 shadow-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 p-3 outline-none transition-all"
              value={faculty}
              onChange={(e) => setFaculty(e.target.value)}
              placeholder="理工学部 情報工学科"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center">
            <span className="mr-1.5 text-slate-400">
              <MaterialIcon name="trending_up" />
            </span>
            志望業界
          </label>
          <input
            type="text"
            className="block w-full rounded-2xl border border-slate-200 bg-white/80 shadow-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 p-3 outline-none transition-all"
            value={targetIndustry}
            onChange={(e) => setTargetIndustry(e.target.value)}
            placeholder="IT・ソフトウェア・通信"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center">
            <span className="mr-1.5 text-slate-400">
              <MaterialIcon name="psychology" />
            </span>
            自己PR（AI生成にも使用されます）
          </label>
          <textarea
            className="block w-full rounded-2xl border border-slate-200 bg-white/80 shadow-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 p-3 min-h-[160px] outline-none transition-all resize-none"
            value={selfPr}
            onChange={(e) => setSelfPr(e.target.value)}
            placeholder="あなたの強みや、学生時代に注力した開発、研究内容（Go、PHP、JavaScript、機械学習など）について詳しく記入してください。"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !uid}
          className={`w-full py-3.5 rounded-2xl font-semibold text-white shadow-md flex items-center justify-center space-x-2 transition-all ${
            loading || !uid
              ? "bg-slate-300 cursor-not-allowed shadow-none"
              : "bg-blue-600 hover:bg-blue-700 active:scale-[0.99]"
          }`}
        >
          <MaterialIcon name="save" className="w-5 h-5" />
          <span>{loading ? "登録中..." : "プロフィールを保存する"}</span>
        </button>
      </form>
    </div>
  );
}
