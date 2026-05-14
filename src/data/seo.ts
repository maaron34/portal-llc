import { BUSINESS, SERVICE_AREAS, FAQS } from "./content";
import { SERVICES } from "./services";

export interface PageSEO {
  title: string;
  description: string;
  canonical: string;
}

export const PAGE_SEO: Record<string, PageSEO> = {
  home: {
    title: "Portal | Seattle Concrete Contractor | Residential & Commercial",
    description:
      "Portal is a residential and commercial concrete contractor serving Seattle. Driveways, patios, walkways, stairs, retaining walls, foundations, and concrete repair. 100+ five-star reviews.",
    canonical: "https://buildwithportal.com",
  },
  services: {
    title: "Concrete Services Seattle | Residential & Commercial | Portal",
    description:
      "Everything from driveway replacements to foundation repairs. One crew, start to finish. Serving Seattle neighborhoods including West Seattle, Ballard, Capitol Hill, and more.",
    canonical: "https://buildwithportal.com/services",
  },
  driveways: {
    title: "Concrete Driveways Seattle | Installation & Replacement | Portal",
    description:
      "New driveway installation, full replacements, extensions, and repairs for Seattle homes. From small single-car driveways to 5,000+ sq ft. Free estimates.",
    canonical: "https://buildwithportal.com/services/driveways",
  },
  patios: {
    title: "Concrete Patios Seattle | Installation & Design | Portal",
    description:
      "Custom concrete patios for Seattle homes. Broom finish, exposed aggregate, and stamped options. New installations and replacements. Free estimates.",
    canonical: "https://buildwithportal.com/services/patios",
  },
  "walkways-stairs": {
    title: "Concrete Walkways & Stairs Seattle | Portal",
    description:
      "Concrete walkway and stair installation and replacement in Seattle. Front walks, garden paths, entry stairs, and stoops. Built to handle Seattle weather.",
    canonical: "https://buildwithportal.com/services/walkways-stairs",
  },
  "retaining-walls": {
    title: "Retaining Walls Seattle | Concrete Retaining Wall Contractor | Portal",
    description:
      "Poured concrete retaining walls for Seattle's hillside properties. Erosion control, yard leveling, and structural walls. Permits and engineering coordinated.",
    canonical: "https://buildwithportal.com/services/retaining-walls",
  },
  "foundation-work": {
    title: "Foundation Work Seattle | Repair & ADU Foundations | Portal",
    description:
      "Residential foundation repairs, crack sealing, ADU foundations, and garage slabs in Seattle. Licensed, bonded, insured. Free estimates.",
    canonical: "https://buildwithportal.com/services/foundation-work",
  },
  reconditioning: {
    title: "Concrete Repair & Reconditioning Seattle | Portal",
    description:
      "Concrete repair and reconditioning in Seattle. Crack repair, surface restoration, polymer-modified Ardex patching, broom finish overlay, color stain, and sealer. Free estimates.",
    canonical: "https://buildwithportal.com/services/reconditioning",
  },
  projects: {
    title: "Our Work | Concrete Projects Gallery | Portal Seattle",
    description:
      "See our completed concrete projects across Seattle. Driveways, patios, walkways, stairs, retaining walls, and more. 100+ five-star reviews.",
    canonical: "https://buildwithportal.com/projects",
  },
  about: {
    title: "About Portal | Seattle Concrete Contractor",
    description:
      "Family-owned residential concrete contractor serving Seattle and surrounding neighborhoods. Founded by Chris Hildebrand with 35+ years in construction. Licensed, bonded, insured.",
    canonical: "https://buildwithportal.com/about",
  },
  reviews: {
    title: "Customer Reviews | Portal Seattle Concrete Contractor",
    description:
      "Read 100+ five-star reviews from Portal customers. See why Seattle homeowners trust us for driveways, patios, walkways, retaining walls, and foundation work.",
    canonical: "https://buildwithportal.com/reviews",
  },
  contact: {
    title: "Contact Portal | Free Concrete Estimate Seattle",
    description:
      "Request a free estimate or ask a question. We typically respond within 24 hours. Call (206) 829-6396 or fill out our contact form.",
    canonical: "https://buildwithportal.com/contact",
  },
  yearRound: {
    title: "Year-Round Concrete Work in Seattle | Portal",
    description:
      "Portal pours concrete year-round in Seattle, even during rainy winters. Learn how we use tent structures and insulated blankets to deliver high-quality results in any season.",
    canonical: "https://buildwithportal.com/year-round",
  },
  refer: {
    title: "Refer a Friend — You Both Get $100 | Portal Seattle Concrete",
    description:
      "Refer a friend to Portal Concrete and you both get $100. Your friend gets $100 off their first Portal job. You get $100 when their job is booked.",
    canonical: "https://buildwithportal.com/refer",
  },
};

export function generateLocalBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": ["HomeAndConstructionBusiness", "LocalBusiness"],
    "@id": BUSINESS.url,
    name: BUSINESS.name,
    description: PAGE_SEO.home.description,
    url: BUSINESS.url,
    telephone: BUSINESS.phone,
    email: BUSINESS.email,
    foundingDate: "2020", // Chris founded Portal ~2020 (6 yrs in business as of 2026)
    founder: {
      "@type": "Person",
      name: BUSINESS.founder,
      jobTitle: "Owner & Lead Contractor",
      description: `${BUSINESS.founderYearsExperience}+ years of construction experience. Founder of ${BUSINESS.name}, based in Seattle.`,
      worksFor: {
        "@type": "Organization",
        name: BUSINESS.name,
      },
    },
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
    geo: {
      "@type": "GeoCoordinates",
      // Approximate centroid of West Seattle (Portal's service base).
      // Used by Google for local-pack distance ranking + voice search.
      latitude: 47.5712,
      longitude: -122.3854,
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
    identifier: {
      "@type": "PropertyValue",
      propertyID: "WA Contractor License",
      value: BUSINESS.license,
    },
    image: BUSINESS.url + "/images/brand/portal-logo-new.jpeg",
    sameAs: [BUSINESS.instagram, BUSINESS.facebook],
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
      "@type": "HomeAndConstructionBusiness",
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
