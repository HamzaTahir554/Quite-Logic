import AdminLogin from "@/components/admin/AdminLogin";
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ unavailable?: string }>;
}) {
  const params = await searchParams;
  return (
    <AdminLogin
      initialError={
        params.unavailable === "1"
          ? "The admin service could not connect. Please try again shortly."
          : ""
      }
    />
  );
}
