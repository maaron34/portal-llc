import { useState } from "react";
import { X, ChevronLeft, ChevronRight, Instagram } from "lucide-react";
import SEO from "../components/SEO";
import { PAGE_SEO } from "../data/seo";
import { BUSINESS } from "../data/content";
import { SERVICES } from "../data/services";

type FilterType = "all" | string;

export default function Projects() {
  const [filter, setFilter] = useState<FilterType>("all");
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const allProjects = SERVICES.flatMap((service) =>
    service.galleryImages.map((img, idx) => ({
      src: img,
      alt: `${service.title} project ${idx + 1}`,
      category: service.slug,
      categoryLabel: service.shortTitle,
    }))
  );

  const filtered =
    filter === "all"
      ? allProjects
      : allProjects.filter((p) => p.category === filter);

  const categories = [
    { value: "all", label: "All Projects" },
    ...SERVICES.map((s) => ({ value: s.slug, label: s.shortTitle })),
  ];

  const openLightbox = (idx: number) => setLightboxIdx(idx);
  const closeLightbox = () => setLightboxIdx(null);
  const prev = () =>
    setLightboxIdx((i) => (i !== null && i > 0 ? i - 1 : filtered.length - 1));
  const next = () =>
    setLightboxIdx((i) => (i !== null && i < filtered.length - 1 ? i + 1 : 0));

  return (
    <>
      <SEO seo={PAGE_SEO.projects} />

      {/* Hero */}
      <section className="pt-28 pb-16 sm:pt-36 sm:pb-20 bg-portal-cream">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-portal-dark mb-4">
            Our Work
          </h1>
          <p className="text-xl text-portal-mid max-w-2xl mx-auto">
            Browse our completed projects across Seattle.
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="py-8 border-b border-portal-light sticky top-16 sm:top-20 bg-white/95 backdrop-blur-sm z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => {
                  setFilter(cat.value);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium border-none cursor-pointer transition-colors ${
                  filter === cat.value
                    ? "bg-portal-accent text-white"
                    : "bg-portal-cream text-portal-gray hover:bg-portal-light"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="py-12 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filtered.map((project, idx) => (
              <button
                key={`${project.src}-${idx}`}
                onClick={() => openLightbox(idx)}
                className="aspect-square rounded-xl overflow-hidden group cursor-pointer border-none p-0 bg-transparent"
              >
                <img
                  src={project.src}
                  alt={project.alt}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </button>
            ))}
            <a
              href={BUSINESS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="aspect-square rounded-xl overflow-hidden flex flex-col items-center justify-center gap-3 bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 no-underline hover:opacity-90 transition-opacity"
            >
              <Instagram size={40} className="text-white" />
              <span className="text-white font-semibold text-sm text-center px-4">
                See more on Instagram
              </span>
            </a>
          </div>
          {filtered.length === 0 && (
            <p className="text-center text-portal-mid py-20">
              No projects found for this category.
            </p>
          )}
        </div>
      </section>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-transparent border-none cursor-pointer z-10"
            aria-label="Close"
          >
            <X size={32} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            className="absolute left-4 text-white/80 hover:text-white bg-transparent border-none cursor-pointer z-10"
            aria-label="Previous"
          >
            <ChevronLeft size={40} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            className="absolute right-4 text-white/80 hover:text-white bg-transparent border-none cursor-pointer z-10"
            aria-label="Next"
          >
            <ChevronRight size={40} />
          </button>
          <img
            src={filtered[lightboxIdx].src}
            alt={filtered[lightboxIdx].alt}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-4 text-white/60 text-sm">
            {lightboxIdx + 1} / {filtered.length}
          </div>
        </div>
      )}
    </>
  );
}
