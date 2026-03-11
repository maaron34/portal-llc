import { Star } from "lucide-react";
import SEO from "../components/SEO";
import { PAGE_SEO } from "../data/seo";
import { BUSINESS, REVIEWS } from "../data/content";
import { useReveal } from "../utils/useReveal";

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} className={`reveal ${visible ? "visible" : ""} ${className}`}>
      {children}
    </div>
  );
}

export default function Reviews() {
  return (
    <>
      <SEO seo={PAGE_SEO.reviews} />

      {/* Hero */}
      <section className="pt-28 pb-16 sm:pt-36 sm:pb-20 bg-portal-cream">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <div className="flex items-center justify-center gap-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={28}
                className="text-amber-400 fill-amber-400"
              />
            ))}
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-portal-dark mb-4">
            {BUSINESS.reviewCount}+ Five-Star Reviews
          </h1>
          <p className="text-xl text-portal-mid max-w-lg mx-auto">
            {BUSINESS.rating} average rating on Google. Here's what our customers say.
          </p>
          <div className="flex items-center justify-center gap-6 mt-6 text-sm text-portal-mid">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-portal-accent" />
              Google
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              HomeAdvisor
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              BuildZoom
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              NiceJob
            </span>
          </div>
        </div>
      </section>

      {/* Reviews Wall */}
      <section className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
            {REVIEWS.map((review) => {
              const sourceColor =
                review.source === "Google"
                  ? "bg-portal-accent"
                  : review.source === "HomeAdvisor"
                  ? "bg-amber-500"
                  : review.source === "NiceJob"
                  ? "bg-emerald-500"
                  : "bg-blue-500";
              return (
                <Reveal key={review.author}>
                  <blockquote className="bg-portal-cream rounded-xl p-6 sm:p-8 break-inside-avoid">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            className="text-amber-400 fill-amber-400"
                          />
                        ))}
                      </div>
                      <span className={`text-xs font-medium text-white px-2 py-0.5 rounded-full ${sourceColor}`}>
                        {review.source}
                      </span>
                    </div>
                    <p className="text-portal-gray leading-relaxed mb-4 italic text-sm sm:text-base">
                      "{review.text}"
                    </p>
                    <cite className="text-sm font-semibold text-portal-dark not-italic">
                      - {review.author}
                    </cite>
                  </blockquote>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
