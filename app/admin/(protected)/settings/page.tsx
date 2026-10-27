import SocialLinkManager from "@/components/admin/SocialLinkManager";
import GmailConnection from "@/components/admin/gmail/GmailConnection";
export default function SettingsPage() {
  return (
    <>
      <SocialLinkManager />
      <GmailConnection settings />
    </>
  );
}
