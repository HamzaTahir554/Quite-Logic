"use client";
import Image from "next/image";
import { useRef } from "react";
import { Action } from "@/components/ui/Elements";
import { useSceneActivity } from "@/hooks/useSceneActivity";
import { useCrystalPointer } from "@/hooks/useCrystalPointer";
import GlassReflection from "@/components/ui/GlassReflection";

export default function Hero() {
  const { ref, active } = useSceneActivity(false);
  const banner = useRef<HTMLElement>(null);
  useCrystalPointer(
    banner,
    ".hero-copy > h1, .hero-description, .hero-actions, .hero-disciplines",
  );
  return (
    <section
      className="hero reference-hero"
      data-motion-active={active}
      aria-label="Quite Logic software studio"
      ref={banner}
    >
      <span className="crystal-light" aria-hidden="true" />
      <div className="hero-atmosphere" ref={ref} aria-hidden="true">
        <div className="atmosphere-grid" />
        <div className="atmosphere-orbits">
          <span />
          <span />
          <span />
          <Image
            src="/logo/icon.png"
            alt=""
            width={560}
            height={560}
            className="atmosphere-emblem"
            priority
          />
        </div>
        <div className="atmosphere-glow glow-left" />
        <div className="atmosphere-glow glow-right" />
      </div>
      <div className="hero-copy glass-panel">
        <GlassReflection />
        <h1>
          <span className="hero-title-line">
            <span>Software that</span>
          </span>{" "}
          <span className="hero-title-line">
            <span>feels calm.</span>
          </span>{" "}
          <span className="hero-title-line">
            <span>
              Built to move <em>fast.</em>
            </span>
          </span>
        </h1>
        <p className="hero-description">
          We design and build high-performance digital products, intelligent
          automation and AI-powered systems for modern businesses.
        </p>
        <div className="hero-actions">
          <Action href="/contact">Start a Project</Action>
          <Action href="/portfolio" secondary>
            Explore Our Work
          </Action>
        </div>
        <div className="hero-disciplines" aria-label="Our disciplines">
          <span>Web</span>
          <i />
          <span>Apps</span>
          <i />
          <span>AI Automation</span>
          <i />
          <span>AI Vision</span>
        </div>
      </div>
      <a
        href="#services"
        className="hero-scroll"
        aria-label="Explore our services"
      >
        <span>Explore the studio</span>
        <span aria-hidden="true">↓</span>
      </a>
    </section>
  );
}
