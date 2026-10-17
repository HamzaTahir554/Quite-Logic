// Isolated SMTP fixture, injected only by test-mail-hook.mjs.
const { appendFileSync } = require("node:fs");
const { randomUUID } = require("node:crypto");
module.exports = {
  createTransport(options) {
    if (
      !options.tls.rejectUnauthorized ||
      (!options.secure && !options.requireTLS)
    )
      throw new Error("TLS must be required in the SMTP fixture.");
    return {
      async verify() {
        return true;
      },
      async sendMail(mail) {
        if (!process.env.QUIET_TEST_MAILBOX)
          throw new Error("No isolated SMTP capture configured.");
        if (
          String(mail.subject).includes("[FAIL]") ||
          String(mail.text).includes("[FAIL]")
        ) {
          const error = new Error("Simulated SMTP rejection");
          error.code = "EENVELOPE";
          error.responseCode = 550;
          error.command = "DATA";
          throw error;
        }
        const id = mail.messageId || randomUUID();
        appendFileSync(
          process.env.QUIET_TEST_MAILBOX,
          JSON.stringify({ ...mail, id, transport: "smtp" }) + "\n",
          "utf8",
        );
        if (String(mail.text).includes("[UNCERTAIN]")) {
          const error = new Error("Simulated disconnect after DATA");
          error.code = "ESOCKET";
          error.command = "DATA";
          throw error;
        }
        return { messageId: id, accepted: [mail.to], rejected: [] };
      },
      close() {},
    };
  },
};
