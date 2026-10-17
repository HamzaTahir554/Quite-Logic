import AuthForm from "@/components/admin/AuthForm";
export default function LoginPage() {
  return (
    <section className="admin-auth glass-panel">
      <h1>Welcome back.</h1>
      <p>Sign in to manage Quite Logic.</p>
      <AuthForm mode="login" />
    </section>
  );
}
