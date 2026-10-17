import { test, expect } from "@playwright/test";
import { isAllowedOrigin } from "../lib/request-origin";
const publicOrigin = "https://preview.example.test";
const internalUrl = "http://127.0.0.1:3000/api/admin/login";

test("proxy login accepts browser-confirmed HTTPS origin matching the public Host", () => {
  expect(
    isAllowedOrigin(
      new Request(internalUrl, {
        headers: {
          Origin: publicOrigin,
          Host: "preview.example.test",
          "Sec-Fetch-Site": "same-origin",
        },
      }),
      {},
    ),
  ).toBe(true);
});

test("proxy fallback rejects cross-site, forged forwarding, malformed Host, wrong ports and schemes", () => {
  const cases: Record<string, string>[] = [
    {
      Origin: publicOrigin,
      Host: "preview.example.test",
      "Sec-Fetch-Site": "cross-site",
    },
    {
      Origin: publicOrigin,
      Host: "preview.example.test",
      "Sec-Fetch-Site": "same-site",
    },
    { Origin: publicOrigin, Host: "preview.example.test" },
    {
      Origin: publicOrigin,
      "X-Forwarded-Host": "preview.example.test",
      "Sec-Fetch-Site": "same-origin",
    },
    {
      Origin: "https://evil.example.test",
      Host: "preview.example.test",
      "Sec-Fetch-Site": "same-origin",
    },
    {
      Origin: publicOrigin,
      Host: "preview.example.test:444",
      "Sec-Fetch-Site": "same-origin",
    },
    {
      Origin: "http://preview.example.test",
      Host: "preview.example.test",
      "Sec-Fetch-Site": "same-origin",
    },
    {
      Origin: publicOrigin,
      Host: "evil.test@preview.example.test",
      "Sec-Fetch-Site": "same-origin",
    },
    {
      Origin: publicOrigin,
      Host: "preview.example.test/path",
      "Sec-Fetch-Site": "same-origin",
    },
    {
      Origin: "null",
      Host: "preview.example.test",
      "Sec-Fetch-Site": "same-origin",
    },
  ];
  for (const headers of cases)
    expect(isAllowedOrigin(new Request(internalUrl, { headers }), {})).toBe(
      false,
    );
});

test("explicit hosting origin works behind proxies even without fetch metadata", () => {
  const env = { ALLOWED_ORIGINS: publicOrigin };
  expect(
    isAllowedOrigin(
      new Request(internalUrl, { headers: { Origin: publicOrigin } }),
      env,
    ),
  ).toBe(true);
  expect(
    isAllowedOrigin(
      new Request(internalUrl, { headers: { Origin: "https://evil.test" } }),
      env,
    ),
  ).toBe(false);
});
