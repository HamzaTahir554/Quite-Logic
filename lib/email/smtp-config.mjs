/** @param {Record<string, string | undefined>} env */
export function smtpOptions(env = process.env) {
  const host = env.SMTP_HOST?.trim() || "smtp.resend.com";
  const port = Number(env.SMTP_PORT || "465");
  const secureValue = env.SMTP_SECURE?.trim().toLowerCase();
  if (
    !/^[a-z\d.-]+$/i.test(host) ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    (secureValue && !["true", "false"].includes(secureValue))
  )
    throw new Error("Invalid SMTP server configuration.");
  const secure = secureValue
    ? secureValue === "true"
    : [465, 2465].includes(port);
  if ([465, 2465].includes(port) && !secure)
    throw new Error("SMTP TLS configuration is invalid.");
  const user =
    env.SMTP_USER?.trim() || (host === "smtp.resend.com" ? "resend" : "");
  // Never send a Resend API key to another SMTP host by accident.
  const pass =
    env.SMTP_PASSWORD ||
    (host === "smtp.resend.com" ? env.RESEND_API_KEY?.trim() : "");
  if (!user || /[\r\n]/.test(user) || !pass)
    throw new Error("SMTP authentication is not configured.");
  return {
    host,
    port,
    secure,
    requireTLS: !secure,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: true,
      minVersion: /** @type {const} */ ("TLSv1.2"),
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    logger: false,
    debug: false,
  };
}

/** @param {unknown} error */
export function smtpRetryIsSafe(error) {
  if (!error || typeof error !== "object") return false;
  const item =
    /** @type {{code?: string, command?: string, responseCode?: number}} */ (
      error
    );
  if (item.responseCode && item.responseCode >= 400 && item.responseCode <= 599)
    return true;
  if (
    [
      "EAUTH",
      "EDNS",
      "ECONNREFUSED",
      "ENOTFOUND",
      "ETLS",
      "ESOCKET",
      "ETIMEDOUT",
      "ECONNECTION",
    ].includes(item.code || "") &&
    /^(?:CONN|AUTH|EHLO|HELO|STARTTLS|MAIL FROM|RCPT TO)$/i.test(
      item.command || "",
    )
  )
    return true;
  return false;
}
