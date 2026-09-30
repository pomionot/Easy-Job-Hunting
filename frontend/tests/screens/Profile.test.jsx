import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Profile from "../../src/pages/Profile";

test("プロフィールを読み込み、保存する", async () => {
  localStorage.setItem("login_user_uid", "42");
  localStorage.setItem("login_user_email", "student@example.com");
  global.fetch = vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ name: "就活 太郎", university: "例大学", faculty: "情報学部", target_industry: "IT", self_pr: "強み" }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

  render(<Profile />, { wrapper: MemoryRouter });
  expect(await screen.findByDisplayValue("就活 太郎")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "プロフィールを保存する" }));
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("http://localhost:8080/api/profile", expect.objectContaining({ method: "POST" })));
});
