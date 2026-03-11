import { Link } from "react-router-dom";
import { Star, ArrowRight, CheckCircle, Phone, ShieldCheck, MessageSquare, HandCoins } from "lucide-react";
import SEO from "../components/SEO";
import { PAGE_SEO, generateLocalBusinessSchema, generateFAQSchema } from "../data/seo";
import { BUSINESS, REVIEWS, WHY_PORTAL, SERVICE_AREAS, FAQS } from "../data/content";
import { SERVICE_BRIEF } from "../data/services";
import { useReveal } from "../utils/useReveal";

function Reveal({ children, className = "", delay = "" }: { children: React.ReactNode; className?: string; delay?: string }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} className={`reveal ${visible ? "visible" : ""} ${delay} ${className}`}>
      {children}
    </div>
  );
}

function RevealStagger({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} className={`reveal-stagger ${visible ? "visible" : ""} ${className}`}>
      {children}
    </div>
  );
}

export default function Home() {
  return (
    <>
      <SEO
        seo={PAGE_SEO.home}
        schema={[generateLocalBusinessSchema(), generateFAQSchema()]}
      />

      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center">
        <div className="absolute inset-0">
          <img
            src="/images/stamped/wix_stamped_patio_2.jpeg"
            alt="Stamped concrete patio with pergola in Seattle"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-portal-dark/90 via-portal-dark/65 to-portal-dark/20" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-32">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-6">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={18}
                    className="text-amber-400 fill-amber-400"
                  />
                ))}
              </div>
              <span className="text-white/80 text-sm font-medium">
                {BUSINESS.reviewCount}+ five-star reviews
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tight mb-6">
              Seattle's Residential<br />
              Concrete Experts
            </h1>
            <p className="text-base sm:text-lg text-white/80 mb-8 leading-relaxed max-w-lg">
              Driveways. Patios. Stairs. Retaining walls. Foundations. Serving Seattle neighborhoods for over {BUSINESS.yearsInBusiness} years.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 bg-portal-accent text-white font-bold text-lg rounded-lg no-underline hover:bg-portal-accent-dark transition-colors"
              >
                Get a Free Estimate
                <ArrowRight size={20} />
              </Link>
              <Link
                to="/projects"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 border-2 border-white/30 text-white font-bold text-lg rounded-lg no-underline hover:bg-white/10 transition-colors"
              >
                View Our Work
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="bg-portal-dark py-5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-sm font-medium text-white/70 uppercase tracking-wide">
            <span className="flex items-center gap-2">
              <CheckCircle size={16} className="text-portal-accent" />
              Licensed & Insured
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle size={16} className="text-portal-accent" />
              {BUSINESS.reviewCount}+ Five-Star Reviews
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle size={16} className="text-portal-accent" />
              Free Estimates
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle size={16} className="text-portal-accent" />
              {BUSINESS.founderYearsExperience}+ Years Experience
            </span>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Reveal className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-portal-dark mb-4">
              What We Do
            </h2>
            <p className="text-lg text-portal-mid max-w-xl mx-auto">
              Residential concrete projects of all sizes.<br className="hidden sm:inline" />
              {" "}Every job gets the same attention to detail.
            </p>
          </Reveal>
          <RevealStagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICE_BRIEF.map((service) => (
              <Link
                key={service.slug + service.title}
                to={`/services/${service.slug}`}
                className="group block no-underline"
              >
                <div className="relative overflow-hidden rounded-xl aspect-[4/3]">
                  <img
                    src={service.image}
                    alt={service.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-portal-dark/80 via-portal-dark/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <h3 className="text-xl font-bold text-white mb-1">
                      {service.title}
                    </h3>
                    <p className="text-white/80 text-sm">
                      {service.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </RevealStagger>
          <Reveal className="text-center mt-10">
            <Link
              to="/services"
              className="inline-flex items-center gap-2 text-portal-accent font-semibold no-underline hover:text-portal-accent-dark transition-colors"
            >
              View All Services
              <ArrowRight size={18} />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Why Portal */}
      <section className="py-20 sm:py-28 bg-portal-cream">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Reveal>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-portal-dark mb-14 text-center">
              Why Homeowners Choose Portal
            </h2>
          </Reveal>
          <RevealStagger className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {WHY_PORTAL.map((item, idx) => {
              const icons = [ShieldCheck, MessageSquare, HandCoins];
              const Icon = icons[idx] || ShieldCheck;
              return (
                <div key={item.title}>
                  <div className="w-12 h-12 rounded-xl bg-portal-accent/10 flex items-center justify-center mb-4">
                    <Icon size={24} className="text-portal-accent" />
                  </div>
                  <h3 className="text-xl font-bold text-portal-dark mb-3">
                    {item.title}
                  </h3>
                  <p className="text-portal-mid leading-relaxed">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </RevealStagger>
        </div>
      </section>

      {/* Reviews */}
      <section className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Reveal className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-portal-dark mb-3">
              {BUSINESS.reviewCount}+ Five-Star Reviews
            </h2>
            <div className="flex items-center justify-center gap-1 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={24}
                  className="text-amber-400 fill-amber-400"
                />
              ))}
            </div>
            <p className="text-portal-mid">
              {BUSINESS.rating} average on Google
            </p>
          </Reveal>
          <RevealStagger className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {REVIEWS.slice(0, 3).map((review) => (
              <blockquote
                key={review.author}
                className="bg-portal-cream rounded-xl p-8"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className="text-amber-400 fill-amber-400"
                    />
                  ))}
                </div>
                <p className="text-portal-gray leading-relaxed mb-4 italic">
                  "{review.text}"
                </p>
                <cite className="text-sm font-semibold text-portal-dark not-italic">
                  - {review.author}
                </cite>
              </blockquote>
            ))}
          </RevealStagger>
          <Reveal className="text-center mt-10">
            <Link
              to="/reviews"
              className="inline-flex items-center gap-2 text-portal-accent font-semibold no-underline hover:text-portal-accent-dark transition-colors"
            >
              Read All Reviews
              <ArrowRight size={18} />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 sm:py-28 bg-portal-cream">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <Reveal>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-portal-dark mb-12 text-center">
              Frequently Asked Questions
            </h2>
          </Reveal>
          <div className="space-y-6">
            {FAQS.map((faq, idx) => (
              <Reveal key={faq.question} delay={idx < 3 ? `reveal-delay-${idx + 1}` : ""}>
                <div className="bg-white rounded-xl p-6 sm:p-8">
                  <h3 className="text-lg font-bold text-portal-dark mb-3">
                    {faq.question}
                  </h3>
                  <p className="text-portal-mid leading-relaxed">{faq.answer}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Service Areas */}
      <section className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <Reveal>
            <img
              src="/images/brand/portal-logo.jpeg"
              alt="Portal LLC"
              className="w-40 sm:w-56 h-auto rounded-lg mx-auto mb-8"
            />
            <h2 className="text-3xl sm:text-4xl font-extrabold text-portal-dark mb-4">
              Serving Seattle and Surrounding Areas
            </h2>
            <p className="text-lg text-portal-mid mb-10">
              Residential concrete services across the greater Seattle area.
            </p>
          </Reveal>
          <Reveal>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-w-2xl mx-auto">
              {SERVICE_AREAS.map((area) => (
                <span
                  key={area}
                  className="px-4 py-2.5 bg-portal-cream rounded-full text-sm font-medium text-portal-gray text-center"
                >
                  {area}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Quick Contact */}
      <section className="py-16 bg-portal-dark">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-white/70 text-lg mb-4">
            Questions? Call us directly.
          </p>
          <a
            href={BUSINESS.phoneHref}
            className="inline-flex items-center gap-3 text-3xl sm:text-4xl font-bold text-white no-underline hover:text-portal-accent transition-colors"
          >
            <Phone size={32} />
            {BUSINESS.phone}
          </a>
        </div>
      </section>
    </>
  );
}
