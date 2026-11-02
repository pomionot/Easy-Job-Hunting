import React, { useState } from "react";
import Dashboard from "./Dashboard"; // さっき作った画面をインポート
import MailList from "./pages/MailList";
import MailFilterSettings from "./pages/MailFilterSettings";
import Profile from "./pages/Profile";
import CompanyRegister from "./pages/CompanyRegister";
import CompanyList from "./pages/CompanyList";
import CompanyRoadmap from "./pages/CompanyRoadmap";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

function initializeAuth() {
  const params = new URLSearchParams(window.location.search);
  const uid = params.get("uid");
  const email = params.get("email");

  if (uid) {
    localStorage.setItem("login_user_uid", uid);
  }
  if (email) {
    localStorage.setItem("login_user_email", email);
  }

  if (uid || email || params.get("login") === "success") {
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  return {
    isLoggedIn: params.get("login") === "success" ||
      Boolean(localStorage.getItem("login_user_uid")),
  };
}

export default function App() {
  const [isLoggedIn] = useState(() => initializeAuth().isLoggedIn); // ログイン状態を管理
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/login");
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
    <main className="login-page">
      <div className="login-container">
        <section className="login-overview">
          <div className="login-eyebrow">
            <i className="fa-solid fa-rocket login-icon" aria-hidden="true" />
            就活の流れをまとめて整理
          </div>
          <h1>Easy Job Hunting</h1>
          <p className="login-lead">
            Gmail・選考予定・企業メモを一つにまとめて、就活の見通しをすっきり整えます。
          </p>

          <div className="login-features">
            {[
              ["fa-wand-magic-sparkles", "メール自動整理"],
              ["fa-calendar-check", "選考予定を可視化"],
              ["fa-building", "企業情報を一元管理"],
            ].map(([icon, label]) => (
              <div key={label} className="login-feature">
                <i className={`fa-solid ${icon} login-icon`} aria-hidden="true" />
                <h2>{label}</h2>
              </div>
            ))}
          </div>
        </section>

        <section className="login-action">
          <div className="login-action-content">
            <div className="login-security">
              <i className="fa-solid fa-shield-halved login-icon" aria-hidden="true" />
              Googleアカウントで安全に開始
            </div>

            <h2 className="login-title">ログイン</h2>
            <p className="login-description">
              ログイン後はメール解析と選考管理をまとめて利用できます。
            </p>

            {error && (
              <div className="login-error" role="alert">
                {error}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              className="login-button"
            >
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google"
                className="login-google-icon"
              />
              {loading ? "接続中..." : "Googleアカウントでログイン"}
            </button>

            <div className="login-benefits">
              <div className="login-benefit">
                <span className="login-benefit-icon">
                  <i className="fa-regular fa-envelope" aria-hidden="true" />
                </span>
                <p>Gmailから就活関連メールを抽出</p>
              </div>
              <div className="login-benefit">
                <span className="login-benefit-icon">
                  <i className="fa-regular fa-calendar" aria-hidden="true" />
                </span>
                <p>面接や選考日程を見やすく整理</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
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
        <Route
          path="/mails"
          element={isLoggedIn ? <MailList /> : <Navigate to="/" replace />}
        />
        <Route
          path="/mail-filters"
          element={isLoggedIn ? <MailFilterSettings /> : <Navigate to="/" replace />}
        />
        <Route
          path="/company-list"
          element={isLoggedIn ? <CompanyList /> : <Navigate to="/" replace />}
        />
        <Route
          path="/roadmap"
          element={isLoggedIn ? <CompanyRoadmap /> : <Navigate to="/" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}
