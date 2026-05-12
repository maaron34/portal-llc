import { useParams, Link, Navigate } from "react-router-dom";
import { ArrowRight, MapPin, CloudRain, CheckCircle } from "lucide-react";
import SEO from "../components/SEO";
import { generateLocalBusinessSchema, generateFAQSchema } from "../data/seo";
import { NEIGHBORHOODS } from "../data/neighborhoods";
import { BUSINESS } from "../data/content";
import { SERVICE_BRIEF } from "../data/services";

/**
 * Per-neighborhood landing page.
 *
 * Captures "{neighborhood} concrete contractor" long-tail intent and gives
 * AI engines the per-neighborhood content they cite for head queries.
 *
 * Route: /concrete-contractor/:slug (see App.tsx).
 */
export default function NeighborhoodPage() {
  const { slug } = useParams<{ slug: string }>();
  const neighborhood = NEIGHBORHOODS.find((n) => n.slug === slug);

  if (!neighborhood || !slug) {
    return <Navigate to="/" replace />;
  }

  const seo = {
    title: neighborhood.metaTitle,
    description: neighborhood.metaDescription,
    canonical: `${BUSINESS.url}/concrete-contractor/${slug}`,
  };

  // Build a neighborhood-scoped LocalBusiness schema with this neighborhood
  // as the primary areaServed and the page-specific geo coords. The default
  // LocalBusiness schema (16 neighborhoods + West Seattle centroid) still
  // shows up on home/services; this one is tuned for the route.
  const localBizSchema = generateLocalBusinessSchema();
  const neighborhoodLocalBiz = {
    ...localBizSchema,
    areaServed: [
      { "@type": "City", name: `${neighborhood.name}, Seattle, WA` },
      ...localBizSchema.areaServed,
    ],
    geo: {
      "@type": "GeoCoordinates",
      latitude: neighborhood.approximateLat,
      longitude: neighborhood.approximateLng,
    },
  };

  // Page-specific FAQ schema scoped to the neighborhood Q's
  const neighborhoodFaqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: neighborhood.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  // Pull the home page's FAQ schema too so the page has broad FAQ coverage,
  // not just neighborhood ones.
  const baseFaqSchema = generateFAQSchema();

  return (
    <>
      <SEO
        seo={seo}
        schema={[neighborhoodLocalBiz, neighborhoodFaqSchema, baseFaqSchema]}
      />

      {/* Hero */}
      <section className="relative pt-20">
        <div className="aspect-[3/1] sm:aspect-[4/1] relative overflow-hidden">
          <img
            src={neighborhood.heroImage}
            alt={`Concrete work by Portal in ${neighborhood.name}, Seattle`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-portal-dark/85 via-portal-dark/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-10 sm:pb-16">
              <div className="flex items-center gap-2 text-white/80 text-sm font-semibold uppercase tracking-wide mb-3">
                <MapPin size={16} />
                <span>{neighborhood.name}, Seattle</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-extrabold text-white">
                {neighborhood.h1}
              </h1>
            </div>
          </div>
        </div>
      </section>

      {/* Local context */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <p className="text-lg text-portal-mid leading-relaxed mb-8">
            {neighborhood.localContext}
          </p>

          {/* Trust bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 my-10 border-y border-portal-warm/30">
            <div className="flex items-center gap-2 text-sm text-portal-gray">
              <CheckCircle size={16} className="text-portal-accent shrink-0" />
              <span>Licensed & Insured</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-portal-gray">
              <CheckCircle size={16} className="text-portal-accent shrink-0" />
              <span>{BUSINESS.reviewCount}+ Five-Star Reviews</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-portal-gray">
              <CheckCircle size={16} className="text-portal-accent shrink-0" />
              <span>Free Estimates</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-portal-gray">
              <CheckCircle size={16} className="text-portal-accent shrink-0" />
              <span>{BUSINESS.founderYearsExperience}+ Years Experience</span>
            </div>
          </div>

          {/* Common projects */}
          <h2 className="text-2xl sm:text-3xl font-bold text-portal-dark mb-5">
            What we do in {neighborhood.name}
          </h2>
          <ul className="space-y-3 mb-12">
            {neighborhood.commonProjects.map((project) => (
              <li
                key={project}
                className="flex items-start gap-3 text-portal-gray leading-relaxed"
              >
                <span className="w-2 h-2 rounded-full bg-portal-accent shrink-0 mt-2.5" />
                <span>{project}</span>
              </li>
            ))}
          </ul>

          {/* Climate / freeze-thaw */}
          <div className="bg-portal-cream rounded-xl p-6 sm:p-8 my-10 flex gap-4">
            <CloudRain size={24} className="text-portal-accent shrink-0 mt-1" />
            <p className="text-portal-mid leading-relaxed">
              {neighborhood.freezeThaw}
            </p>
          </div>

          {/* Services grid */}
          <h2 className="text-2xl sm:text-3xl font-bold text-portal-dark mb-5 mt-12">
            Services available in {neighborhood.name}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SERVICE_BRIEF.map((service) => (
              <Link
                key={service.slug}
                to={`/services/${service.slug}`}
                className="group flex items-center justify-between p-5 border border-portal-warm/40 rounded-xl no-underline hover:border-portal-accent hover:bg-portal-cream/40 transition-colors"
              >
                <div>
                  <h3 className="font-bold text-portal-dark mb-1">
                    {service.title}
                  </h3>
                  <p className="text-portal-mid text-sm">{service.description}</p>
                </div>
                <ArrowRight
                  size={20}
                  className="text-portal-accent shrink-0 ml-3 group-hover:translate-x-1 transition-transform"
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-20 bg-portal-cream">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-portal-dark mb-10 text-center">
            FAQs from {neighborhood.name} homeowners
          </h2>
          <div className="space-y-6">
            {neighborhood.faqs.map((faq) => (
              <div key={faq.question} className="bg-white rounded-xl p-6 sm:p-8">
                <h3 className="text-lg font-bold text-portal-dark mb-3">
                  {faq.question}
                </h3>
                <p className="text-portal-mid leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cross-link to other neighborhoods (replaces a previous CTA that
          duplicated the Footer's "Ready to start your project?" band).
          Internal linking between sibling neighborhood pages helps search
          engines understand they're a related cluster and gives visitors
          an easy hop to nearby coverage. */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-portal-dark mb-3 text-center">
            We also serve nearby neighborhoods
          </h2>
          <p className="text-portal-mid text-center mb-10">
            Portal works across Seattle. Here are the neighborhoods adjacent
            to {neighborhood.name}.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {NEIGHBORHOODS.filter((n) => n.slug !== neighborhood.slug).map(
              (other) => (
                <Link
                  key={other.slug}
                  to={`/concrete-contractor/${other.slug}`}
                  className="group flex items-center justify-between px-5 py-4 border border-portal-warm/40 rounded-xl no-underline hover:border-portal-accent hover:bg-portal-cream/40 transition-colors"
                >
                  <span className="font-semibold text-portal-dark">
                    {other.name}
                  </span>
                  <ArrowRight
                    size={16}
                    className="text-portal-accent shrink-0 group-hover:translate-x-1 transition-transform"
                  />
                </Link>
              )
            )}
          </div>
        </div>
      </section>
    </>
  );
}
