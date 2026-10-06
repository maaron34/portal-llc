import { useState, type FormEvent } from "react";
import { Phone, Mail, Clock, Instagram, MapPin, MessageSquare } from "lucide-react";
import SEO from "../components/SEO";
import { PAGE_SEO } from "../data/seo";
import { BUSINESS, SERVICE_AREAS } from "../data/content";
import { track } from "../lib/analytics";
import { attributionPayload } from "../lib/attribution";
import { submitLead } from "../lib/lead-capture";
import { FORM_VERSION, HEARD_ABOUT_OPTIONS, SELECT_ARROW_CLASS, fullAddress, isUsPhone } from "../lib/lead-fields";

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [heardAboutChoice, setHeardAboutChoice] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const form = e.currentTarget;
    const formData = new FormData(form);

    const name = ((formData.get("name") as string) || "").trim();
    const email = ((formData.get("email") as string) || "").trim();
    const phone = ((formData.get("phone") as string) || "").trim();
    const street = ((formData.get("street") as string) || "").trim();
    const city = ((formData.get("city") as string) || "").trim();
    const heardAbout = (formData.get("heard_about") as string) || "";
    const heardAboutOther = heardAbout === "other" ? ((formData.get("heard_about_other") as string) || "").trim() : "";
    const message = formData.get("message") as string;

    if (!isUsPhone(phone)) {
      setError("Please enter a 10-digit phone number so Chris can reach you.");
      setSubmitting(false);
      return;
    }

    // First-touch attribution (UTM / ad click IDs / referrer), captured at app
    // load and persisted across navigation so it survives /lp/* -> /contact.
    // Surfaced in the lead email so Chris sees the source without opening any
    // analytics dashboard.
    const attribution = attributionPayload();

    // Canonical capture: Supabase insert + queued email to Chris. The success
    // UI is gated on this response — if it fails, the lead went nowhere, so
    // the visitor must see the error and the direct phone/email fallback.
    const result = await submitLead({
      name,
      email,
      phone,
      address: fullAddress(street, city),
      street,
      city,
      heard_about: heardAbout,
      heard_about_other: heardAboutOther || undefined,
      form_version: FORM_VERSION,
      message,
      ...attribution,
    });

    if (result.ok) {
      track("lead_submitted", { form: "contact_page", heard_about: heardAbout || undefined });
      if (typeof window !== "undefined" && window.gtag) {
        window.gtag("event", "generate_lead", {
          event_category: "form",
          event_label: "contact_page",
          // Surface UTMs on the event so GA4 reports can slice form-fills by
          // source/medium/campaign even if session attribution loses context.
          source: attribution.utm_source,
          medium: attribution.utm_medium,
          campaign: attribution.utm_campaign,
        });
      }

      // Fire-and-forget: add the subscriber to MailerLite's "Portal Leads"
      // group so the 5-email nurture automation kicks in. Don't await — the
      // lead is already captured in Supabase and Chris's notification is
      // queued; a slow or down MailerLite shouldn't delay or obscure the
      // visitor's success state.
      if (email) fetch("/.netlify/functions/add-to-mailerlite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          utm_source: attribution.utm_source || "",
          utm_medium: attribution.utm_medium || "",
          utm_campaign: attribution.utm_campaign || "",
        }),
      }).catch((err) => console.warn("MailerLite add failed:", err));

      setSubmitted(true);
    } else {
      setError("Something went wrong. Please call or email us directly.");
    }
    setSubmitting(false);
  };

  return (
    <>
      <SEO seo={PAGE_SEO.contact} />

      {/* Hero */}
      <section className="pt-28 pb-16 sm:pt-36 sm:pb-20 bg-portal-cream">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-portal-dark mb-4">
            Get in Touch
          </h1>
          <p className="text-xl text-portal-mid max-w-2xl mx-auto">
            Request an estimate or ask a question. We start with a phone or video
            estimate, then follow up with an on-site visit. We typically respond
            within 24 hours and are available to start within 2 weeks.
          </p>
        </div>
      </section>

      {/* Content */}
      <section id="estimate-form" className="py-16 sm:py-24 scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            {/* Form */}
            <div className="lg:col-span-3">
              {submitted ? (
                <div className="bg-green-50 rounded-xl p-10 text-center">
                  <h2 className="text-2xl font-bold text-green-800 mb-3">
                    Thanks for reaching out!
                  </h2>
                  <p className="text-green-700">
                    We received your message and will get back to you within
                    24 hours. You can also reach us at{" "}
                    <a href={BUSINESS.phoneHref} className="underline">
                      {BUSINESS.phone}
                    </a>
                    .
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-portal-dark mb-1.5">
                        Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        className="w-full px-4 py-3 rounded-lg border border-portal-warm bg-white text-portal-dark text-base focus:outline-none focus:ring-2 focus:ring-portal-accent focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-portal-dark mb-1.5">
                        Phone *
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        required
                        autoComplete="tel"
                        className="w-full px-4 py-3 rounded-lg border border-portal-warm bg-white text-portal-dark text-base focus:outline-none focus:ring-2 focus:ring-portal-accent focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-portal-dark mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      autoComplete="email"
                      className="w-full px-4 py-3 rounded-lg border border-portal-warm bg-white text-portal-dark text-base focus:outline-none focus:ring-2 focus:ring-portal-accent focus:border-transparent"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-semibold text-portal-dark mb-1.5">
                        Street address *
                      </label>
                      <input
                        type="text"
                        name="street"
                        required
                        autoComplete="street-address"
                        className="w-full px-4 py-3 rounded-lg border border-portal-warm bg-white text-portal-dark text-base focus:outline-none focus:ring-2 focus:ring-portal-accent focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-portal-dark mb-1.5">
                        City *
                      </label>
                      <input
                        type="text"
                        name="city"
                        required
                        autoComplete="address-level2"
                        className="w-full px-4 py-3 rounded-lg border border-portal-warm bg-white text-portal-dark text-base focus:outline-none focus:ring-2 focus:ring-portal-accent focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-portal-dark mb-1.5">
                      Tell us about your project *
                    </label>
                    <textarea
                      name="message"
                      required
                      rows={5}
                      placeholder="What type of concrete work do you need? Any details about the project help us give you a better estimate."
                      className="w-full px-4 py-3 rounded-lg border border-portal-warm bg-white text-portal-dark text-base focus:outline-none focus:ring-2 focus:ring-portal-accent focus:border-transparent placeholder:text-portal-warm resize-y"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-portal-dark mb-1.5">
                      How did you hear about us?
                    </label>
                    <select
                      name="heard_about"
                      value={heardAboutChoice}
                      onChange={(e) => setHeardAboutChoice(e.target.value)}
                      className={`w-full px-4 py-3 rounded-lg border border-portal-warm bg-white text-portal-dark text-base focus:outline-none focus:ring-2 focus:ring-portal-accent focus:border-transparent ${SELECT_ARROW_CLASS}`}
                    >
                      {HEARD_ABOUT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    {heardAboutChoice === "other" && (
                      <input
                        type="text"
                        name="heard_about_other"
                        maxLength={120}
                        placeholder="Where did you hear about us?"
                        className="mt-3 w-full px-4 py-3 rounded-lg border border-portal-warm bg-white text-portal-dark text-base focus:outline-none focus:ring-2 focus:ring-portal-accent focus:border-transparent placeholder:text-portal-warm"
                      />
                    )}
                  </div>
                  {error && (
                    <p className="text-red-600 text-sm font-medium">{error}</p>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto px-8 py-4 bg-portal-accent text-white font-bold text-lg rounded-lg border-none cursor-pointer hover:bg-portal-accent-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Sending..." : "Send Message"}
                  </button>
                </form>
              )}
            </div>

            {/* Contact Info */}
            <div className="lg:col-span-2">
              <div className="bg-portal-cream rounded-xl p-8 space-y-6">
                <h2 className="text-xl font-bold text-portal-dark">
                  Contact Info
                </h2>
                <div className="space-y-5">
                  <a
                    href={BUSINESS.phoneHref}
                    className="flex items-center gap-3 text-portal-gray no-underline hover:text-portal-accent transition-colors"
                  >
                    <Phone size={20} className="text-portal-accent shrink-0" />
                    <div>
                      <div className="font-semibold">{BUSINESS.phone}</div>
                      <div className="text-sm text-portal-mid">
                        Call
                      </div>
                    </div>
                  </a>
                  <a
                    href={BUSINESS.textHref}
                    onClick={() => track("contact_tap", { method: "text", page: "contact_info" })}
                    className="flex items-center gap-3 text-portal-gray no-underline hover:text-portal-accent transition-colors"
                  >
                    <MessageSquare size={20} className="text-portal-accent shrink-0" />
                    <div>
                      <div className="font-semibold">Text Chris</div>
                      <div className="text-sm text-portal-mid">
                        Opens a text with a starter message
                      </div>
                    </div>
                  </a>
                  <a
                    href={BUSINESS.emailHref}
                    className="flex items-center gap-3 text-portal-gray no-underline hover:text-portal-accent transition-colors"
                  >
                    <Mail size={20} className="text-portal-accent shrink-0" />
                    <div>
                      <div className="font-semibold">{BUSINESS.email}</div>
                      <div className="text-sm text-portal-mid">
                        Email anytime
                      </div>
                    </div>
                  </a>
                  <a
                    href={BUSINESS.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-portal-gray no-underline hover:text-portal-accent transition-colors"
                  >
                    <Instagram
                      size={20}
                      className="text-portal-accent shrink-0"
                    />
                    <div>
                      <div className="font-semibold">@portal_concrete</div>
                      <div className="text-sm text-portal-mid">
                        Follow our work
                      </div>
                    </div>
                  </a>
                  <div className="flex items-start gap-3 text-portal-gray">
                    <Clock
                      size={20}
                      className="text-portal-accent shrink-0 mt-0.5"
                    />
                    <div>
                      <div className="font-semibold">Hours</div>
                      <div className="text-sm text-portal-mid">
                        Mon-Fri: 7:30 AM - 5:00 PM
                        <br />
                        Saturday by appointment
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-portal-gray">
                    <MapPin
                      size={20}
                      className="text-portal-accent shrink-0 mt-0.5"
                    />
                    <div>
                      <div className="font-semibold">Service Area</div>
                      <div className="text-sm text-portal-mid">
                        All Seattle and Seattle-adjacent neighborhoods including {SERVICE_AREAS.join(", ")}, and more
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
