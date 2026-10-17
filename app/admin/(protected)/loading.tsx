import { ListSkeleton } from "@/components/admin/AdminElements";
export default function Loading() {
  return (
    <div>
      <div
        className="admin-heading-skeleton admin-skeleton"
        aria-hidden="true"
      />
      <ListSkeleton />
    </div>
  );
}
