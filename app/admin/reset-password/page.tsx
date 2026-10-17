import AuthForm from "@/components/admin/AuthForm";
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const valid = typeof token === "string" && /^[a-f0-9]{64}$/.test(token);
  return (
    <section className="admin-auth glass-panel">
      <h1>Reset password.</h1>
      {!valid && (
        <p role="alert">This reset link is invalid. Request a new link.</p>
      )}
      <AuthForm mode="reset-password" token={valid ? token : ""} />
    </section>
  );
}
