export type ManagedProject = {
  _id: string;
  title: string;
  slug: string;
  logo: string;
  description: string;
  shortDescription: string;
  category: string;
  technologies: string[];
  projectUrl: string;
  featured: boolean;
  status: string;
  order: number;
  createdAt: string;
  updatedAt: string;
};
export type ProjectPreviewData = Pick<
  ManagedProject,
  | "title"
  | "slug"
  | "logo"
  | "description"
  | "category"
  | "technologies"
  | "projectUrl"
  | "status"
>;
export function adminDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
