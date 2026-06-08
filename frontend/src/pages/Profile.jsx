import React, { useEffect, useState } from "react";

export default function Profile() {
  const [uid, setUid] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [university, setUniversity] = useState("");
  const [faculty, setFaculty] = useState("");
  const [targetIndustry, setTargetIndustry] = useState("");
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedUid = localStorage.getItem("login_user_uid") || "";
    const savedEmail = localStorage.getItem("login_user_email") || "";

    if (savedUid) {
      setUid(savedUid);
      fetch(
        `http://localhost:8080/api/profile?uid=${encodeURIComponent(savedUid)}`,
      )
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data) return;
          setEmail(data.email || savedEmail);
          setName(data.name || "");
          setUniversity(data.university || "");
          setFaculty(data.faculty || "");
          setTargetIndustry(data.target_industry || "");
        })
        .catch((err) => console.error("プロフィール読み込み失敗:", err));
    } else if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!uid) {
      setMessage({ type: "error", text: "ログインしてください" });
      return;
    }
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("http://localhost:8080/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: Number(uid),
          name,
          university,
          faculty,
          target_industry: targetIndustry,
        }),
      });
      const data = await res.json();
      if (data.error) setMessage({ type: "error", text: data.error });
      else setMessage({ type: "success", text: "プロフィールを保存しました" });
    } catch (err) {
      console.error("プロフィール保存エラー:", err);
      setMessage({ type: "error", text: "通信に失敗しました" });
    }

    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto mt-12 px-4">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-2xl font-semibold mb-2">👤 プロフィール登録</h2>
        <p className="text-sm text-gray-600 mb-4">
          UID: <span className="font-medium">{uid || "未ログイン"}</span> /
          Email: <span className="font-medium">{email || "未設定"}</span>
        </p>

        {message && (
          <div
            className={`mb-4 p-3 rounded ${
              message.type === "success"
                ? "bg-green-50 text-green-800"
                : "bg-red-50 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              氏名
            </label>
            <input
              className="mt-1 block w-full rounded-lg border-gray-200 shadow-sm focus:ring-2 focus:ring-blue-400 p-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="就活 太郎"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              大学名
            </label>
            <input
              className="mt-1 block w-full rounded-lg border-gray-200 shadow-sm focus:ring-2 focus:ring-blue-400 p-2"
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              placeholder="〇〇大学"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              学部・学科
            </label>
            <input
              className="mt-1 block w-full rounded-lg border-gray-200 shadow-sm focus:ring-2 focus:ring-blue-400 p-2"
              value={faculty}
              onChange={(e) => setFaculty(e.target.value)}
              placeholder="理工学部 情報工学科"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              志望業界
            </label>
            <input
              className="mt-1 block w-full rounded-lg border-gray-200 shadow-sm focus:ring-2 focus:ring-blue-400 p-2"
              value={targetIndustry}
              onChange={(e) => setTargetIndustry(e.target.value)}
              placeholder="IT・ソフトウェア・通信"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !uid}
              className={`w-full py-3 rounded-lg font-semibold text-white ${
                loading || !uid
                  ? "bg-blue-300 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading ? "登録中..." : "プロフィールを保存する"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
