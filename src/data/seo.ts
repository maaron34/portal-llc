import { BUSINESS, REVIEWS, SERVICE_AREAS, FAQS } from "./content";
import { SERVICES } from "./services";

export interface PageSEO {
  title: string;
  description: string;
  canonical: string;
}

export const PAGE_SEO: Record<string, PageSEO> = {
  home: {
    title: "Portal LLC | Seattle's Residential Concrete Experts",
    description:
      "Portal LLC is a residential concrete contractor serving West Seattle and the greater Seattle area. Driveways, patios, walkways, stairs, retaining walls, and foundation work. 80+ five-star reviews.",
    canonical: "https://buildwithportal.com",
  },
  services: {
    title: "Residential Concrete Services | Portal LLC Seattle",
    description:
      "Everything from driveway replacements to foundation repairs. One crew, start to finish. Serving Seattle neighborhoods including West Seattle, Ballard, Capitol Hill, and more.",
    canonical: "https://buildwithportal.com/services",
  },
  driveways: {
    title: "Concrete Driveways Seattle | Installation & Replacement | Portal LLC",
    description:
      "New driveway installation, full replacements, extensions, and repairs for Seattle homes. From small single-car driveways to 5,000+ sq ft. Free estimates.",
    canonical: "https://buildwithportal.com/services/driveways",
  },
  patios: {
    title: "Concrete Patios Seattle | Installation & Design | Portal LLC",
    description:
      "Custom concrete patios for Seattle homes. Broom finish, exposed aggregate, and stamped options. New installations and replacements. Free estimates.",
    canonical: "https://buildwithportal.com/services/patios",
  },
  "walkways-stairs": {
    title: "Concrete Walkways & Stairs Seattle | Portal LLC",
    description:
      "Concrete walkway and stair installation and replacement in Seattle. Front walks, garden paths, entry stairs, and stoops. Built to handle Seattle weather.",
    canonical: "https://buildwithportal.com/services/walkways-stairs",
  },
  "retaining-walls": {
    title: "Retaining Walls Seattle | Concrete Retaining Wall Contractor | Portal LLC",
    description:
      "Poured concrete retaining walls for Seattle's hillside properties. Erosion control, yard leveling, and structural walls. Permits and engineering coordinated.",
    canonical: "https://buildwithportal.com/services/retaining-walls",
  },
  "foundation-work": {
    title: "Foundation Work Seattle | Repair & ADU Foundations | Portal LLC",
    description:
      "Residential foundation repairs, crack sealing, ADU foundations, and garage slabs in Seattle. Licensed, bonded, insured. Free estimates.",
    canonical: "https://buildwithportal.com/services/foundation-work",
  },
  projects: {
    title: "Our Work | Concrete Projects Gallery | Portal LLC Seattle",
    description:
      "See our completed concrete projects across Seattle. Driveways, patios, walkways, stairs, retaining walls, and more. 80+ five-star reviews.",
    canonical: "https://buildwithportal.com/projects",
  },
  about: {
    title: "About Portal LLC | Seattle Concrete Contractor",
    description:
      "Family-owned residential concrete contractor based in West Seattle. Founded by Chris Hildebrand with 35+ years in construction. Licensed, bonded, insured.",
    canonical: "https://buildwithportal.com/about",
  },
  reviews: {
    title: "Customer Reviews | Portal LLC Seattle Concrete Contractor",
    description:
      "Read 80+ five-star reviews from Portal LLC customers. See why Seattle homeowners trust us for driveways, patios, walkways, retaining walls, and foundation work.",
    canonical: "https://buildwithportal.com/reviews",
  },
  contact: {
    title: "Contact Portal LLC | Free Concrete Estimate Seattle",
    description:
      "Request a free estimate or ask a question. We typically respond within 24 hours. Call (206) 419-3880 or fill out our contact form.",
    canonical: "https://buildwithportal.com/contact",
  },
};

export function generateLocalBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "ConcreteContractor",
    "@id": BUSINESS.url,
    name: BUSINESS.name,
    description: PAGE_SEO.home.description,
    url: BUSINESS.url,
    telephone: BUSINESS.phone,
    email: BUSINESS.email,
    areaServed: SERVICE_AREAS.map((area) => ({
      "@type": "City",
      name: area + ", WA",
    })),
    address: {
      "@type": "PostalAddress",
      addressLocality: BUSINESS.address.city,
      addressRegion: BUSINESS.address.state,
      addressCountry: "US",
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "07:30",
        closes: "17:00",
      },
    ],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: BUSINESS.rating,
      reviewCount: BUSINESS.reviewCount,
      bestRating: 5,
    },
    review: REVIEWS.map((r) => ({
      "@type": "Review",
      reviewRating: {
        "@type": "Rating",
        ratingValue: r.rating,
      },
      author: {
        "@type": "Person",
        name: r.author,
      },
      reviewBody: r.text,
    })),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Residential Concrete Services",
      itemListElement: SERVICES.map((s) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: s.title,
          description: s.intro,
        },
      })),
    },
    image: BUSINESS.url + "/images/brand/portal-logo.jpeg",
    sameAs: [BUSINESS.instagram],
    priceRange: "$$",
  };
}

export function generateFAQSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function generateServiceSchema(service: (typeof SERVICES)[number]) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    description: service.intro,
    provider: {
      "@type": "ConcreteContractor",
      name: BUSINESS.name,
      url: BUSINESS.url,
    },
    areaServed: SERVICE_AREAS.map((area) => ({
      "@type": "City",
      name: area + ", WA",
    })),
    serviceType: service.title,
  };
}
