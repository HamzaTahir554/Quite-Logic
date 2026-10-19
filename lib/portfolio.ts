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

/** Only presentation fields leave the server for the Home showcase. */
export type HomeProject = {
  id: string;
  title: string;
  slug: string;
  logo: string;
  category: string;
  description: string;
  technologies: string[];
};
