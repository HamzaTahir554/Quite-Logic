import Link from "next/link";
import Image from "next/image";
import { services } from "@/data/content";
import ServiceEditorialMotion from "@/components/motion/ServiceEditorialMotion";
import { Action } from "@/components/ui/Elements";

// Names match the supplied Services Images artwork; keep original filenames.
const artwork = {
  "web-development": "Web.png",
  "app-development": "App.png",
  "ai-automation": "Ai.png",
  "ai-vision": "ai_vision.png",
  "custom-software": "custom_software.png",
} satisfies Record<(typeof services)[number]["slug"], string>;

export default function ServicesShowcase() {
  return (
    <div className="container services-editorial">
      {services.map((service, index) => {
        const contact = `/contact?service=${encodeURIComponent(service.name)}`;
        return (
          <ServiceEditorialMotion key={service.slug} id={service.slug}>
            <div className="service-art-frame">
              <div className="service-art-reveal">
                <div className="service-art-drift">
                  <Link
                    href={contact}
                    className="service-art-link"
                    data-cursor="OPEN"
                    aria-label={`Explore ${service.name}`}
                  >
                    <Image
                      src={`/services/${artwork[service.slug]}`}
                      alt={`${service.name} illustration`}
                      fill
                      sizes="(max-width: 760px) 92vw, (max-width: 1100px) 48vw, 640px"
                      className="service-art-image"
                    />
                  </Link>
                </div>
              </div>
              <span className="service-art-index" aria-hidden="true">
                QL / 0{index + 1}
              </span>
            </div>
            <div className="service-editorial-copy">
              <span className="overline service-reveal-text">
                0{index + 1} / {service.short}
              </span>
              <h2 className="service-reveal-text">{service.name}</h2>
              <p className="service-editorial-lead service-reveal-text">
                {service.description}
              </p>
              <p className="service-reveal-text">{service.details}</p>
              <ul className="service-editorial-capabilities service-reveal-text">
                {service.capabilities.map((capability) => (
                  <li key={capability}>{capability}</li>
                ))}
              </ul>
              <div className="service-reveal-text">
                <Action href={contact} secondary>
                  Explore Service
                </Action>
              </div>
            </div>
          </ServiceEditorialMotion>
        );
      })}
    </div>
  );
}
