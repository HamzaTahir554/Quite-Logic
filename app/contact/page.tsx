import { PageHero } from "@/components/ui/Elements";
import ContactForm from "@/components/sections/ContactForm";
import StructuredData from "@/components/seo/StructuredData";
import { pageMetadata } from "@/lib/seo";
import { contactEmail } from "@/lib/company";
import { BookingButton } from "@/components/booking/BookingProvider";
import CrystalReflection from "@/components/motion/CrystalReflection";
import Reveal from "@/components/ui/Reveal";
export const metadata = pageMetadata(
  "Start a Project",
  "Tell Quite Logic about your website, mobile application, AI automation, computer vision, or custom software project.",
  "/contact",
);
export default function ContactPage() {
  return (
    <>
      <StructuredData path="/contact" name="Contact" />
      <PageHero
        variant="contact"
        label="Start a conversation"
        title="Let’s build"
        accent="something useful."
        description="A new idea, an existing product, or a process that could work better. Tell us what you have in mind."
      />
      <section className="container contact-options" aria-label="Get in touch">
        <a className="contact-option" href="#message-form">
          <span className="overline">01 / Write to us</span>
          <strong>
            Send us a message <span aria-hidden="true">↘</span>
          </strong>
          <span>A few details. A thoughtful response.</span>
        </a>
        <a className="contact-option" href="#book-call">
          <span className="overline">02 / Talk it through</span>
          <strong>
            Book a call <span aria-hidden="true">↘</span>
          </strong>
          <span>30 minutes to explore what’s next.</span>
        </a>
      </section>
      <section className="container contact-layout" id="send-message">
        <aside>
          <span className="overline">A thoughtful first step</span>
          <h2>Send us a message</h2>
          <p>
            You don’t need a finished brief. A few details about the problem,
            your goals, and where you are today are enough to begin.
          </p>
          <a className="contact-email" href={`mailto:${contactEmail}`}>
            {contactEmail}
          </a>
          <section
            className="contact-booking-panel"
            id="book-call"
            aria-labelledby="book-call-title"
          >
            <CrystalReflection />
            <Reveal className="booking-invitation">
              <span className="overline">Prefer a conversation?</span>
              <h2 id="book-call-title">Book a call</h2>
              <p>
                A focused, 30-minute meeting to talk through your goals and a
                useful next step.
              </p>
              <BookingButton />
              <p className="small booking-note">
                Choose a time in your timezone. Booking opens right here.
              </p>
            </Reveal>
          </section>
          <div className="contact-expectations">
            <h3>What happens next?</h3>
            <ol>
              <li>We review your project and the context.</li>
              <li>We clarify the questions that matter.</li>
              <li>We agree on a useful next step together.</li>
            </ol>
          </div>
          <span className="small muted">
            No pitch deck required. Just a good conversation.
          </span>
        </aside>
        <ContactForm />
      </section>
    </>
  );
}
