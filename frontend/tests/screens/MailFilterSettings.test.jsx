import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MailFilterSettings from "../../src/pages/MailFilterSettings";

test("メールフィルターを表示し、新しい送信元を追加する", async () => {
  localStorage.setItem("login_user_uid", "42");
  global.fetch = vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ include_emails: [], exclude_emails: [] }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 1 }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ include_emails: [{ id: 1, email: "hr@example.com" }], exclude_emails: [] }) });

  render(<MailFilterSettings />, { wrapper: MemoryRouter });
  const input = await screen.findByPlaceholderText("例: recruit@company.com");
  fireEvent.change(input, { target: { value: "hr@example.com" } });
  fireEvent.click(screen.getByRole("button", { name: "追加する" }));
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/mail-filters/items", expect.objectContaining({ method: "POST" })));
});
