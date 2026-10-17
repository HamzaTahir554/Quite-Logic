# Resend sending DNS ? quitelogic.com

Generated from the new Resend domain verification entry. These are public DNS values, not email credentials.

| Purpose | Type | Name | Priority | Value |
| --- | --- | --- | --- | --- |
| DKIM | TXT | resend._domainkey | ? | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDK9HA7OXf1B67TvpSUxhSmwWpGH7YYFZ1PPitABkjE0d42cAEh1ZPThWTZuLxxMB022tgGYCPA86YwTMALr6/8YOgcmTdvsZr6eIhq4ap1azsEPLW+lZAsPE2f98ajui2WCVCoOaLtMZ2J8xBMWb/JQS9cFlXwmEknkg6VK8WqrQIDAQAB` |
| SPF | MX | send | 10 | `feedback-smtp.us-east-1.amazonses.com` |
| SPF | TXT | send | ? | `v=spf1 include:amazonses.com ~all` |
| SPF | CNAME | rsend | ? | `send.forge.rmta.net` |

Add these records at the authoritative DNS provider for **quitelogic.com**, then select Verify in Resend. Use the full TXT value, including the entire DKIM public key. DNS interfaces may append the domain automatically; follow their name-field convention. Do not edit the existing quitelogic.net records. Receiving MX records are a separate configuration.
