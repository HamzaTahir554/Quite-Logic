# Hostinger admin login origin configuration

The deployed login at `https://palegoldenrod-rhinoceros-335764.hostingersite.com/admin/login` returns HTTP 403 (`Please reload this page and try again.`) even for an empty same-origin JSON request. This rejection occurs before password verification. The Supabase account exists and the private ADMIN_SETUP_EMAIL / ADMIN_SETUP_PASSWORD values matched its stored password hash when checked; the account was not reset.

## Fix the current deployment

In the Hostinger Node.js application's environment-variable settings, add:

```dotenv
ALLOWED_ORIGINS=https://palegoldenrod-rhinoceros-335764.hostingersite.com
NEXT_PUBLIC_SITE_URL=https://palegoldenrod-rhinoceros-335764.hostingersite.com
```

Use bare values in hPanel, without quotes. ALLOWED_ORIGINS contains the origin only, without `/admin/login` or a trailing path. If additional genuine website origins are already configured, retain them and append this origin separated by a comma. Do not use wildcards.

Save and redeploy/restart the Node.js app so its process receives the changed environment. NEXT_PUBLIC_SITE_URL is also used during the build for public metadata, so rebuild after changing it. These settings work with the already-deployed origin helper; no password reset or database migration is required.

Visit the HTTPS login URL and enter the existing admin email/password. The private local values can be found in `.env.local` under ADMIN_SETUP_EMAIL and ADMIN_SETUP_PASSWORD. Do not publish that file, paste credentials into chat, or add the bootstrap password to public hosting settings.

When moving from the preview hostname to the final custom domain, update the public URL and trusted-origin list accordingly. Restart/rebuild again.

## Application change

`lib/request-origin.ts` now also accepts HTTPS browser requests marked Sec-Fetch-Site:same-origin when Origin exactly matches the public Host header, even if the internal Next.js request URL uses another authority. It still rejects arbitrary forwarded-host headers, missing/null origins, cross-site metadata, malformed hosts, scheme differences, and port mismatches. Explicit configured origins remain the reliable fallback when a proxy rewrites Host too.

This follows the browser-controlled Fetch Metadata header model documented by [MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Sec-Fetch-Site) and the [OWASP CSRF guidance](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html). The application change must be deployed to affect the hosted code. Hostinger environment settings were not changed by this local edit.

## Verification

- Production build and TypeScript compilation passed.
- Four origin-security tests passed, including existing allowlist/loopback behavior and the new proxy fallback/rejection cases.
- Against the real Supabase account, the updated local production app accepted the existing private admin credentials with an HTTPS public Origin, matching public Host, and browser same-origin metadata: HTTP 200 and a session cookie. The test session was removed using logout. The password was not changed.
- The publicly deployed Hostinger app was independently checked and still returned 403 for its own origin before any remote environment/code change. Do not confuse local verification with deployment completion.
