export type PortfolioProject = {
  id: string;
  title: string;
  description: string;
  category: string;
  project_url: string;
  image_url: string | null;
  source_slug: string | null;
  short_description?: string;
  featured?: boolean;
};
