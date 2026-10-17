import Image from "next/image";
import Link from "next/link";
import { navigation, services } from "@/data/content";
import BrandName from "@/components/ui/BrandName";
import MotionSurface from "@/components/motion/MotionSurface";
import Reveal from "@/components/ui/Reveal";
export default function Footer() {
  return (
    <footer className="footer container">
      <MotionSurface className="footer-motion">
        <span className="footer-orbit" aria-hidden="true" />
        <span className="footer-accent-line" aria-hidden="true" />
        <Reveal>
          <div className="footer-top">
            <div>
              <Link className="brand" href="/">
                <Image src="/logo/icon.png" alt="" width={46} height={46} />
                <BrandName />
              </Link>
              <p>Calm, precise software.</p>
              <span className="small muted">
                Thoughtful products. Lasting foundations.
              </span>
            </div>
            <div>
              <h3>Explore</h3>
              <Link href="/reviews">Client Reviews</Link>
              {navigation.slice(1).map(([name, path]) => (
                <Link key={path} href={path}>
                  {name}
                </Link>
              ))}
            </div>
            <div>
              <h3>Expertise</h3>
              {services.map((s) => (
                <Link key={s.slug} href={`/services#${s.slug}`}>
                  {s.name}
                </Link>
              ))}
            </div>
            <div>
              <h3>Elsewhere</h3>
              <span className="social-placeholder">LinkedIn · Coming soon</span>
              <span className="social-placeholder">GitHub · Coming soon</span>
              <span className="social-placeholder">
                Instagram · Coming soon
              </span>
            </div>
          </div>
        </Reveal>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} All rights reserved.</span>
          <span>Built with intention. Every detail.</span>
          <a href="#main">Back to top ↑</a>
          <Link className="footer-admin-link" href="/admin/login">
            Admin Login
          </Link>
        </div>
      </MotionSurface>
    </footer>
  );
}
