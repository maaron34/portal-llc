import { Mail, MessageSquare, Phone } from "lucide-react";
import { BUSINESS } from "../data/content";
import { track } from "../lib/analytics";

/**
 * One-tap Call, Text and Email, fixed to the bottom of the screen on phones
 * (Chris, 2026-10-04: people were typing the number off the site by hand).
 *
 * - Call goes to the Portal line, so voicemails and missed calls are recorded.
 * - Text goes to Chris's own cell (his preference) with a starter message, so
 *   the visitor only has to finish the sentence.
 * - Email opens a message to chris@ with a subject.
 *
 * Every tap is counted (contact_tap) with the visitor's channel and campaign,
 * which is how texts to his cell still count toward a channel.
 */
export default function ContactBar({ page }: { page: string }) {
  const tap = (method: string) => () => track("contact_tap", { method, page });
  const item =
    "flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-xs font-semibold no-underline text-portal-dark active:bg-portal-cream";
  return (
    <>
      {/* Keeps the last bit of each page clear of the bar. */}
      <div className="h-16 md:hidden" aria-hidden="true" />
      <nav
        aria-label="Contact Portal"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t border-portal-warm bg-white"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <a href={BUSINESS.phoneHref} onClick={tap("call")} className={item}>
          <Phone size={20} className="text-portal-accent" />
          Call
        </a>
        <a href={BUSINESS.textHref} onClick={tap("text")} className={`${item} border-x border-portal-light`}>
          <MessageSquare size={20} className="text-portal-accent" />
          Text
        </a>
        <a href={BUSINESS.emailHref} onClick={tap("email")} className={item}>
          <Mail size={20} className="text-portal-accent" />
          Email
        </a>
      </nav>
    </>
  );
}
