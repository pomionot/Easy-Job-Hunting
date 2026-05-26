import React, { useState, useEffect } from "react";
import Dashboard from "./Dashboard"; // さっき作った画面をインポート

const GoogleIcon = () => (
  <svg
    className="w-5 h-5 mr-2"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false); // ログイン状態を管理
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 💡 テスト用：URLに「login=success」が入っていたらログイン状態にする簡易判定
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("login") === "success") {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("http://localhost:8080/login");
      if (!response.ok) throw new Error("サーバーからのURL取得に失敗したで");

      const text = await response.text();
      const urlMatch = text.match(/https?:\/\/[\w!?/+\-_~=;.,*&@#$()%]+/g);

      if (urlMatch && urlMatch[0]) {
        window.location.href = urlMatch[0];
      } else {
        throw new Error("URLの解析に失敗したで");
      }
    } catch (err) {
      setError(err.message || "エラーが発生しました");
      setLoading(false);
    }
  };

  // 1. ログイン済みならダッシュボード画面を表示
  if (isLoggedIn) {
    return <Dashboard />;
  }

  // 2. 未ログインならログイン画面を表示
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-2">
            Easy Job Hunting
          </h1>
          <p className="text-sm text-slate-500">
            就活メールを全自動で整理・スケジュール化
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl">
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center bg-white hover:bg-slate-50 text-slate-700 font-semibold py-3 px-4 border border-slate-300 rounded-xl shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <GoogleIcon />
          {loading ? "接続中..." : "Googleアカウントでログイン"}
        </button>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">
            ログインすると、Gmailから就活関連のメールを自動で解析します。
          </p>
        </div>
      </div>
    </div>
  );
}
