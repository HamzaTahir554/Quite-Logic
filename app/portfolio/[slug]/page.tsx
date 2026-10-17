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
import Image from "next/image";
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
      <div className="project-detail">
        <StructuredData
          path={`/portfolio/${managed.slug}`}
          name={managed.title}
          parents={[{ name: "Portfolio", path: "/portfolio" }]}
        />
        <PageHero
          label={managed.category || "Project"}
          title={managed.title}
          description={managed.shortDescription || ""}
          variant="project"
        />
        <section className="container case-study">
          <Image
            unoptimized
            src={managed.logo}
            alt={`${managed.title} logo`}
            width={400}
            height={240}
            style={{ objectFit: "contain", maxWidth: "100%" }}
          />
          <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {managed.description}
          </p>
          {managed.technologies.length > 0 && (
            <p>{managed.technologies.join(" · ")}</p>
          )}
          {managed.projectUrl && (
            <a className="text-link" href={managed.projectUrl}>
              View project ↗
            </a>
          )}
          <p>
            <Link className="text-link" href="/portfolio">
              ← Back to portfolio
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
            <span className="overline">The direction</span>
            <h2>Designed around the next action.</h2>
            <p>{p.approach}</p>
          </div>
        </div>
        <p className="concept-note">
          This is an illustrative product concept. Technology labels describe
          the proposed direction; they do not represent a shipped client
          implementation or measured results.
        </p>
        <Link className="text-link" href="/portfolio">
          ← Back to all concepts
        </Link>
      </section>
      <CTA />
    </div>
  );
}
