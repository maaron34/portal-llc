import { Link } from "react-router-dom";
import { ArrowRight, Snowflake, CloudRain, ShieldCheck } from "lucide-react";
import SEO from "../components/SEO";
import { PAGE_SEO } from "../data/seo";

export default function YearRound() {
  return (
    <>
      <SEO seo={PAGE_SEO.yearRound} />

      {/* Hero */}
      <section className="relative pt-20">
        <div className="aspect-[3/1] sm:aspect-[4/1] relative overflow-hidden bg-portal-dark">
          <img
            src="/images/winter/tent-setup.jpg"
            alt="Portal tent structure for winter concrete pouring"
            className="w-full h-full object-cover"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-portal-dark/60" />
          <div className="absolute inset-0 flex items-center justify-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white text-center px-4">
              We Pour Concrete Year-Round
            </h1>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="space-y-8 text-portal-gray leading-relaxed text-lg">
            <p>
              Even in Seattle's rainy winters, we pour concrete year-round. In fact,
              winter can be one of the best times to schedule a project because demand
              is lower and we can often start much sooner than during the busy spring
              and summer months.
            </p>
            <p>
              Seattle's winter temperatures are typically mild and rarely cold enough
              to negatively affect concrete. When temperatures do dip near or below
              freezing, we protect fresh pours with insulated concrete blankets to
              ensure proper curing.
            </p>
          </div>

          {/* Photo grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-12">
            <div className="aspect-[4/3] rounded-xl overflow-hidden">
              <img
                src="/images/winter/tent-closeup.jpg"
                alt="Tent structure protecting a concrete pour from rain"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="aspect-[4/3] rounded-xl overflow-hidden">
              <img
                src="/images/winter/tent-stairs.jpg"
                alt="Finished concrete stairs under protective tent"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          </div>

          <div className="space-y-8 text-portal-gray leading-relaxed text-lg">
            <p>
              It's also important to understand that about 90% of a concrete project
              is preparation - excavation, forming, base work, and reinforcement -
              and that work can be done in virtually any weather. The only stage where
              rain truly matters is during the actual pour.
            </p>
            <p>
              When rain is in the forecast, we simply build temporary tent structures
              over the work area so the concrete can be placed and finished properly.
              Rain is a factor year-round in the Pacific Northwest, and our crews are
              well-equipped to manage it.
            </p>
            <p className="text-portal-dark font-semibold text-xl">
              The result is the same high-quality concrete work, delivered faster and
              on your schedule - even during the winter months.
            </p>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div>
              <div className="w-12 h-12 rounded-xl bg-portal-accent/10 flex items-center justify-center mb-4">
                <Snowflake size={24} className="text-portal-accent" />
              </div>
              <h3 className="text-lg font-bold text-portal-dark mb-2">
                Mild Seattle Winters
              </h3>
              <p className="text-portal-mid">
                Temperatures rarely drop low enough to affect concrete. When they do,
                insulated blankets keep everything curing properly.
              </p>
            </div>
            <div>
              <div className="w-12 h-12 rounded-xl bg-portal-accent/10 flex items-center justify-center mb-4">
                <CloudRain size={24} className="text-portal-accent" />
              </div>
              <h3 className="text-lg font-bold text-portal-dark mb-2">
                Rain-Ready Crews
              </h3>
              <p className="text-portal-mid">
                Temporary tent structures protect the pour from rain. 90% of the work
                - excavation, forming, base work - happens rain or shine.
              </p>
            </div>
            <div>
              <div className="w-12 h-12 rounded-xl bg-portal-accent/10 flex items-center justify-center mb-4">
                <ShieldCheck size={24} className="text-portal-accent" />
              </div>
              <h3 className="text-lg font-bold text-portal-dark mb-2">
                Faster Scheduling
              </h3>
              <p className="text-portal-mid">
                Lower winter demand means we can often start your project sooner than
                during the busy spring and summer months.
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-16 text-center">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-7 py-4 bg-portal-accent text-white font-bold text-lg rounded-lg no-underline hover:bg-portal-accent-dark transition-colors"
            >
              Get a Free Estimate
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
