import { Action, PageHero } from "@/components/ui/Elements";
export default function NotFound() {
  return (
    <>
      <PageHero
        label="404 / A quiet detour"
        title="This page isn’t here."
        description="Let’s get you back to something useful."
      />
      <div className="container error-actions">
        <Action href="/">Return Home</Action>
      </div>
    </>
  );
}
