// Forwarded headers alone never expand this allowlist. Browser-confirmed HTTPS
// same-origin requests may match Host when a proxy exposes an internal URL.
export function isAllowedOrigin(
  request: Request,
  env: Record<string, string | undefined> = process.env,
) {
  const raw = request.headers.get("origin");
  if (!raw || raw === "null") return false;
  let origin: URL;
  let destination: URL;
  try {
    origin = new URL(raw);
    destination = new URL(request.url);
  } catch {
    return false;
  }
  if (origin.origin !== raw || !["http:", "https:"].includes(origin.protocol))
    return false;
  const allowed = [
    destination.origin,
    env.NEXT_PUBLIC_SITE_URL,
    ...(env.ALLOWED_ORIGINS || "").split(","),
    env.VERCEL_URL ? `https://${env.VERCEL_URL}` : undefined,
    env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined,
  ];
  if (
    allowed.some((value) => {
      try {
        return !!value && new URL(value.trim()).origin === origin.origin;
      } catch {
        return false;
      }
    })
  )
    return true;
  const host = request.headers.get("host");
  if (
    origin.protocol === "https:" &&
    request.headers.get("sec-fetch-site") === "same-origin" &&
    host &&
    !/[\s,/@\\?#]/.test(host)
  ) {
    try {
      // Host is the addressed authority; Sec-Fetch-Site is browser-controlled.
      // Never substitute x-forwarded-host supplied by an arbitrary caller.
      if (new URL("https://" + host).origin === origin.origin) return true;
    } catch {}
  }
  const loopback = (host: string) =>
    ["localhost", "127.0.0.1", "[::1]"].includes(host);
  return (
    loopback(origin.hostname) &&
    loopback(destination.hostname) &&
    origin.protocol === destination.protocol &&
    origin.port === destination.port
  );
}
