import { ApiError, endpoint } from "@/lib/api";
import { finishGmailOAuth } from "@/lib/gmail/oauth";
export const runtime = "nodejs";
export const GET = endpoint(async (request) => {
  let connected: boolean;
  try {
    connected = await finishGmailOAuth(request);
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    const message = error.message.replace(
      /[&<>"']/g,
      (value) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[value]!,
    );
    return new Response(
      '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Gmail connection</title><meta name="referrer" content="no-referrer"></head><body><h1>Gmail connection could not finish</h1><p>' +
        message +
        '</p><p><a href="/admin/inbox">Return to Inbox and reconnect</a></p></body></html>',
      {
        status: error.status,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy":
            "default-src 'none'; base-uri 'none'; frame-ancestors 'none'",
        },
      },
    );
  }
  const path = "/admin/inbox?gmail=" + (connected ? "connected" : "cancelled");
  // A same-origin document navigation restores the existing Strict admin cookie
  // after the cross-site Google callback; never relax the admin session cookie.
  return new Response(
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta http-equiv="refresh" content="0;url=' +
      path +
      '"><title>Gmail connection</title></head><body><p>' +
      (connected ? "Gmail connected." : "Gmail connection cancelled.") +
      ' <a href="' +
      path +
      '">Continue to Inbox</a></p></body></html>',
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "Content-Security-Policy":
          "default-src 'none'; base-uri 'none'; frame-ancestors 'none'",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
});
