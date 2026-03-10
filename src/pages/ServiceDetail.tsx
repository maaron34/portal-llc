import { useParams, Link, Navigate } from "react-router-dom";
import { ArrowRight, AlertCircle } from "lucide-react";
import SEO from "../components/SEO";
import { PAGE_SEO, generateServiceSchema } from "../data/seo";
import { SERVICES } from "../data/services";

export default function ServiceDetail() {
  const { slug } = useParams<{ slug: string }>();
  const service = SERVICES.find((s) => s.slug === slug);

  if (!service || !slug) {
    return <Navigate to="/services" replace />;
  }

  const seo = PAGE_SEO[slug] || PAGE_SEO.services;

  return (
    <>
      <SEO seo={seo} schema={generateServiceSchema(service)} />

      {/* Hero */}
      <section className="relative pt-20">
        <div className="aspect-[3/1] sm:aspect-[4/1] relative overflow-hidden">
          <img
            src={service.heroImage}
            alt={service.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-portal-dark/80 via-portal-dark/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-10 sm:pb-16">
              <h1 className="text-3xl sm:text-5xl font-extrabold text-white">
                {service.title}
              </h1>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <p className="text-lg text-portal-mid leading-relaxed mb-10">
            {service.intro}
          </p>

          {/* Services List */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-portal-dark mb-5">
              Services
            </h2>
            <ul className="space-y-3">
              {service.services.map((s) => (
                <li
                  key={s}
                  className="flex items-center gap-3 text-portal-gray"
                >
                  <span className="w-2 h-2 rounded-full bg-portal-accent shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>

          {/* Extras (finish options, etc.) */}
          {service.extras && (
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-portal-dark mb-5">
                {service.extras.title}
              </h2>
              <ul className="space-y-3">
                {service.extras.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-portal-gray"
                  >
                    <span className="w-2 h-2 rounded-full bg-portal-accent shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Process */}
          {service.process && (
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-portal-dark mb-5">
                {service.process.title}
              </h2>
              <ol className="space-y-4">
                {service.process.steps.map((step, idx) => (
                  <li key={idx} className="flex gap-4 text-portal-gray">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-portal-accent text-white text-sm font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="pt-1">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Note */}
          {service.note && (
            <div className="bg-portal-cream rounded-xl p-6 flex gap-3 mb-10">
              <AlertCircle
                size={20}
                className="text-portal-accent shrink-0 mt-0.5"
              />
              <p className="text-portal-mid text-sm leading-relaxed">
                {service.note}
              </p>
            </div>
          )}

          {/* CTA */}
          <div className="bg-portal-dark rounded-xl p-8 sm:p-10 text-center">
            <h3 className="text-2xl font-bold text-white mb-3">
              Ready to get started?
            </h3>
            <p className="text-white/70 mb-6">
              Get a free estimate for your {service.shortTitle.toLowerCase()}{" "}
              project.
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 bg-portal-accent text-white font-bold rounded-lg no-underline hover:bg-portal-accent-dark transition-colors"
            >
              Request an Estimate
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Gallery */}
      {service.galleryImages.length > 0 && (
        <section className="py-16 sm:py-24 bg-portal-cream">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-portal-dark mb-8">
              {service.title} Gallery
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {service.galleryImages.map((img, idx) => (
                <div
                  key={idx}
                  className="aspect-[4/3] rounded-xl overflow-hidden"
                >
                  <img
                    src={img}
                    alt={`${service.title} project ${idx + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
