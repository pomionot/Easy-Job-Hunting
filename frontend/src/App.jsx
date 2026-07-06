import React, { useState, useEffect } from "react";
import Dashboard from "./Dashboard"; // さっき作った画面をインポート
import MailList from "./pages/MailList";
import Profile from "./pages/Profile";
import CompanyRegister from "./pages/CompanyRegister";
import CompanyList from "./pages/CompanyList";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import MaterialIcon from "./components/MaterialIcon";

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
    const uid = params.get("uid");
    if (uid) {
      localStorage.setItem("login_user_uid", uid);
    }
    const email = params.get("email");
    if (email) {
      localStorage.setItem("login_user_email", email);
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

  const LoginScreen = () => (
    <div className="app-shell min-h-screen soft-grid flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="section-card glass-panel relative overflow-hidden w-full max-w-5xl grid lg:grid-cols-[1.15fr_0.85fr]">
        <div className="p-8 sm:p-10 lg:p-12 text-left relative z-10">
          <div className="chip mb-6 w-fit">
            <MaterialIcon name="rocket_launch" className="text-[20px]" />
            就活の流れをまとめて整理
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-4">
            Easy Job Hunting
          </h1>
          <p className="text-base sm:text-lg text-slate-600 leading-7 max-w-xl">
            Gmail・選考予定・企業メモを一つにまとめて、就活の見通しをすっきり整えます。
          </p>

          <div className="grid sm:grid-cols-3 gap-3 mt-8">
            {[
              ["auto_awesome", "メール自動整理"],
              ["event", "選考予定を可視化"],
              ["description", "企業情報を一元管理"],
            ].map(([icon, label]) => (
              <div
                key={label}
                className="rounded-2xl border border-slate-200/70 bg-white/65 p-4 text-sm text-slate-700 shadow-sm"
              >
                <MaterialIcon name={icon} className="text-[22px] mb-2" />
                <div className="font-semibold text-slate-900">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 sm:p-8 lg:p-10 bg-slate-950/92 text-left text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.32),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.22),transparent_26%)]" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-blue-100">
              <MaterialIcon
                name="shield"
                className="text-[18px] text-blue-200"
              />
              Googleアカウントで安全に開始
            </div>

            <div className="mt-8">
              <h2 className="text-2xl font-bold text-white mb-3">ログイン</h2>
              <p className="text-sm text-slate-300 leading-6">
                ログイン後はメール解析と選考管理をまとめて利用できます。
              </p>
            </div>

            {error && (
              <div className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
                {error}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              className="app-button app-button-primary mt-6 w-full inline-flex items-center justify-center gap-3 rounded-2xl px-5 py-4 font-semibold shadow-lg shadow-blue-950/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <MaterialIcon name="login" className="text-[22px] text-white" />
              {loading ? "接続中..." : "Googleアカウントでログイン"}
            </button>

            <div className="mt-6 grid gap-3 text-sm text-slate-300">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                <MaterialIcon
                  name="mail"
                  className="text-[20px] text-blue-200"
                />
                Gmailから就活関連メールを抽出
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                <MaterialIcon
                  name="calendar_month"
                  className="text-[20px] text-blue-200"
                />
                面接や選考日程を見やすく整理
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            isLoggedIn ? <Navigate to="/dashboard" replace /> : <LoginScreen />
          }
        />
        <Route
          path="/dashboard"
          element={isLoggedIn ? <Dashboard /> : <Navigate to="/" replace />}
        />
        <Route
          path="/profile"
          element={isLoggedIn ? <Profile /> : <Navigate to="/" replace />}
        />
        <Route
          path="/company-register"
          element={
            isLoggedIn ? <CompanyRegister /> : <Navigate to="/" replace />
          }
        />
        <Route path="/mails" element={<MailList />} />
        <Route path="/company-list" element={<CompanyList />} />
      </Routes>
    </BrowserRouter>
  );
}
