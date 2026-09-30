import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CompanyRoadmap from "../../src/pages/CompanyRoadmap";

test("企業別ロードマップと現在地を表示する", async () => {
  localStorage.setItem("login_user_uid", "42");
  global.fetch = vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 1, company_name: "Example株式会社", status: "面接中" }] })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        total_steps: 2,
        completed_count: 1,
        progress_rate: 50,
        current_step: { id: 2, title: "一次面接", next_action: "自己PRを準備", notes: "練習" },
        steps: [
          { id: 1, title: "企業研究", status: "completed", next_action: "完了" },
          { id: 2, title: "一次面接", status: "current", next_action: "自己PRを準備" },
        ],
      }),
    })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ advice: "具体的な対策" }) });

  render(<CompanyRoadmap />, { wrapper: MemoryRouter });
  expect((await screen.findAllByText("一次面接")).length).toBeGreaterThanOrEqual(2);
  expect((screen.getAllByText("自己PRを準備")).length).toBeGreaterThanOrEqual(2);
  fireEvent.click(screen.getByRole("button", { name: /AI対策アドバイス/ }));
  expect(screen.getByText("Gemini 就活アドバイス")).toBeInTheDocument();
});
