const { appendFileSync } = require("node:fs");
module.exports = {
  createTransport() {
    return {
      async sendMail(mail) {
        if (!process.env.QUIET_TEST_MAILBOX)
          throw new Error("No isolated mail capture configured.");
        if (
          String(mail.subject).includes("[FAIL]") ||
          String(mail.text).includes("[FAIL]")
        )
          throw new Error("Simulated SMTP failure");
        appendFileSync(
          process.env.QUIET_TEST_MAILBOX,
          JSON.stringify(mail) + "\n",
          "utf8",
        );
        return {
          messageId: "local-test-message",
          accepted: [mail.to],
          rejected: [],
        };
      },
      close() {},
      async verify() {
        return true;
      },
    };
  },
};
