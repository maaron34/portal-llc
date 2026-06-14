import { useState, useEffect, type FormEvent } from "react";
import { Phone, Mail, Clock, Instagram, MapPin } from "lucide-react";
import SEO from "../components/SEO";
import { PAGE_SEO } from "../data/seo";
import { BUSINESS, SERVICE_AREAS } from "../data/content";

const WEB3FORMS_KEY = "97c81447-a5dc-43a2-8880-542d83c80609";

type Utm = {
  source: string;
  medium: string;
  campaign: string;
  term: string;
  content: string;
};

const EMPTY_UTM: Utm = { source: "", medium: "", campaign: "", term: "", content: "" };

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  // Captured on mount so the form submission preserves attribution even if
  // the user clears the URL bar before submitting. Each non-empty UTM is
  // also forwarded into the GA4 generate_lead event below for reporting.
  const [utm, setUtm] = useState<Utm>(EMPTY_UTM);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setUtm({
      source: params.get("utm_source") || "",
      medium: params.get("utm_medium") || "",
      campaign: params.get("utm_campaign") || "",
      term: params.get("utm_term") || "",
      content: params.get("utm_content") || "",
    });
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const form = e.currentTarget;
    const formData = new FormData(form);

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const neighborhood = formData.get("neighborhood") as string;
    const message = formData.get("message") as string;

    // Subject includes the source so Chris can eyeball attribution from the
    // email notification alone, without opening any analytics dashboard.
    const sourceSuffix = utm.source ? ` (via ${utm.source})` : "";

    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: `Website Inquiry from ${name}${sourceSuffix}`,
          from_name: "Portal LLC Website",
          name,
          email,
          phone: phone || "Not provided",
          address: neighborhood || "Not provided",
          message,
          utm_source: utm.source || "(direct)",
          utm_medium: utm.medium || "(none)",
          utm_campaign: utm.campaign || "(none)",
          utm_term: utm.term || "",
          utm_content: utm.content || "",
          landing_url: typeof window !== "undefined" ? window.location.href : "",
          referrer: typeof document !== "undefined" ? document.referrer : "",
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (typeof window !== "undefined" && window.gtag) {
          window.gtag("event", "generate_lead", {
            event_category: "form",
            event_label: "contact_page",
            // Surface UTMs on the event so GA4 reports can slice form-fills
            // by source/medium/campaign — survives even if the GA4 session
            // attribution model loses context across sessions.
            source: utm.source || undefined,
            medium: utm.medium || undefined,
            campaign: utm.campaign || undefined,
          });
        }

        // Fire-and-forget: add the subscriber to MailerLite's "Portal Leads"
        // group so the 5-email nurture automation kicks in. Don't await — the
        // user already has their thank-you from the Web3Forms success, and
        // Chris's notification email is in flight. If MailerLite is slow or
        // down, the lead is recoverable from Web3Forms logs; we don't want
        // to surface an error here that obscures the primary success state.
        fetch("/.netlify/functions/add-to-mailerlite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            utm_source: utm.source,
            utm_medium: utm.medium,
            utm_campaign: utm.campaign,
          }),
        }).catch((err) => console.warn("MailerLite add failed:", err));

        setSubmitted(true);
      } else {
        setError("Something went wrong. Please call or email us directly.");
      }
    } catch {
      setError("Something went wrong. Please call or email us directly.");
    } finally {
      setSubmitting(false);
    }
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
                        Phone
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        className="w-full px-4 py-3 rounded-lg border border-portal-warm bg-white text-portal-dark text-base focus:outline-none focus:ring-2 focus:ring-portal-accent focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-portal-dark mb-1.5">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      className="w-full px-4 py-3 rounded-lg border border-portal-warm bg-white text-portal-dark text-base focus:outline-none focus:ring-2 focus:ring-portal-accent focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-portal-dark mb-1.5">
                      Address
                    </label>
                    <input
                      type="text"
                      name="neighborhood"
                      placeholder="Street address"
                      className="w-full px-4 py-3 rounded-lg border border-portal-warm bg-white text-portal-dark text-base focus:outline-none focus:ring-2 focus:ring-portal-accent focus:border-transparent placeholder:text-portal-warm"
                    />
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
                        Call or text
                      </div>
                    </div>
                  </a>
                  <a
                    href={`mailto:${BUSINESS.email}`}
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
                      <div className="font-semibold">@portal.llc</div>
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
