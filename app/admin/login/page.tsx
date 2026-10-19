import AuthForm from "@/components/admin/AuthForm";
import Image from "next/image";
import GlassReflection from "@/components/ui/GlassReflection";
export default function LoginPage() {
  return (
    <section className="admin-auth glass-dark">
      <GlassReflection />
      <Image
        className="admin-auth-logo"
        src="/logo/icon.png"
        alt="Quite Logic"
        width={48}
        height={48}
        priority
      />
      <h1>Welcome back.</h1>
      <p>Sign in to manage Quite Logic.</p>
      <AuthForm mode="login" />
    </section>
  );
}
