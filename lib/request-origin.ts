// Only server configuration is trusted for proxy/public origins; forwarded headers
// alone never expand this allowlist.
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
  const loopback = (host: string) =>
    ["localhost", "127.0.0.1", "[::1]"].includes(host);
  return (
    loopback(origin.hostname) &&
    loopback(destination.hostname) &&
    origin.protocol === destination.protocol &&
    origin.port === destination.port
  );
}
