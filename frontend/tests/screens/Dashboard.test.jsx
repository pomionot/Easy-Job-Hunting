import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Dashboard from "../../src/Dashboard";

test("ダッシュボードを表示し、主要APIを呼び出す", async () => {
  localStorage.setItem("login_user_uid", "42");
  global.fetch = vi.fn().mockImplementation((url) => {
    if (url.includes("/api/companies")) return Promise.resolve({ ok: true, json: async () => [] });
    if (url.includes("/api/roadmaps")) return Promise.resolve({ ok: true, json: async () => [] });
    return Promise.resolve({ ok: true, json: async () => [] });
  });

  render(<Dashboard />, { wrapper: MemoryRouter });
  expect(screen.getByRole("heading", { name: "ダッシュボード" })).toBeInTheDocument();
  await waitFor(() => expect(global.fetch).toHaveBeenCalled());
});
