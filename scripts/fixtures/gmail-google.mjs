// Loaded ONLY by scripts/test-gmail.ts via the child Node --import flag.
import nock from "nock";
import fs from "node:fs";
export const mailbox = "official@example.test";
export const message = {
  id: "m1",
  threadId: "t1",
  internalDate: "1793030400000",
  labelIds: ["INBOX", "UNREAD"],
  snippet: "A project conversation",
  payload: {
    mimeType: "multipart/mixed",
    headers: [
      { name: "From", value: "Client <client@example.test>" },
      { name: "Reply-To", value: "reply@example.test" },
      { name: "To", value: mailbox },
      { name: "Subject", value: "Project brief" },
      { name: "Message-ID", value: "<original@example.test>" },
      { name: "References", value: "<earlier@example.test>" },
    ],
    parts: [
      {
        partId: "0",
        mimeType: "text/html",
        body: {
          data: Buffer.from(
            '<p>Hello <strong>Quiet Logic</strong></p><img src="https://tracker.invalid/pixel"><script>window.mailAttack=1</script><a href="javascript:alert(1)" onclick="alert(1)">bad</a><a href="https://example.test">Safe link</a>',
          ).toString("base64url"),
        },
      },
      {
        partId: "1",
        filename: "brief.pdf",
        mimeType: "application/pdf",
        body: { attachmentId: "a1", size: 21 },
      },
    ],
  },
};
export const sent = {
  ...message,
  id: "m2",
  internalDate: "1793030460000",
  labelIds: ["SENT"],
  payload: {
    mimeType: "text/plain",
    headers: [
      { name: "From", value: mailbox },
      { name: "To", value: "client@example.test" },
      { name: "Subject", value: "Re: Project brief" },
      { name: "Message-ID", value: "<reply@example.test>" },
    ],
    body: {
      data: Buffer.from("Thank you for the brief.").toString("base64url"),
    },
  },
};
if (process.env.QL_GMAIL_MOCK === "1") {
  const controlPath = process.env.GMAIL_TEST_CONTROL_FILE,
    statsPath = process.env.GMAIL_TEST_STATS_FILE;
  const state = {
    unread: true,
    starred: false,
    archived: false,
    sends: [],
    tokenRequests: 0,
    paths: [],
  };
  const control = () => {
    try {
      return JSON.parse(fs.readFileSync(controlPath, "utf8"));
    } catch {
      return {};
    }
  };
  const save = () => fs.writeFileSync(statsPath, JSON.stringify(state));
  save();
  nock.disableNetConnect();
  nock.enableNetConnect((host) =>
    /^(localhost|127\.0\.0\.1|\[::1\])(?::|$)/.test(host),
  );
  nock("https://oauth2.googleapis.com")
    .persist()
    .post("/token")
    .reply(() => {
      state.tokenRequests++;
      save();
      return control().mode === "revoked"
        ? [
            400,
            {
              error: "invalid_grant",
              error_description: "PRIVATE upstream credential",
            },
          ]
        : [
            200,
            {
              access_token: "fixture-access-only",
              ...(control().mode === "noRefresh"
                ? {}
                : { refresh_token: "fixture-refresh-only" }),
              expires_in: control().mode === "shortExpiry" ? 1 : 3600,
              scope: "https://www.googleapis.com/auth/gmail.modify",
              token_type: "Bearer",
            },
          ];
    });
  nock("https://oauth2.googleapis.com")
    .persist()
    .post(/\/revoke/)
    .reply(200, {});
  const fixture = () => ({
    ...message,
    labelIds: [
      ...(state.archived ? [] : ["INBOX"]),
      ...(state.unread ? ["UNREAD"] : []),
      ...(state.starred ? ["STARRED"] : []),
    ],
  });
  nock("https://gmail.googleapis.com")
    .persist()
    .get(/\/gmail\/v1\/users\/me\//)
    .reply(function (request) {
      const q = new URL(request.url);
      state.paths.push(q.pathname);
      save();
      if (control().mode === "rate")
        return [
          429,
          { error: { errors: [{ reason: "userRateLimitExceeded" }] } },
        ];
      if (q.pathname.endsWith("/profile"))
        return [
          200,
          {
            emailAddress:
              control().mode === "wrongAccount"
                ? "wrong@example.test"
                : mailbox,
          },
        ];
      if (q.pathname.endsWith("/labels/INBOX"))
        return [
          200,
          { messagesUnread: state.unread && !state.archived ? 1 : 0 },
        ];
      if (q.pathname.endsWith("/messages")) {
        const sentFolder = q.searchParams.get("labelIds") === "SENT";
        const noResults = q.searchParams.get("q")?.includes("nomatch");
        return [
          200,
          {
            messages: noResults
              ? []
              : sentFolder
                ? [{ id: "m2", threadId: "t1" }]
                : [
                    { id: "m1", threadId: "t1" },
                    ...(control().mode === "groupedThreads"
                      ? [{ id: "m3", threadId: "t1" }]
                      : []),
                  ],
            ...(!q.searchParams.get("pageToken") && !noResults
              ? { nextPageToken: "page2" }
              : {}),
          },
        ];
      }
      if (q.pathname.endsWith("/threads/t1"))
        return [200, { id: "t1", messages: [sent, fixture()] }];
      if (q.pathname.endsWith("/attachments/a1"))
        return [
          200,
          {
            size: 21,
            data: Buffer.from("%PDF-1.7 test fixture").toString("base64url"),
          },
        ];
      if (q.pathname.endsWith("/messages/m1")) return [200, fixture()];
      if (q.pathname.endsWith("/messages/m3"))
        return [200, { ...fixture(), id: "m3" }];
      if (q.pathname.endsWith("/messages/m2")) return [200, sent];
      return [404, { error: "not found" }];
    });
  nock("https://gmail.googleapis.com")
    .persist()
    .post(/\/messages\/m1\/modify/)
    .reply(async function (request) {
      const body = await request.json();
      for (const label of body.addLabelIds || []) {
        if (label === "UNREAD") state.unread = true;
        if (label === "STARRED") state.starred = true;
      }
      for (const label of body.removeLabelIds || []) {
        if (label === "UNREAD") state.unread = false;
        if (label === "STARRED") state.starred = false;
        if (label === "INBOX") state.archived = true;
      }
      save();
      return [200, { id: "m1" }];
    });
  nock("https://gmail.googleapis.com")
    .persist()
    .post(/\/messages\/send/)
    .reply(async function (request) {
      const body = await request.json();
      state.sends.push(body);
      save();
      return control().mode === "sendFailure"
        ? [503, { error: "private provider detail" }]
        : [
            200,
            {
              id: "sent" + state.sends.length,
              threadId: body.threadId || "new-thread",
            },
          ];
    });
}
