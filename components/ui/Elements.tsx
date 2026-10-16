import MagneticLink from "@/components/motion/MagneticLink";
import Reveal from "./Reveal";
import BrandText from "./BrandText";
import { BookingButton } from "@/components/booking/BookingProvider";
import BannerMotion, {
  type BannerVariant,
} from "@/components/motion/BannerMotion";
export function Action({
  href,
  children,
  secondary = false,
}: {
  href: string;
  children: React.ReactNode;
  secondary?: boolean;
}) {
  return (
    <MagneticLink href={href} secondary={secondary}>
      {children}
    </MagneticLink>
  );
}
export function SectionHeading({
  number,
  label,
  title,
  accent,
  description,
  centered = false,
}: {
  number: string;
  label: string;
  title: string;
  accent?: string;
  description?: string;
  centered?: boolean;
}) {
  return (
    <Reveal className={`section-heading ${centered ? "centered" : ""}`}>
      <div className="section-label">
        <span className="number">{number}</span>
        <span>{label}</span>
      </div>
      <h2>
        {title}
        {accent && (
          <>
            <br />
            <em>{accent}</em>
          </>
        )}
      </h2>
      {description && <p>{description}</p>}
    </Reveal>
  );
}
export function PageHero({
  label,
  title,
  accent,
  description,
  variant = "studio",
}: {
  label: string;
  title: string;
  accent?: string;
  description: string;
  variant?: BannerVariant;
}) {
  return (
    <section className="page-hero container">
      <BannerMotion variant={variant}>
        <span className="eyebrow">
          <i />
          {label}
        </span>
        <h1>
          <span className="banner-phrase">
            {title.split(" ").map((word, index) => (
              <span className="banner-word-wrap" key={index}>
                <span className="banner-word">{word}</span>
                {index < title.split(" ").length - 1 ? " " : ""}
              </span>
            ))}
          </span>
          {accent && (
            <>
              <br />
              <em className="banner-phrase">
                {accent.split(" ").map((word, index) => (
                  <span className="banner-word-wrap" key={index}>
                    <span className="banner-word">{word}</span>
                    {index < accent.split(" ").length - 1 ? " " : ""}
                  </span>
                ))}
              </em>
            </>
          )}
        </h1>
        <p>
          <BrandText>{description}</BrandText>
        </p>
      </BannerMotion>
    </section>
  );
}
export function CTA({ compact = false }: { compact?: boolean }) {
  return (
    <section className={`section container${compact ? " cta-compact" : ""}`}>
      <Reveal className="cta-panel">
        <span className="eyebrow">A good place to begin</span>
        <h2>
          Have an idea?
          <br />
          <em>Let’s make it useful.</em>
        </h2>
        <p>Let’s build it quietly, precisely, and properly.</p>
        <div className="cta-actions">
          <Action href="/contact">Start Your Project</Action>
          <BookingButton secondary />
        </div>
        <span className="cta-orbit" aria-hidden="true" />
      </Reveal>
    </section>
  );
}
