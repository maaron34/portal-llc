import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import SEO from "../components/SEO";
import { PAGE_SEO } from "../data/seo";
import { SERVICES } from "../data/services";
import { useReveal } from "../utils/useReveal";

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} className={`reveal ${visible ? "visible" : ""} ${className}`}>
      {children}
    </div>
  );
}

export default function Services() {
  return (
    <>
      <SEO seo={PAGE_SEO.services} />

      {/* Hero */}
      <section className="pt-28 pb-16 sm:pt-36 sm:pb-20 bg-portal-cream">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-portal-dark mb-4">
            Residential Concrete Services
          </h1>
          <p className="text-xl text-portal-mid max-w-md mx-auto">
            Everything from driveway replacements to foundation repairs.
            One crew, start to finish.
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="space-y-16">
            {SERVICES.map((service, idx) => (
              <Reveal key={service.slug}>
              <Link
                key={service.slug}
                to={`/services/${service.slug}`}
                className="group block no-underline"
              >
                <div
                  className={`grid grid-cols-1 lg:grid-cols-2 gap-8 items-center ${
                    idx % 2 === 1 ? "lg:direction-rtl" : ""
                  }`}
                >
                  <div
                    className={`overflow-hidden rounded-xl ${
                      idx % 2 === 1 ? "lg:order-2" : ""
                    }`}
                  >
                    <img
                      src={service.heroImage}
                      alt={service.title}
                      className="w-full aspect-[3/2] object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>
                  <div className={idx % 2 === 1 ? "lg:order-1" : ""}>
                    <h2 className="text-2xl sm:text-3xl font-bold text-portal-dark mb-4">
                      {service.title}
                    </h2>
                    <p className="text-portal-mid leading-relaxed mb-4">
                      {service.intro}
                    </p>
                    <ul className="space-y-2 mb-6">
                      {service.services.map((s) => (
                        <li
                          key={s}
                          className="text-portal-gray text-sm flex items-center gap-2"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-portal-accent shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                    <span className="inline-flex items-center gap-2 text-portal-accent font-semibold group-hover:text-portal-accent-dark transition-colors">
                      Learn More
                      <ArrowRight size={18} />
                    </span>
                  </div>
                </div>
              </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
