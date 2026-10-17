export function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!,
  );
}
export function messageTemplate(title: string, text: string) {
  return `<!doctype html><html><body style="margin:0;background:#eef1f5;color:#263341;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #dce2e9"><tr><td style="padding:28px;border-top:4px solid #2F80FE"><p style="color:#2F80FE;font-size:14px;font-weight:bold">Quiet Logic</p><h1 style="font-size:24px;line-height:1.3">${escapeHtml(title)}</h1><p style="font-size:16px;line-height:1.7;overflow-wrap:anywhere">${escapeHtml(text).replace(/\n/g, "<br>")}</p></td></tr></table></td></tr></table></body></html>`;
}
