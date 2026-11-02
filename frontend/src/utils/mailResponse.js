export function normalizeMailResponse(data) {
  if (Array.isArray(data)) {
    return { mails: data, nextPageToken: "" };
  }
  if (data && Array.isArray(data.mails)) {
    return { mails: data.mails, nextPageToken: data.nextPageToken || "" };
  }
  throw new Error(data?.error || "メール一覧の形式が正しくありません");
}
