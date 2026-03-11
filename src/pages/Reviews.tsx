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
        </div>
      </section>

      {/* Reviews Grid */}
      <section className="py-20 sm:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {REVIEWS.map((review) => (
              <Reveal key={review.author}>
                <blockquote className="bg-portal-cream rounded-xl p-8 h-full">
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
              </Reveal>
            ))}
          </div>

          <Reveal className="text-center mt-14">
            <p className="text-portal-mid">
              These reviews are from Google, BuildZoom, and HomeAdvisor.
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
