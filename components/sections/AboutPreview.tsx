import Image from "next/image";
import Reveal from "@/components/ui/Reveal";
import { Action } from "@/components/ui/Elements";
export default function AboutPreview() {
  return (
    <section className="section container">
      <Reveal className="about-panel">
        <div className="about-copy">
          <span className="section-label">
            <span className="number">03</span>Our philosophy
          </span>
          <h2>
            Good software.
            <br />
            <em>Nothing unnecessary.</em>
          </h2>
          <p>
            We believe the best technology makes itself useful, then gets out of
            the way. Clean engineering and thoughtful interfaces turn complexity
            into clarity.
          </p>
          <ul className="principles">
            <li>Simple interfaces. Considered details.</li>
            <li>Reliable architecture. Room to grow.</li>
            <li>Intelligent automation. Human oversight.</li>
          </ul>
          <Action href="/about" secondary>
            Meet the Studio
          </Action>
        </div>
        <div className="about-visual">
          <div className="logo-orbit">
            <span />
            <span />
            <span />
            <Image
              src="/logo/icon.png"
              width={152}
              height={152}
              alt="Quite Logic emblem"
            />
          </div>
          <span className="orbit-caption">Clarity at the core.</span>
        </div>
      </Reveal>
    </section>
  );
}
