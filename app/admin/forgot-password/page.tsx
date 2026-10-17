import AuthForm from "@/components/admin/AuthForm";
export default function ForgotPasswordPage() {
  return (
    <section className="admin-auth glass-panel">
      <h1>Forgot password?</h1>
      <p>Enter your admin email to request a reset link.</p>
      <AuthForm mode="forgot-password" />
    </section>
  );
}
