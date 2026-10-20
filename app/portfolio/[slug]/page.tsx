import Arrow from "@/components/ui/Arrow";
import { notFound } from "next/navigation";
import { projects } from "@/data/content";
import { PageHero, CTA } from "@/components/ui/Elements";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import AtlasShowcase from "@/components/projects/AtlasShowcase";
import StructuredData from "@/components/seo/StructuredData";
import Reveal from "@/components/ui/Reveal";
import ProjectArtwork from "@/components/projects/ProjectArtwork";
import LegacyProjectRedirect from "@/components/projects/LegacyProjectRedirect";
import { getProjectDetail } from "@/lib/project-detail";
import ProjectLogo from "@/components/projects/ProjectLogo";
import ProjectNarrative from "@/components/projects/ProjectNarrative";
export const dynamic = "force-dynamic";
export function generateStaticParams() {
  return [...projects.map((p) => ({ slug: p.slug })), { slug: "lens-insight" }];
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug === "lens-insight")
    return {
      ...pageMetadata(
        "Atlas / Cloud — Product Concept",
        "Explore the Atlas / Cloud product concept.",
        "/portfolio/atlas-cloud",
      ),
      robots: { index: false, follow: true },
    };
  const project = projects.find((p) => p.slug === slug);
  if (!project) {
    const managed = await getProjectDetail(slug);
    return managed
      ? pageMetadata(
          managed.title,
          managed.shortDescription || managed.description.slice(0, 160),
          `/portfolio/${slug}`,
        )
      : {};
  }
  return project
    ? pageMetadata(
        `${project.title} — Product Concept`,
        project.description,
        `/portfolio/${slug}`,
      )
    : {};
}
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug === "lens-insight") return <LegacyProjectRedirect />;
  const p = projects.find((p) => p.slug === slug);
  if (!p) {
    const managed = await getProjectDetail(slug);
    if (!managed) notFound();
    return (
      <div className="project-detail project-detail--managed">
        <StructuredData
          path={`/portfolio/${managed.slug}`}
          name={managed.title}
          parents={[{ name: "Portfolio", path: "/portfolio" }]}
        />
        <nav className="project-breadcrumbs container" aria-label="Breadcrumb">
          <Link href="/portfolio">
            Back to Portfolio <Arrow />
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{managed.title}</span>
        </nav>
        <PageHero
          label={managed.category || "Project"}
          title={managed.title}
          description={managed.shortDescription || ""}
          variant="project"
        />
        <section className="container case-study">
          <div className="managed-project-overview glass-panel">
            <div className="managed-detail-logo">
              <ProjectLogo
                src={managed.logo}
                title={managed.title}
                width={400}
                height={240}
              />
            </div>
            <div>
              <span className="eyebrow">
                {managed.featured ? "FEATURED PROJECT" : "AT A GLANCE"}
              </span>
              <h2>{managed.category || "Software & digital products"}</h2>
              <p>
                {managed.shortDescription ||
                  "Explore the project, its approach and the technology behind it."}
              </p>
              {managed.projectUrl && (
                <a className="text-link" href={managed.projectUrl}>
                  Visit project <Arrow />
                </a>
              )}
            </div>
          </div>
          <div className="project-reading-layout">
            <ProjectNarrative description={managed.description} />
            {managed.technologies.length > 0 && (
              <aside
                className="project-detail-sidebar glass-panel"
                aria-label="Project technology"
              >
                <h2>Technology</h2>
                <ul
                  className="project-technology-list"
                  aria-label="Technologies"
                >
                  {managed.technologies.map((technology: string) => (
                    <li key={technology}>{technology}</li>
                  ))}
                </ul>
              </aside>
            )}
          </div>
          <p className="project-return-link">
            <Link className="text-link" href="/portfolio">
              Back to portfolio <Arrow />
            </Link>
          </p>
        </section>
        <CTA />
      </div>
    );
  }
  return (
    <div className="project-detail">
      <StructuredData
        path={`/portfolio/${p.slug}`}
        name={p.title}
        parents={[{ name: "Portfolio", path: "/portfolio" }]}
      />
      <nav className="project-breadcrumbs container" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true">/</span>
        <Link href="/portfolio">Portfolio</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{p.title}</span>
      </nav>
      <p className="container project-back-link">
        <Link className="text-link" href="/portfolio">
          Back to Portfolio <Arrow />
        </Link>
      </p>
      {p.slug === "atlas-cloud" ? (
        <AtlasShowcase project={p} primary />
      ) : (
        <PageHero
          label={`${p.type} / Illustrative concept`}
          title={p.title}
          description={p.description}
          variant="project"
        />
      )}
      <section className="container case-study">
        {p.slug !== "atlas-cloud" && (
          <Reveal className="case-artwork">
            <ProjectArtwork
              src={p.image}
              alt={`${p.title} concept interface`}
              detail
            />
          </Reveal>
        )}
        <div className="mission-grid">
          <div>
            <span className="overline">The challenge</span>
            <h2>Clarity is the starting point.</h2>
            <p>{p.challenge}</p>
          </div>
          <div>
            <span className="overline">The solution</span>
            <h2>Designed around the next action.</h2>
            <p>{p.approach}</p>
          </div>
        </div>
        <section
          className="concept-technology"
          aria-labelledby="concept-technology-title"
        >
          <h2 id="concept-technology-title">Technology direction</h2>
          <ul className="project-technology-list" aria-label="Technologies">
            {p.technologies.map((technology) => (
              <li key={technology}>{technology}</li>
            ))}
          </ul>
        </section>
        <p className="concept-note">
          This is an illustrative product concept. Technology labels describe
          the proposed direction; they do not represent a shipped client
          implementation or measured results.
        </p>
        <Link className="text-link" href="/portfolio">
          Back to all concepts <Arrow />
        </Link>
      </section>
      <CTA />
    </div>
  );
}
