"use client";
import { useRef, useState } from "react";
import { useGmailStatus } from "./GmailStatus";
import { apiCall } from "../useAdminList";
import { useAdminFeedback } from "../AdminFeedback";
import FabricButton from "@/components/ui/FabricButton";
export default function GmailConnection({
  settings = false,
}: {
  settings?: boolean;
}) {
  const { status, error, refresh } = useGmailStatus();
  const [busy, setBusy] = useState(false),
    [failure, setFailure] = useState("");
  const inFlight = useRef(false);
  const { confirm, notify } = useAdminFeedback();
  async function connect() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setFailure("");
    try {
      const result = await apiCall("/api/admin/gmail/connect", "POST");
      window.location.assign(result.url);
    } catch (error) {
      setFailure(
        error instanceof Error ? error.message : "Gmail could not connect.",
      );
      setBusy(false);
      inFlight.current = false;
    }
  }
  async function disconnect() {
    if (
      inFlight.current ||
      !(await confirm({
        title: "Disconnect Gmail?",
        description:
          "Your messages stay in Gmail. Admin Inbox access will stop until you reconnect.",
        action: "Disconnect Gmail",
      }))
    )
      return;
    inFlight.current = true;
    setBusy(true);
    setFailure("");
    try {
      const result = await apiCall("/api/admin/gmail/disconnect", "POST");
      await refresh();
      notify(result.message);
    } catch (error) {
      setFailure(
        error instanceof Error ? error.message : "Could not disconnect Gmail.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="admin-panel gmail-connection">
      <span className="admin-eyebrow">OFFICIAL MAILBOX</span>
      <h2>
        {status?.connected
          ? "Gmail connected"
          : status?.reconnect
            ? "Reconnect Gmail"
            : "Connect Gmail"}
      </h2>
      <p>
        {status?.connected
          ? status.accountEmail
          : status?.reconnect
            ? "Gmail connection expired. Reconnect Gmail to continue."
            : "Connect the Quiet Logic mailbox to receive and send emails directly from your Admin Panel."}
      </p>
      {(failure || error) && (
        <p role="alert" className="admin-error">
          {failure || error}
        </p>
      )}
      {!status && !error && <p role="status">Checking connection...</p>}
      {status && !status.configured && (
        <p role="alert" className="admin-error">
          {status.configurationError ||
            "The running server could not validate Gmail configuration. Apply the saved environment variables and restart the application."}
        </p>
      )}
      {status?.connected ? (
        settings && (
          <button className="admin-button" onClick={disconnect} disabled={busy}>
            {busy ? "Disconnecting..." : "Disconnect Gmail"}
          </button>
        )
      ) : (
        <FabricButton onClick={connect} disabled={busy || !status?.configured}>
          {busy
            ? "Connecting..."
            : status?.reconnect
              ? "Reconnect Gmail"
              : "Connect Gmail"}
        </FabricButton>
      )}
      {(error || (status && !status.configured)) && (
        <button className="admin-button" onClick={() => void refresh()}>
          Check configuration again
        </button>
      )}
    </section>
  );
}
