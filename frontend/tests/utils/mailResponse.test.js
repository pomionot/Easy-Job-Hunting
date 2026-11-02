import { describe, expect, it } from "vitest";
import { normalizeMailResponse } from "../../src/utils/mailResponse";

describe("normalizeMailResponse", () => {
  it("normalizes the paginated API response", () => {
    const mails = [{ id: "mail-1", subject: "Interview" }];

    expect(normalizeMailResponse({ mails, nextPageToken: "next" })).toEqual({
      mails,
      nextPageToken: "next",
    });
  });

  it("supports the legacy array response without hiding invalid data", () => {
    const mails = [{ id: "mail-1" }];

    expect(normalizeMailResponse(mails)).toEqual({
      mails,
      nextPageToken: "",
    });
    expect(() => normalizeMailResponse({ error: "API failed" })).toThrow("API failed");
  });
});
