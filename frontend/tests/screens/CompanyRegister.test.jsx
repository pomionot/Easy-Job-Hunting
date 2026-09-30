import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CompanyRegister from "../../src/pages/CompanyRegister";

test("企業情報を入力して登録する", async () => {
  localStorage.setItem("login_user_uid", "42");
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });

  render(<CompanyRegister />, { wrapper: MemoryRouter });
  fireEvent.change(screen.getByLabelText(/企業名/), { target: { value: "Example株式会社" } });
  fireEvent.click(screen.getByRole("button", { name: "企業情報を保存する" }));
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("http://localhost:8080/api/companies", expect.objectContaining({ method: "POST" })));
});
