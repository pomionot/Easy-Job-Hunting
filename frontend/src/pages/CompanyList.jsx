import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

// ステータスごとの色分け設定
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

  // 🏢 企業一覧を取得する関数
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
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  };

  // 🔄 選考ステータスを変更する関数
  const handleStatusChange = (companyId, newStatus) => {
    fetch("http://localhost:8080/api/companies/status", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: companyId, status: newStatus }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("ステータスの更新に失敗しました");
        return res.json();
      })
      .then(() => {
        // フロント側の表示をリアルタイムに更新
        setCompanies((prev) =>
          prev.map((c) =>
            c.id === companyId ? { ...c, status: newStatus } : c,
          ),
        );
      })
      .catch((err) => {
        alert(err.message);
      });
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* サイドバー */}
      <aside className="w-64 bg-slate-900 text-white p-6 hidden md:block">
        <h2 className="text-xl font-bold mb-8 tracking-wider">
          Easy Job Hunting
        </h2>
        <nav className="space-y-4">
          <Link
            to="/"
            className="block py-2.5 px-4 rounded bg-slate-800 font-semibold transition hover:bg-slate-700"
          >
            📬 メインダッシュボード
          </Link>
          <Link
            to="/company-register"
            className="block py-2.5 px-4 rounded bg-slate-800 font-semibold transition hover:bg-slate-700"
          >
            🏢 企業情報登録
          </Link>
          <a
            href="#"
            className="block py-2.5 px-4 rounded bg-blue-600 font-semibold transition"
          >
            📊 📊 企業管理リスト
          </a>
          <Link
            to="/profile"
            className="block py-2.5 px-4 rounded bg-slate-800 font-semibold transition hover:bg-slate-700"
          >
            👤 プロフィール登録
          </Link>
        </nav>
      </aside>

      {/* メインコンテンツ */}
      <main className="flex-1 p-8">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800">
            🏢 エントリー企業管理リスト
          </h1>
          <Link
            to="/company-register"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-sm transition"
          >
            + 新しい企業を追加
          </Link>
        </header>

        {error && (
          <div className="p-4 mb-6 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-sm">
            🚨 {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-500">
            企業データを読み込み中です...
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm font-semibold">
                  <th className="p-4 pl-6">企業名</th>
                  <th className="p-4">業界 / 業種</th>
                  <th className="p-4">ホームページ</th>
                  <th className="p-4 pr-6">選考ステータス</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {companies.length > 0 ? (
                  companies.map((company) => (
                    <tr
                      key={company.id}
                      className="hover:bg-slate-50 transition text-sm"
                    >
                      <td className="p-4 pl-6 font-bold text-slate-800">
                        {company.company_name}
                      </td>
                      <td className="p-4">
                        <span className="text-slate-500">
                          {company.industry || "未設定"}
                        </span>
                        {company.business_type && (
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded ml-2">
                            {company.business_type}
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        {company.homepage_url ? (
                          <a
                            href={company.homepage_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline font-medium"
                          >
                            HPを見る ↗
                          </a>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-4 pr-6">
                        <select
                          value={company.status}
                          onChange={(e) =>
                            handleStatusChange(company.id, e.target.value)
                          }
                          className={`px-3 py-1.5 rounded-full border text-xs font-bold font-sans focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer transition ${
                            statusStyles[company.status] ||
                            "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {statusOptions.map((option) => (
                            <option
                              key={option}
                              value={option}
                              className="bg-white text-slate-800"
                            >
                              {option}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-slate-400">
                      登録されている企業情報がありません。「新しい企業を追加」から登録してみましょう！
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
