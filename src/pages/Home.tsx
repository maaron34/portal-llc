import { Link } from "react-router-dom";
import { Star, ArrowRight, CheckCircle, ShieldCheck, MessageSquare, HandCoins, Instagram, CloudRain } from "lucide-react";
import SEO from "../components/SEO";
import { PAGE_SEO, generateLocalBusinessSchema, generateFAQSchema } from "../data/seo";
import { BUSINESS, REVIEWS, WHY_PORTAL, SERVICE_AREAS, SECTION_QUOTES, FAQS } from "../data/content";
import { SERVICE_BRIEF } from "../data/services";
import { useReveal } from "../utils/useReveal";

const BEFORE_AFTER = [
  { before: "/images/before-after/before-stairs.jpeg", after: "/images/before-after/after-stairs.jpeg", label: "Entry stairs" },
  { before: "/images/before-after/before-stairs2.jpeg", after: "/images/before-after/after-stairs2.jpeg", label: "Front steps" },
  { before: "/images/before-after/before-stairs3.jpeg", after: "/images/before-after/after-stairs3.jpeg", label: "Staircase" },
  { before: "/images/before-after/before-stairs4.jpeg", after: "/images/before-after/after-stairs4.jpeg", label: "Side stairs" },
];

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

      {/* Hero — white background with slow-rotating spiral watermark */}
      <section className="bg-white relative overflow-hidden pt-28 pb-6 sm:pt-36 sm:pb-8">
        <RevealStagger className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          {/* Logo + spiral watermark anchored together so the spiral
              always sits behind the wordmark on every viewport */}
          <div className="hero-logo-stack relative mx-auto w-full max-w-sm sm:max-w-xl lg:max-w-2xl mb-12 sm:mb-16">
            <img
              src="/images/brand/swirlie-logo.png"
              alt=""
              aria-hidden="true"
              className="hero-spiral-bg"
            />
            <svg
              className="hero-skater"
              viewBox="80 25 90 130"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              {/* Stick-figure skater — symmetric, both arms up, no flip needed at turnarounds */}
              <g stroke="currentColor" strokeWidth={4} strokeLinecap="round" fill="none">
                <circle cx="125" cy="38" r="9" />
                <line x1="125" y1="50" x2="125" y2="85" />
                <line x1="125" y1="58" x2="162" y2="30" />
                <line x1="125" y1="58" x2="88" y2="30" />
                <line x1="125" y1="85" x2="150" y2="130" />
                <line x1="125" y1="85" x2="100" y2="130" />
                <line x1="88" y1="138" x2="162" y2="138" strokeWidth={6} />
              </g>
              <g fill="currentColor">
                <circle cx="99" cy="146" r="4" />
                <circle cx="151" cy="146" r="4" />
              </g>
            </svg>
            <img
              src="/images/brand/portal-logo-new-tight.png"
              alt="Portal Seattle Concrete"
              className="block w-full mx-auto h-auto sm:max-w-md lg:max-w-lg relative z-10"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-5">
            <Link
              to="/contact"
              className="inline-flex items-center justify-center gap-2 px-7 py-4 bg-portal-accent text-white font-bold text-lg rounded-lg no-underline hover:bg-portal-accent-dark transition-colors"
            >
              Get a Free Estimate
              <ArrowRight size={20} />
            </Link>
            <Link
              to="/projects"
              className="inline-flex items-center justify-center gap-2 px-7 py-4 border-2 border-portal-dark/20 text-portal-dark font-bold text-lg rounded-lg no-underline hover:bg-portal-dark/5 transition-colors"
            >
              View Our Work
            </Link>
          </div>

          {/* Year-round callout */}
          <Link
            to="/year-round"
            className="inline-flex items-center gap-3 px-5 py-3 bg-amber-50 border border-amber-300 rounded-lg no-underline hover:bg-amber-100 transition-colors group mb-10 sm:mb-12"
          >
            <CloudRain size={18} className="text-amber-600 shrink-0" />
            <span className="text-portal-dark text-sm">
              We pour concrete year-round, rain or shine.{" "}
              <span className="text-amber-700 font-semibold group-hover:underline">
                Learn how
              </span>
            </span>
          </Link>

          <h1 className="text-xs sm:text-sm font-semibold text-portal-mid uppercase tracking-[0.2em] mb-5">
            Seattle Concrete Contractor
          </h1>

          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={22}
                  className="text-amber-400 fill-amber-400"
                />
              ))}
            </div>
            <span className="text-portal-dark text-lg sm:text-xl font-bold">
              Over {BUSINESS.reviewCount} Five-Star Reviews
            </span>
          </div>

          <p className="text-base sm:text-lg text-portal-mid mb-5 leading-relaxed">
            Driveways. Patios. Stairs. Retaining walls. Foundations.
          </p>

          <p className="text-portal-mid italic max-w-md mx-auto">
            "{SECTION_QUOTES[0].text}"{" "}
            <span className="text-portal-accent font-medium not-italic whitespace-nowrap">- {SECTION_QUOTES[0].author}</span>
          </p>
        </RevealStagger>

        {/* Trust bar absorbed into hero */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 mt-12 sm:mt-14 pt-8 border-t border-portal-dark/10">
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-sm font-medium text-portal-mid uppercase tracking-wide">
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
      <section className="pt-6 pb-20 sm:pt-8 sm:pb-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Reveal className="text-center mb-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-portal-dark mb-4">
              What We Do
            </h2>
            <p className="text-lg text-portal-mid max-w-xl mx-auto">
              Residential and commercial concrete projects of all sizes.{" "}
              Every job gets the same attention to detail.
            </p>
          </Reveal>
          <RevealStagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-14">
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

      {/* Before & After - Repair & Reconditioning */}
      <section className="py-20 sm:py-28 bg-portal-cream">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Reveal className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-portal-dark mb-4">
              Concrete Repair & Reconditioning
            </h2>
            <p className="text-lg text-portal-mid max-w-2xl mx-auto">
              We start by removing all the damaged concrete, repair cracks and gaps with multiple coats of polymer-modified Concrete Patch by Ardex, follow that up with a broom finish overlay of polymer-modified Concrete Dressing by Ardex, and finish it off with multiple coats of color stain and sealer.
            </p>
          </Reveal>
          <RevealStagger className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {BEFORE_AFTER.map((pair, idx) => (
              <div key={idx} className="grid grid-cols-2 gap-3">
                <div>
                  <div className="aspect-[4/3] rounded-xl overflow-hidden mb-2">
                    <img
                      src={pair.before}
                      alt={`${pair.label} before`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <p className="text-sm font-semibold text-portal-mid text-center uppercase tracking-wide">Before</p>
                </div>
                <div>
                  <div className="aspect-[4/3] rounded-xl overflow-hidden mb-2">
                    <img
                      src={pair.after}
                      alt={`${pair.label} after`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <p className="text-sm font-semibold text-portal-accent text-center uppercase tracking-wide">After</p>
                </div>
              </div>
            ))}
          </RevealStagger>
          <Reveal className="text-center mt-10">
            <Link
              to="/services/reconditioning"
              className="inline-flex items-center gap-2 text-portal-accent font-semibold no-underline hover:text-portal-accent-dark transition-colors"
            >
              Learn About Our Reconditioning Process
              <ArrowRight size={18} />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Why Portal */}
      <section className="py-20 sm:py-28">
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
          <Reveal className="text-center mt-14">
            <p className="text-portal-mid italic max-w-md mx-auto">
              "{SECTION_QUOTES[1].text}"{" "}
              <span className="text-portal-accent font-medium not-italic whitespace-nowrap">- {SECTION_QUOTES[1].author}</span>
            </p>
          </Reveal>
        </div>
      </section>

      {/* Reviews */}
      <section className="py-20 sm:py-28 bg-portal-cream">
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
            <p className="text-portal-mid mb-6">
              {BUSINESS.rating} average on Google
            </p>
            <p className="text-portal-mid italic max-w-md mx-auto">
              "{SECTION_QUOTES[2].text}"{" "}
              <span className="text-portal-accent font-medium not-italic whitespace-nowrap">- {SECTION_QUOTES[2].author}</span>
            </p>
          </Reveal>
          <RevealStagger className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {REVIEWS.slice(0, 3).map((review) => (
              <blockquote
                key={review.author}
                className="bg-white rounded-xl p-8"
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
      <section className="py-20 sm:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <Reveal>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-portal-dark mb-12 text-center">
              Frequently Asked Questions
            </h2>
          </Reveal>
          <div className="space-y-6">
            {FAQS.map((faq, idx) => (
              <Reveal key={faq.question} delay={idx < 3 ? `reveal-delay-${idx + 1}` : ""}>
                <div className="bg-portal-cream rounded-xl p-6 sm:p-8">
                  <h3 className="text-lg font-bold text-portal-dark mb-3">
                    {faq.question}
                  </h3>
                  <p className="text-portal-mid leading-relaxed">
                    {faq.answer}
                    {faq.question.includes("rain") && (
                      <>
                        {" "}
                        <Link to="/year-round" className="text-portal-accent font-semibold hover:text-portal-accent-dark transition-colors">
                          Learn more about our all-weather process.
                        </Link>
                      </>
                    )}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="text-center mt-12">
            <p className="text-portal-mid italic max-w-md mx-auto">
              "{SECTION_QUOTES[3].text}"{" "}
              <span className="text-portal-accent font-medium not-italic whitespace-nowrap">- {SECTION_QUOTES[3].author}</span>
            </p>
          </Reveal>
        </div>
      </section>

      {/* Instagram */}
      <section className="py-16 sm:py-20 bg-portal-dark">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Reveal className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10">
            <div className="text-center sm:text-left">
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                Check out our latest projects
              </h3>
              <p className="text-white/60 text-sm">
                Follow us for before & afters, project updates, and behind-the-scenes.
              </p>
            </div>
            <a
              href={BUSINESS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white font-semibold rounded-lg no-underline hover:opacity-90 transition-opacity"
            >
              <Instagram size={22} />
              @portal.llc
            </a>
          </Reveal>
        </div>
      </section>

      {/* Service Areas */}
      <section className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <Reveal>
            <div className="flex items-center justify-center gap-4 sm:gap-6 mb-6">
              <img
                src="/images/brand/swirlie-logo.png"
                alt="Portal"
                className="h-14 sm:h-18 w-auto opacity-80 shrink-0"
              />
              <p className="text-xl sm:text-2xl font-semibold text-portal-accent italic text-left">
                {BUSINESS.tagline}
              </p>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-portal-dark mb-4">
              Serving Seattle and Surrounding Areas
            </h2>
            <p className="text-lg text-portal-mid mb-10">
              All Seattle and Seattle-adjacent neighborhoods including
            </p>
          </Reveal>
          <Reveal>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
              {SERVICE_AREAS.map((area) => (
                <span
                  key={area}
                  className="px-4 py-2.5 bg-portal-cream rounded-full text-sm font-medium text-portal-gray text-center"
                >
                  {area}
                </span>
              ))}
            </div>
            <p className="text-portal-mid mt-6">
              + all Seattle-adjacent neighborhoods
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
