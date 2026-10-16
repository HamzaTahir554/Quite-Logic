import { siteUrl } from "@/lib/seo";
export default function StructuredData({
  path = "/",
  name = "Home",
  parents = [],
}: {
  path?: string;
  name?: string;
  parents?: { name: string; path: string }[];
}) {
  const graph =
    path === "/"
      ? [
          {
            "@type": "Organization",
            "@id": `${siteUrl}/#organization`,
            name: "Quite Logic",
            url: siteUrl,
            logo: `${siteUrl}/logo/icon.png`,
            slogan: "Calm, precise software.",
          },
          {
            "@type": "WebSite",
            name: "Quite Logic",
            url: siteUrl,
            publisher: { "@id": `${siteUrl}/#organization` },
          },
          {
            "@type": "ProfessionalService",
            name: "Quite Logic",
            url: siteUrl,
            image: `${siteUrl}/logo/icon.png`,
            description:
              "Web and app development, AI automation, computer vision, and custom software.",
          },
        ]
      : [
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
              ...parents.map((parent, index) => ({
                "@type": "ListItem",
                position: index + 2,
                name: parent.name,
                item: `${siteUrl}${parent.path}`,
              })),
              {
                "@type": "ListItem",
                position: parents.length + 2,
                name,
                item: `${siteUrl}${path}`,
              },
            ],
          },
        ];
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": graph,
        }).replace(/</g, "\\u003c"),
      }}
    />
  );
}
