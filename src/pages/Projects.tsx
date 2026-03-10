import { useState } from "react";
import SEO from "../components/SEO";
import { PAGE_SEO } from "../data/seo";
import { SERVICES } from "../data/services";

type FilterType = "all" | string;

export default function Projects() {
  const [filter, setFilter] = useState<FilterType>("all");

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
                onClick={() => setFilter(cat.value)}
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
              <div
                key={`${project.src}-${idx}`}
                className="aspect-square rounded-xl overflow-hidden group"
              >
                <img
                  src={project.src}
                  alt={project.alt}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="text-center text-portal-mid py-20">
              No projects found for this category.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
