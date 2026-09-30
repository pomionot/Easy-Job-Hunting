import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MailList from "../../src/pages/MailList";

const jsonResponse = (data) => ({
  ok: true,
  headers: { get: () => "application/json" },
  json: async () => data,
});

test("メール一覧を表示し、選択した本文を取得する", async () => {
  localStorage.setItem("login_user_uid", "42");
  global.fetch = vi.fn()
    .mockResolvedValueOnce(jsonResponse([{ id: "mail-1", from: "採用担当 <hr@example.com>", subject: "面接案内", date: "2026-10-01 10:00", snippet: "面接のお知らせ" }]))
    .mockResolvedValueOnce(jsonResponse({ id: "mail-1", from: "採用担当 <hr@example.com>", subject: "面接案内", date: "2026-10-01 10:00", body: "本文" }));

  render(<MailList />, { wrapper: MemoryRouter });
  expect(await screen.findByText("面接案内")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /面接案内/ }));
  expect(await screen.findByText("本文")).toBeInTheDocument();
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
});
