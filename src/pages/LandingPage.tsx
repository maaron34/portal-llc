import { useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import {
  Phone,
  Star,
  Shield,
  Clock,
  Award,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import SEO from "../components/SEO";
import { BUSINESS } from "../data/content";
import { LANDING_PAGES } from "../data/landing-pages";

type FormData = {
  name: string;
  phone: string;
  email: string;
  address: string;
  projectType: string;
  ownerStatus: string;
  timeline: string;
  message: string;
};

function isQualifiedLead(data: FormData): boolean {
  const ownerOk =
    data.ownerStatus === "yes" || data.ownerStatus === "property-manager";
  const timelineOk =
    data.timeline === "asap" || data.timeline === "1-3-months";
  return ownerOk && timelineOk;
}

function firePixelEvents(data: FormData) {
  // Meta Pixel: always fire Lead event on form submit
  if (typeof window !== "undefined" && (window as any).fbq) {
    (window as any).fbq("track", "Lead");
  }

  // Only fire QualifiedLead for leads that pass MQL filter
  if (isQualifiedLead(data)) {
    if (typeof window !== "undefined" && (window as any).fbq) {
      (window as any).fbq("trackCustom", "QualifiedLead", {
        projectType: data.projectType,
        timeline: data.timeline,
      });
    }
    // GA4 custom event
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "qualified_lead", {
        project_type: data.projectType,
        timeline: data.timeline,
      });
    }
  }

  // GA4: always track form submission
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", "generate_lead", {
      event_category: "form",
      event_label: "landing_page",
    });
  }
}

const TRUST_ICONS = [
  { icon: Star, label: "100+ Five-Star Reviews" },
  { icon: Shield, label: "Licensed & Insured" },
  { icon: Award, label: "35+ Years Experience" },
  { icon: Clock, label: "Free Estimates" },
];

const PROJECT_TYPES = [
  { value: "", label: "Select project type..." },
  { value: "driveway", label: "Driveway" },
  { value: "patio", label: "Patio" },
  { value: "walkway-stairs", label: "Walkway & Stairs" },
  { value: "retaining-wall", label: "Retaining Wall" },
  { value: "foundation", label: "Foundation" },
  { value: "repair", label: "Repair / Reconditioning" },
  { value: "other", label: "Other" },
];

const OWNER_OPTIONS = [
  { value: "", label: "Select..." },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "property-manager", label: "I'm a property manager" },
];

const TIMELINE_OPTIONS = [
  { value: "", label: "Select..." },
  { value: "asap", label: "ASAP" },
  { value: "1-3-months", label: "1-3 months" },
  { value: "exploring", label: "Just exploring options" },
];

// Budget removed from form per feedback -- captures via conversation instead

function LeadForm({
  onSubmit,
  defaultProjectType,
}: {
  onSubmit: (data: FormData) => void;
  defaultProjectType: string;
}) {
  const [formState, setFormState] = useState<FormData>({
    name: "",
    phone: "",
    email: "",
    address: "",
    projectType: defaultProjectType,
    ownerStatus: "",
    timeline: "",
    message: "",
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setFormState((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(formState);
  };

  const inputClass =
    "w-full px-4 py-3 rounded-lg border border-portal-warm bg-white text-portal-dark text-base focus:outline-none focus:ring-2 focus:ring-portal-accent focus:border-transparent";
  const selectClass = `${inputClass} appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%236b6b6b%22%20d%3D%22M6%208L1%203h10z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_12px_center]`;
  const labelClass = "block text-sm font-semibold text-portal-dark mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Name *</label>
          <input
            type="text"
            name="name"
            required
            value={formState.name}
            onChange={handleChange}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Phone *</label>
          <input
            type="tel"
            name="phone"
            required
            value={formState.phone}
            onChange={handleChange}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Email *</label>
        <input
          type="email"
          name="email"
          required
          value={formState.email}
          onChange={handleChange}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Address or Neighborhood *</label>
        <input
          type="text"
          name="address"
          required
          placeholder="e.g., West Seattle, Ballard, Capitol Hill"
          value={formState.address}
          onChange={handleChange}
          className={`${inputClass} placeholder:text-portal-warm`}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>What type of project?</label>
          <select
            name="projectType"
            value={formState.projectType}
            onChange={handleChange}
            className={selectClass}
          >
            {PROJECT_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Do you own this home?</label>
          <select
            name="ownerStatus"
            value={formState.ownerStatus}
            onChange={handleChange}
            className={selectClass}
          >
            {OWNER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Ideal start date?</label>
        <select
          name="timeline"
          value={formState.timeline}
          onChange={handleChange}
          className={selectClass}
        >
          {TIMELINE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>
          Anything else about your project?{" "}
          <span className="font-normal text-portal-mid">(optional)</span>
        </label>
        <textarea
          name="message"
          rows={3}
          placeholder="Tell us about the project, timeline, or any questions you have."
          value={formState.message}
          onChange={handleChange}
          className={`${inputClass} placeholder:text-portal-warm resize-y`}
        />
      </div>

      <button
        type="submit"
        className="w-full px-8 py-4 bg-portal-accent text-white font-bold text-lg rounded-lg border-none cursor-pointer hover:bg-portal-accent-dark transition-colors"
      >
        Get Your Free Estimate
      </button>
      <p className="text-center text-sm text-portal-mid">
        We typically respond within a couple hours.
      </p>
    </form>
  );
}

export default function LandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [submitted, setSubmitted] = useState(false);
  const page = slug ? LANDING_PAGES[slug] : null;

  if (!page) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-portal-mid text-lg">Page not found.</p>
      </div>
    );
  }

  const handleFormSubmit = (data: FormData) => {
    // Fire pixel events based on MQL qualification
    firePixelEvents(data);

    // Build mailto as fallback (same pattern as Contact page)
    const subject = encodeURIComponent(
      `Estimate Request from ${data.name} - ${page.headline}`
    );
    const body = encodeURIComponent(
      [
        `Name: ${data.name}`,
        `Phone: ${data.phone}`,
        `Email: ${data.email}`,
        `Address: ${data.address}`,
        `Project Type: ${data.projectType || "Not specified"}`,
        `Homeowner: ${data.ownerStatus || "Not specified"}`,
        `Timeline: ${data.timeline || "Not specified"}`,
        ...(data.message ? [`\nAdditional Details:\n${data.message}`] : []),
        ``,
        `Source: Landing Page - ${page.headline}`,
      ].join("\n")
    );

    window.location.href = `mailto:${BUSINESS.email}?subject=${subject}&body=${body}`;
    setSubmitted(true);
  };

  // Show first 3 reviews in the grid, use the rest in the sidebar callout rotation
  const gridReviews = page.reviews.slice(0, 3);
  const extraReviews = page.reviews.slice(3);

  return (
    <>
      <SEO seo={page.seo} />

      {/* Minimal top bar - phone only, no navigation */}
      <div className="bg-portal-dark text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/images/brand/portal-logo-new.jpeg"
              alt="Portal LLC"
              className="h-8 w-auto rounded"
            />
            <span className="font-bold text-base hidden sm:inline">
              Portal LLC
            </span>
          </div>
          <a
            href={BUSINESS.phoneHref}
            className="flex items-center gap-2 text-white font-bold text-base no-underline hover:text-portal-accent transition-colors"
          >
            <Phone size={18} />
            {BUSINESS.phone}
          </a>
        </div>
      </div>

      {/* Hero */}
      <section className="relative">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${page.heroImage})` }}
        />
        <div className="absolute inset-0 bg-portal-dark/70" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center text-white">
          <h1 className="text-3xl sm:text-5xl font-extrabold mb-4 leading-tight">
            {page.headline}
          </h1>
          <div className="flex items-center justify-center gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={22}
                className="text-yellow-400 fill-yellow-400"
              />
            ))}
            <span className="ml-2 text-white/90 font-semibold text-base">
              {BUSINESS.reviewCount}+ Five-Star Reviews
            </span>
          </div>
          <p className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto mb-8 whitespace-pre-line">
            {page.subheadline}
          </p>
          <a
            href="#estimate-form"
            className="inline-block px-8 py-4 bg-portal-accent text-white font-bold text-lg rounded-lg no-underline hover:bg-portal-accent-dark transition-colors"
          >
            Get Your Free Estimate
          </a>
        </div>
      </section>

      {/* Trust badges */}
      <section className="bg-portal-cream border-b border-portal-light">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {TRUST_ICONS.map((badge, i) => (
              <div
                key={i}
                className="flex items-center gap-2 justify-center text-portal-dark"
              >
                <badge.icon
                  size={20}
                  className="text-portal-accent shrink-0"
                />
                <span className="text-sm font-semibold">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What to expect + Form */}
      <section id="estimate-form" className="py-12 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Left: What to expect */}
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-portal-dark mb-6">
                Here's What Happens Next
              </h2>
              <div className="space-y-6">
                {[
                  {
                    step: "1",
                    title: "Fill out the form",
                    desc: "Tell us about your project. Takes 60 seconds.",
                  },
                  {
                    step: "2",
                    title: "We call you back ASAP",
                    desc: "Usually within a couple hours, always within 24 hours.",
                  },
                  {
                    step: "3",
                    title: "Free estimate",
                    desc: "We start with a phone or video estimate, then follow up on site if needed.",
                  },
                  {
                    step: "4",
                    title: "We schedule your project",
                    desc: "Most projects start within 2 weeks. Same crew, owner on site.",
                  },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-portal-accent text-white font-bold flex items-center justify-center shrink-0 text-lg">
                      {item.step}
                    </div>
                    <div>
                      <h3 className="font-bold text-portal-dark text-base">
                        {item.title}
                      </h3>
                      <p className="text-portal-mid text-sm mt-0.5">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Social proof callout */}
              <div className="mt-8 p-5 bg-portal-cream rounded-xl">
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={18}
                      className="text-yellow-500 fill-yellow-500"
                    />
                  ))}
                  <span className="ml-2 text-sm font-semibold text-portal-dark">
                    {BUSINESS.rating}/5 from {BUSINESS.reviewCount}+ reviews
                  </span>
                </div>
                <p className="text-portal-gray text-sm italic">
                  "{page.reviews[0].text}"
                </p>
                <p className="text-portal-mid text-xs mt-1">
                  - {page.reviews[0].author}
                </p>
              </div>

              {/* Link to full site */}
              <div className="mt-6 flex items-center gap-4 text-sm">
                <a
                  href={`${BUSINESS.url}/reviews`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-portal-accent font-semibold no-underline hover:text-portal-accent-dark transition-colors"
                >
                  See all {BUSINESS.reviewCount}+ reviews
                  <ExternalLink size={14} />
                </a>
                <a
                  href={BUSINESS.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-portal-mid no-underline hover:text-portal-dark transition-colors"
                >
                  Visit our website
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>

            {/* Right: Form */}
            <div>
              {submitted ? (
                <div className="bg-green-50 rounded-xl p-10 text-center">
                  <CheckCircle
                    size={48}
                    className="text-green-600 mx-auto mb-4"
                  />
                  <h2 className="text-2xl font-bold text-green-800 mb-3">
                    Request Received!
                  </h2>
                  <p className="text-green-700 mb-4">
                    Your email client should have opened with the estimate
                    request. If not, please contact us directly:
                  </p>
                  <a
                    href={BUSINESS.phoneHref}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-portal-accent text-white font-bold rounded-lg no-underline hover:bg-portal-accent-dark transition-colors"
                  >
                    <Phone size={18} />
                    Call {BUSINESS.phone}
                  </a>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-lg border border-portal-light p-6 sm:p-8">
                  <h2 className="text-xl font-bold text-portal-dark mb-1">
                    Get Your Free Estimate
                  </h2>
                  <p className="text-sm text-portal-mid mb-5">
                    No obligation. We typically respond within a couple
                    hours.
                  </p>
                  <LeadForm
                    onSubmit={handleFormSubmit}
                    defaultProjectType={page.defaultProjectType}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="py-12 sm:py-16 bg-portal-cream">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-portal-dark text-center mb-8">
            What Seattle Homeowners Say
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {gridReviews.map((review, i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-6 shadow-sm border border-portal-light"
              >
                <div className="flex gap-0.5 mb-3">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={16}
                      className="text-yellow-500 fill-yellow-500"
                    />
                  ))}
                </div>
                <p className="text-portal-gray text-sm leading-relaxed mb-3">
                  "{review.text}"
                </p>
                <p className="text-portal-dark font-semibold text-sm">
                  {review.author}
                </p>
              </div>
            ))}
          </div>
          {extraReviews.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              {extraReviews.map((review, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl p-6 shadow-sm border border-portal-light"
                >
                  <div className="flex gap-0.5 mb-3">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={16}
                        className="text-yellow-500 fill-yellow-500"
                      />
                    ))}
                  </div>
                  <p className="text-portal-gray text-sm leading-relaxed mb-3">
                    "{review.text}"
                  </p>
                  <p className="text-portal-dark font-semibold text-sm">
                    {review.author}
                  </p>
                </div>
              ))}
            </div>
          )}
          <div className="text-center mt-6">
            <a
              href={`${BUSINESS.url}/reviews`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-portal-accent font-semibold text-sm no-underline hover:text-portal-accent-dark transition-colors"
            >
              See all {BUSINESS.reviewCount}+ reviews
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="py-12 sm:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-portal-dark text-center mb-8">
            {page.galleryTitle}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {page.galleryImages.map((img, i) => (
              <div
                key={i}
                className="aspect-square rounded-lg overflow-hidden"
              >
                <img
                  src={img}
                  alt={`${page.headline} project ${i + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-12 sm:py-16 bg-portal-dark text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-white/80 mb-6 text-lg">
            Call us directly or{" "}
            <a
              href="#estimate-form"
              className="text-portal-accent underline hover:text-white transition-colors"
            >
              request an estimate online
            </a>
            .
          </p>
          <a
            href={BUSINESS.phoneHref}
            className="inline-flex items-center gap-2 px-8 py-4 bg-portal-accent text-white font-bold text-lg rounded-lg no-underline hover:bg-portal-accent-dark transition-colors"
          >
            <Phone size={20} />
            Call {BUSINESS.phone}
          </a>
          <p className="text-white/50 text-sm mt-4">
            Portal LLC | Licensed & Insured | {BUSINESS.license} | Seattle, WA
          </p>
        </div>
      </section>
    </>
  );
}
