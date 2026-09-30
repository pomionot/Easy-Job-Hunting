import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "../../src/App";

test("ログイン画面を表示し、GoogleログインURLへ遷移する", async () => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    text: async () => "https://accounts.google.com/o/oauth2/auth?state=test",
  });
    render(<App />);
    expect(screen.getByRole("heading", { name: "Easy Job Hunting" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Googleアカウントでログイン/ })).toBeEnabled();
});
