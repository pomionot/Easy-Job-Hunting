import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CompanyList from "../../src/pages/CompanyList";

test("企業一覧とロードマップ概要を表示し、ステータスを更新する", async () => {
  localStorage.setItem("login_user_uid", "42");
  global.fetch = vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 1, company_name: "Example株式会社", industry: "IT", business_type: "開発", status: "エントリー前" }] })
    .mockResolvedValueOnce({ ok: true, json: async () => [] })
    .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

  render(<CompanyList />, { wrapper: MemoryRouter });
  expect(await screen.findByText("Example株式会社")).toBeInTheDocument();
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "面接中" } });
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("http://localhost:8080/api/companies/status", expect.objectContaining({ method: "PUT" })));
});
