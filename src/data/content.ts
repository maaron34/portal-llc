export const BUSINESS = {
  name: "Portal LLC",
  tagline: "Seattle's Residential Concrete Experts",
  phone: "(206) 419-3880",
  phoneHref: "tel:+12064193880",
  email: "chris@buildwithportal.com",
  url: "https://buildwithportal.com",
  hours: "Monday-Friday 7:30 AM - 5:00 PM, Saturday by appointment",
  license: "PORTAL*803D4",
  reviewCount: 80,
  rating: 4.9,
  yearsInBusiness: 6,
  founderYearsExperience: 35,
  founder: "Chris Hildebrand",
  instagram: "https://www.instagram.com/portal.llc/",
  address: {
    city: "West Seattle",
    state: "WA",
  },
} as const;

export const SERVICE_AREAS = [
  "West Seattle",
  "Burien",
  "White Center",
  "Beacon Hill",
  "Georgetown",
  "Delridge",
  "Admiral",
  "Alki",
  "Ballard",
  "Fremont",
  "Queen Anne",
  "Capitol Hill",
  "Central District",
  "Wallingford",
  "Greenwood",
  "Columbia City",
] as const;

export const REVIEWS = [
  {
    text: "Chris and his team at Portal were communicative, prompt, and professional. Our back steps look great.",
    author: "Clare C.",
    rating: 5,
  },
  {
    text: "We had a terrific experience with Chris and his crew. The professionalism and quality were top notch!",
    author: "Raam W.",
    rating: 5,
  },
  {
    text: "Portal is an excellent company. From our initial meeting to the completion, everything went smoothly.",
    author: "Terry P.",
    rating: 5,
  },
] as const;

export const WHY_PORTAL = [
  {
    title: "Quality Work",
    description:
      "We don't cut corners. Proper prep, proper pour, proper finish -- every time. Our reviews speak for themselves.",
  },
  {
    title: "Clear Communication",
    description:
      "You'll know when we're showing up, what we're doing, and when we'll be done. No chasing us down for updates.",
  },
  {
    title: "Fair Pricing",
    description:
      "Competitive rates without hidden fees. We'll give you a clear quote and stick to it.",
  },
] as const;

export const FAQS = [
  {
    question: "How much does a concrete driveway cost in Seattle?",
    answer:
      "Costs vary based on size, site conditions, and finish type. A typical residential driveway ranges from $8-$15 per square foot. We provide free estimates with a detailed written quote after walking the site.",
  },
  {
    question: "How long does concrete take to cure?",
    answer:
      "Concrete reaches initial set within 24-48 hours, but full curing takes about 28 days. You can typically walk on new concrete after 24 hours and drive on a new driveway after 7 days.",
  },
  {
    question: "Do you remove old concrete?",
    answer:
      "Yes. We handle full demolition, haul-away, and disposal so your site is ready for new work. Demo is included in our project quotes.",
  },
  {
    question: "Do I need a permit for concrete work?",
    answer:
      "Most residential concrete work (driveways, patios, walkways) doesn't require a permit. Retaining walls over 4 feet typically do. We'll let you know during the estimate if permits are needed and handle the coordination.",
  },
  {
    question: "What areas do you serve?",
    answer:
      "We serve West Seattle, Burien, White Center, Beacon Hill, Georgetown, Delridge, Admiral, Alki, Ballard, Fremont, Queen Anne, Capitol Hill, Central District, Wallingford, Greenwood, and Columbia City.",
  },
  {
    question: "What finishes are available?",
    answer:
      "We offer broom finish (standard, slip-resistant), smooth trowel finish, exposed aggregate, and stamped/decorative concrete. We'll help you choose the best option for your project.",
  },
] as const;
