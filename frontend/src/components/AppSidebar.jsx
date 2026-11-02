import { Link } from "react-router-dom";

const navItems = [
  ["/dashboard", "fa-solid fa-house", "ホーム"],
  ["/mails", "fa-regular fa-envelope", "メール一覧"],
  ["/company-list", "fa-regular fa-building", "企業管理リスト"],
  ["/roadmap", "fa-solid fa-map-location-dot", "就活ロードマップ"],
  ["/profile", "fa-regular fa-id-card", "プロフィール設定"],
  ["/mail-filters", "fa-solid fa-sliders", "メールフィルター"],
];

export default function AppSidebar({ activePath }) {
  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch (error) {
      console.error("ログアウトAPIの呼び出しに失敗しました:", error);
    } finally {
      localStorage.removeItem("login_user_uid");
      localStorage.removeItem("login_user_email");
      sessionStorage.removeItem("forced_reload_done");
      sessionStorage.removeItem("mail_list_reloaded");
      window.location.replace("/");
    }
  };

  return (
    <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-gray-100">
        <Link to="/dashboard" className="text-xl font-bold text-orange-600 flex items-center gap-2">
          <i className="fa-solid fa-seedling" aria-hidden="true" />
          Easy Job Hunting
        </Link>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navItems.map(([to, icon, label]) => (
          <Link
            key={to}
            to={to}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${to === activePath ? "bg-orange-50 text-orange-600" : "text-gray-600 hover:bg-gray-50 hover:text-orange-500"}`}
          >
            <i className={`${icon} w-5`} aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-gray-100 p-4">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <i className="fa-solid fa-right-from-bracket w-5" aria-hidden="true" />
          ログアウト
        </button>
      </div>
    </aside>
  );
}
