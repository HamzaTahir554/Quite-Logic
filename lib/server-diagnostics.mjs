// Only fixed diagnostic labels leave this function. Driver messages can contain
// credentials, connection strings, SQL or personal data and must never be logged.
const codes = new Map([
  ["28P01", "DATABASE_AUTHENTICATION_FAILED"],
  ["28000", "DATABASE_AUTHENTICATION_FAILED"],
  ["3D000", "DATABASE_NOT_FOUND"],
  ["42P01", "DATABASE_TABLE_MISSING"],
  ["42703", "DATABASE_COLUMN_MISSING"],
  ["42501", "DATABASE_PERMISSION_DENIED"],
  ["53300", "DATABASE_CONNECTION_LIMIT"],
  ["ENOTFOUND", "DATABASE_DNS_FAILED"],
  ["EAI_AGAIN", "DATABASE_DNS_FAILED"],
  ["ECONNREFUSED", "DATABASE_CONNECTION_REFUSED"],
  ["ETIMEDOUT", "DATABASE_CONNECTION_TIMEOUT"],
  ["ENETUNREACH", "DATABASE_NETWORK_UNREACHABLE"],
  ["EHOSTUNREACH", "DATABASE_NETWORK_UNREACHABLE"],
  ["SELF_SIGNED_CERT_IN_CHAIN", "DATABASE_TLS_CERTIFICATE_FAILED"],
  ["DEPTH_ZERO_SELF_SIGNED_CERT", "DATABASE_TLS_CERTIFICATE_FAILED"],
  ["UNABLE_TO_VERIFY_LEAF_SIGNATURE", "DATABASE_TLS_CERTIFICATE_FAILED"],
  ["CERT_HAS_EXPIRED", "DATABASE_TLS_CERTIFICATE_FAILED"],
  ["ERR_TLS_CERT_ALTNAME_INVALID", "DATABASE_TLS_CERTIFICATE_FAILED"],
]);

export function safeErrorCategory(error, depth = 0) {
  if (!error || typeof error !== "object" || depth > 3)
    return "UNEXPECTED_SERVER_ERROR";
  if (error.message === "Database is not configured.")
    return "DATABASE_URL_MISSING";
  if (error.message === "Database connection string is invalid.")
    return "DATABASE_URL_INVALID";
  if (error.message === "Connection terminated due to connection timeout")
    return "DATABASE_CONNECTION_TIMEOUT";
  if (codes.has(error.code)) return codes.get(error.code);
  const children = [error.cause, ...(Array.isArray(error.errors) ? error.errors.slice(0, 4) : [])];
  for (const child of children) {
    const category = safeErrorCategory(child, depth + 1);
    if (category !== "UNEXPECTED_SERVER_ERROR") return category;
  }
  return "UNEXPECTED_SERVER_ERROR";
}
