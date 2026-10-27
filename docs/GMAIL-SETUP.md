# Admin Gmail setup

The existing Admin now has an Inbox. Gmail is the mailbox source of truth. Contact inquiries and password resets retain the existing SMTP implementation. Connecting Admin Gmail does not replace SMTP credentials or alter public contact delivery.

## Google Cloud Console: exact steps

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create/select a project, for example Quiet Logic Admin.
2. Open **APIs & Services > Library**, search for **Gmail API**, select it and click **Enable**.
3. Open **Google Auth platform > Branding**. Click **Get started** if necessary. Set the app name to Quiet Logic Admin, choose your support email, add developer contact information, and save.
4. In **Audience**, choose **External** for a normal Gmail account such as company.quitelogic@gmail.com. Choose **Internal** only if this is a Google Workspace organization and the mailbox belongs to it. While External is in Testing, add the exact official mailbox under **Test users**.
5. Open **Data Access > Add or remove scopes**. Add ONLY **https://www.googleapis.com/auth/gmail.modify**. Save. This scope includes reading, composing, sending and label management, so gmail.send would be redundant. Full mail.google.com access is not requested. [Google scope reference](https://developers.google.com/workspace/gmail/api/auth/scopes).
6. Open **Clients > Create client > Web application**. Name it Quiet Logic Admin Web. Under **Authorized redirect URIs**, add exactly:

   Development: http://localhost:3000/api/admin/gmail/callback

   Production: https://quitelogic.net/api/admin/gmail/callback **if quitelogic.net is the actual deployed APP_URL**. Otherwise substitute the exact real HTTPS application origin, including www if used. Register each environment separately. No wildcard, extra slash or query string. JavaScript origins are unnecessary for this server-side flow.

7. Create the client. Copy its **Client ID** and **Client secret** into the server environment. Do not paste them into chat, commit downloaded client JSON, or enter a Gmail account password/app password in Inbox.

## Required environment

Keep the existing MongoDB, authentication and SMTP settings. Add the following in ignored .env.local for development and the hosting application's secret/environment settings in production:

```dotenv
APP_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-web-application-client-id
GOOGLE_CLIENT_SECRET=your-web-application-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/admin/gmail/callback
GMAIL_TOKEN_ENCRYPTION_KEY=your-generated-base64-key
GMAIL_ACCOUNT_EMAIL=company.quitelogic@gmail.com
```

GOOGLE_REDIRECT_URI is optional: the server defaults it to APP_URL + /api/admin/gmail/callback. APP_URL (or existing NEXT_PUBLIC_SITE_URL as fallback) must be the canonical application origin. Production uses HTTPS. Set GOOGLE_REDIRECT_URI to the matching production callback, and APP_URL to the actual HTTPS origin. Keep different development and production credentials/keys where practical.

GMAIL_ACCOUNT_EMAIL is optional but recommended. When set, the server rejects any other authorized mailbox; it never trusts the login hint as identity. The displayed From/account address comes from Google's authenticated Gmail profile.

Generate the encryption key once in your own terminal:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Copy the output privately to GMAIL_TOKEN_ENCRYPTION_KEY. This is a separate AES-256-GCM key, not your Google client secret or an SMTP password. Keep it stable across app instances and restarts. Back it up securely alongside the database recovery plan. Changing or losing it prevents existing stored tokens from being decrypted; reconnect the mailbox after a deliberate key change. No credentials were generated, connected or deployed automatically in this implementation.

Restart the dev server/redeploy after adding server variables. On Windows, use npm.cmd if PowerShell blocks npm.ps1.

## Connect and verify the real mailbox

1. Sign in to the existing Admin account and open **Inbox**.
2. Click **Connect Gmail**. Choose the official mailbox and grant the displayed Gmail permission. Google returns to the configured callback, then Inbox.
3. Confirm the connected address is correct. Have a trusted test account send a test email to it; click Refresh, open the conversation, and verify it becomes read.
4. Reply from Admin, verify receipt in the test account and that it remains in the same Gmail thread. Compose a separate test message with a small PDF/PNG attachment. Verify delivery and the Sent view. Download the attachment from Admin.
5. Test Search, Mark unread, Star/Unstar and Archive. Archive removes INBOX; it does not delete mail. Check the unread badge and mobile list/detail navigation.
6. In **Connection settings** (the existing /admin/settings Social Links/Settings page), Disconnect Gmail removes local credentials and attempts Google revocation. If the revocation request fails, the UI tells you to remove access from your Google account as well.
7. To verify expiry/reconnect, revoke access in the Google account, then refresh Inbox. The app must show Reconnect Gmail. Reconnect to resume.

The current workspace has no Google OAuth client configured, and the developer confirmed Cloud setup has not yet been done. Therefore actual consent, receiving from the live mailbox and external delivery are **not yet verified**. Tests use simulated Google responses and cannot establish real Gmail delivery.

## Production readiness

If the variables are saved but Connect Gmail stays disabled, check the running application rather than repeating Google Console setup. The authenticated `/api/admin/gmail/status` response now includes a safe `configurationError` naming missing variables, invalid encryption-key format, extra quotes/`KEY=` prefixes, or an origin/callback mismatch. The Admin connection panel displays that specific message and offers **Check configuration again**. Credential values are never included. Leading/trailing whitespace is ignored. Apply the saved Hostinger environment variables and restart the correct Node application; a new code version must be redeployed to show these diagnostics. `.env.example` is only a blank template and is never loaded as runtime configuration. When importing an environment file, retain the existing MongoDB and SMTP rows.

- Gmail.modify is a **restricted** Google scope. External apps may need Google's restricted-scope verification and a security assessment because this app processes Gmail data on a server. Review the requirements for your use case and any applicable internal/personal-use exception. Do not assume a private Admin automatically qualifies. Google Workspace Internal use has different requirements. See [Google consent configuration](https://developers.google.com/workspace/guides/configure-oauth-consent) and [Gmail scope/assessment rules](https://developers.google.com/workspace/gmail/api/auth/scopes).
- External apps in **Testing** can have short-lived refresh tokens; review [Google refresh-token expiration rules](https://developers.google.com/identity/protocols/oauth2#expiration). Use the appropriate publishing/verification state for continuous production use rather than assuming Testing gives indefinite access.
- Complete Google-requested branding, domain ownership, homepage/privacy-policy and verification details for your deployment. These cannot be completed from this codebase alone.
- Register the exact production callback before connecting. Enable Gmail API in the same Cloud project as the OAuth client. A Workspace administrator may need to allow the app.
- Retain HTTPS, existing secure Admin sessions, private MongoDB access and encrypted backups. Mask/exclude OAuth callback query strings in hosting/reverse-proxy access logs; this implementation suppresses Next development logging for that callback and never logs Google errors/tokens itself.
- All mailbox routes require authenticated Admin access. The callback validates the still-live original Admin session through its one-time browser-bound OAuth state. This preserves the existing SameSite=Strict Admin cookie; a separate HttpOnly Lax nonce cookie supports Google's cross-site callback.
- Single official mailbox shared by authorized Admin users. Restrict who can create Admin accounts accordingly.

## Implementation behavior and limits

- OAuth authorization-code flow, offline refresh token, S256 PKCE, ten-minute single-use state, encrypted server-side refresh token. Access tokens stay only in server memory; Google SDK handles refresh automatically.
- Inbox, Sent, Starred, server-side Gmail search, 25-message pages, metadata/structure-only lists, full chronological thread on demand. Bodies/attachments are not copied to MongoDB.
- Polling every 45 seconds while visible, manual refresh, lightweight INBOX label unread count. No Pub/Sub watch, webhook or watch-renewal infrastructure was added.
- HTML is sanitized server-side with a strict tag/attribute/URL allowlist. Scripts, forms, frames, event handlers, styling and remote images/tracking pixels are removed. Plain text is supported. Remote/inline email images are intentionally not embedded; attached files remain downloadable.
- Compose has To/CC/BCC, subject and plain-text editor; replies use trusted Reply-To/From, the original Message-ID/References, subject and Gmail threadId. The connected account is always From. No arbitrary sender spoofing or permanent deletion API.
- Send up to five PDF, DOCX, XLSX, PNG or JPG files: 10 MB each, 15 MB total; server checks size, content signature, MIME and sanitized filename. ZIP archives are intentionally not accepted. Received attachments up to 25 MB download through authenticated routes as octet-stream with attachment disposition.
- Unique request receipts prevent double sends/concurrent submissions. An ambiguous failure is shown as unconfirmed and is never blindly retried; check Sent first. Receipts hold only request fingerprint, mailbox, IDs and status, expire after seven days, and do not store message bodies or attachment bytes. Drafts live only in the compose component until sent/discarded.

## Local validation

```sh
npm run lint
npm run typecheck
npm run build
npm run test:gmail
```

The Gmail suite uses disposable local MongoDB, a production Next server on port 3261, Chromium, and a Google HTTP fixture loaded only into that child process. It blocks non-local/non-fixture network access in the app process, overrides real MongoDB/SMTP/Google settings, never sends real email, and shuts services down afterward. The first run may download the existing project's MongoDB test binary; Chromium must be available. The production build must exist first.
