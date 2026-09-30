import { fireEvent, render, screen } from "@testing-library/react";
import EventExtractModal from "../../src/components/EventExtractModal";

test("メール本文から抽出した予定を編集して保存する", async () => {
  localStorage.setItem("login_user_uid", "42");
  global.fetch = vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ has_event: true, events: [{ company: "Example", title: "一次面接", date: "2026-10-02", start_time: "10:00", end_time: "11:00", notes: "オンライン" }] }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

  render(<EventExtractModal mail={{ id: "mail-1", subject: "面接", from: "hr@example.com", body: "日時: 2026/10/02 10:00" }} isOpen onClose={vi.fn()} onSave={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "イベントを抽出" }));
  expect(await screen.findByDisplayValue("Example")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("企業名"), { target: { value: "Updated" } });
  expect(screen.getByDisplayValue("Updated")).toBeInTheDocument();
});
