/**
 * Per-neighborhood landing pages.
 *
 * Each page is structured to capture "{neighborhood} concrete contractor"
 * long-tail intent. The neighborhood-specific copy is the AEO/SEO unlock:
 * AI search engines (Perplexity, ChatGPT, Claude) cite businesses that
 * have explicit per-neighborhood pages over those that only mention
 * neighborhoods in a service-area list (verified via the AEO citation
 * analysis 2026-05-12 — Cloud Concrete Seattle wins head queries this
 * way).
 *
 * Route: /concrete-contractor/:slug (e.g. /concrete-contractor/west-seattle).
 */

export interface Neighborhood {
  slug: string;
  name: string; // "West Seattle"
  h1: string; // displayed at top of page
  metaTitle: string;
  metaDescription: string;
  localContext: string; // 2-3 sentences on what makes this neighborhood's concrete needs distinctive
  commonProjects: string[]; // 3-5 specific project types Chris sees here
  freezeThaw: string; // micro-climate / weather sentence specific to this area
  faqs: { question: string; answer: string }[]; // 3-4 neighborhood-specific FAQs
  // Geo for the page's LocalBusiness areaServed override (helps voice search)
  approximateLat: number;
  approximateLng: number;
  // Image used in the hero; fall back to a generic one if missing
  heroImage: string;
}

export const NEIGHBORHOODS: Neighborhood[] = [
  {
    slug: "west-seattle",
    name: "West Seattle",
    h1: "West Seattle Concrete Contractor",
    metaTitle: "West Seattle Concrete Contractor | Driveways, Patios, Repair | Portal",
    metaDescription:
      "Concrete contractor based in West Seattle. Driveways, patios, retaining walls, foundations, and concrete repair across Admiral, Alki, Delridge, Highland Park, and surrounding neighborhoods. Licensed, bonded, 100+ five-star reviews.",
    localContext:
      "West Seattle is Portal's home turf. Sloped lots, Craftsman-era foundations, and the long wet-dry cycle of our microclimate create concrete needs that are different from flatter parts of the city. Most of our work is within a 10-minute drive of the Junction, so we know the soils, the drainage, and the permit nuances here better than anyone.",
    commonProjects: [
      "Driveway replacements on sloped lots — common in Admiral and North Admiral",
      "Retaining walls for view properties along the ridge",
      "Foundation repair and crack sealing on pre-1950 homes in Genesee, Gatewood, and Highland Park",
      "Stamped concrete patios with covered structures (rain-friendly outdoor living)",
      "Front-walk and entry-stair replacements on Craftsman homes",
    ],
    freezeThaw:
      "West Seattle's wet winters and the salt air off Puget Sound accelerate surface wear on older concrete. We use polymer-modified Ardex patching and color-stain sealers that hold up to the freeze-thaw cycles you see in Hillcrest, Gatewood, and along the ridge.",
    faqs: [
      {
        question: "Do you handle the steep driveways that are common in West Seattle?",
        answer:
          "Yes. Sloped driveways are most of what we pour west of the bridge. We grade, set proper drainage for the rain, and use brush or broom finishes that stay grippy in wet weather. We've poured driveways on slopes from 5% to 18% across Admiral, North Admiral, Genesee, and Gatewood.",
      },
      {
        question: "Can you do retaining walls on a hillside lot?",
        answer:
          "Yes. Most ridge-line and view-lot homes need at least one retaining wall. We handle structural concrete walls up to height limits that don't require an engineering stamp. Above 4 feet usually does need engineering, and we coordinate with structural engineers we've worked with in West Seattle before.",
      },
      {
        question: "How long does a driveway replacement take in West Seattle?",
        answer:
          "Most residential driveway projects are 3 to 5 working days on site. Demo of the old slab takes a day, base prep and forms another day, pour in a half-day if weather cooperates, and then 24 hours before you can walk on it and 7 days before vehicles. We work year-round, including through Seattle's wet season.",
      },
      {
        question: "Do you need a permit for concrete work in West Seattle?",
        answer:
          "Most residential driveway, patio, and walkway work in Seattle does not require a permit. Retaining walls over 4 feet usually do. Foundation repair scope varies. We'll tell you up front during the estimate whether your project needs SDCI involvement and coordinate the paperwork.",
      },
    ],
    approximateLat: 47.5712,
    approximateLng: -122.3854,
    heroImage: "/images/driveways/driveway_4_big_house.jpeg",
  },
  {
    slug: "ballard",
    name: "Ballard",
    h1: "Ballard Concrete Contractor",
    metaTitle: "Ballard Concrete Contractor | Patios, Driveways, ADU Pads | Portal",
    metaDescription:
      "Concrete contractor serving Ballard, Sunset Hill, and Loyal Heights. Backyard patios, ADU foundations, alley driveways, and stamped finishes. Licensed, bonded, 100+ five-star reviews across Seattle.",
    localContext:
      "Ballard's older lots, narrow alleys, and tight backyard setbacks create concrete work that's different from the rest of Seattle. Many homes are pre-WWII Scandinavian craftsman, and the rise in detached ADUs has driven a lot of new patio and slab work in the last few years.",
    commonProjects: [
      "ADU and DADU foundations, garage slabs, and access pads",
      "Backyard patios with stamped or exposed-aggregate finishes",
      "Alley-access driveways that need narrow forms and tight pours",
      "Front-stoop replacements on craftsman homes along NW 65th and Market",
      "Garden-wall and raised-planter concrete work for landscaped yards",
    ],
    freezeThaw:
      "Ballard sits close enough to Puget Sound that hard freezes are rare, but the constant wet-dry of fall and spring is hard on uncovered surfaces. We use proper joint spacing and surface sealers so patios and walkways don't spall after their first wet winter.",
    faqs: [
      {
        question: "Can you pour an ADU foundation in a tight Ballard backyard?",
        answer:
          "Yes, regularly. Access is the hardest part — we use wheelbarrow and pump-truck setups depending on what the lot allows. We've poured ADU slabs and foundations on lots where the only access is a 3-foot side gate.",
      },
      {
        question: "Do you do stamped patios in Ballard?",
        answer:
          "Yes. Stamped and decorative concrete is popular for Ballard backyards because the older bungalows have tight outdoor spaces where the finish matters. We do broom, smooth trowel, exposed aggregate, and stamped patterns. We'll bring samples to the estimate.",
      },
      {
        question: "How do you handle alley-access driveway pours?",
        answer:
          "Alley pours are common in Ballard. We use narrower forms, often pump the concrete in from the alley, and pay extra attention to the transition from the alley pavement to the new slab so it doesn't develop a step or a crack later.",
      },
    ],
    approximateLat: 47.6685,
    approximateLng: -122.3838,
    heroImage: "/images/patios/patio_3_fountain.jpeg",
  },
  {
    slug: "capitol-hill",
    name: "Capitol Hill",
    h1: "Capitol Hill Concrete Contractor",
    metaTitle: "Capitol Hill Concrete Contractor | Stairs, Patios, Repair | Portal",
    metaDescription:
      "Concrete contractor serving Capitol Hill, Madison Park, and Madrona. Stoop and stair replacement, courtyard patios, foundation and crack repair on Victorian-era homes. Licensed, bonded, 100+ five-star reviews.",
    localContext:
      "Capitol Hill homes skew older and denser than most of Seattle. Many were built before WWII, so foundations have decades of settling, stoops and stairs have weathered through countless wet winters, and lot sizes mean most concrete work happens within tight setbacks and limited access.",
    commonProjects: [
      "Entry-stair and stoop replacement on Victorian and craftsman homes",
      "Courtyard and side-yard patios for the tightly-spaced lots",
      "Foundation crack repair and resealing for homes built pre-1940",
      "Front-walk replacements with decorative finishes",
      "Garden steps and retaining walls on the slope down to Madison Park",
    ],
    freezeThaw:
      "Capitol Hill's older concrete is the most cosmetically worn we see anywhere in Seattle. Many surfaces are 50+ years old, with deep map cracking and chunking at the edges. Ardex polymer-modified patching and color-stain sealer let us recondition surfaces that are still structurally sound rather than tearing them out.",
    faqs: [
      {
        question: "My stoop is cracked and chipping. Replace or repair?",
        answer:
          "Depends on whether the underlying structure is sound. If the cracks are surface-deep and the slab isn't moving, our reconditioning process (Ardex patching plus a broom-finish overlay and color stain) restores the look for a fraction of replacement cost. If the slab is settling or has structural cracks, replacement is the right call. We'll be straight with you at the estimate.",
      },
      {
        question: "Do you handle pre-1940 foundation repair?",
        answer:
          "Yes. Crack sealing, partial reinforcement, and settling fixes are common on Capitol Hill. We coordinate with structural engineers when scope requires it. Full underpinning is a specialty job we'd refer to a partner; everything short of that we handle in-house.",
      },
      {
        question: "How do you access tight Capitol Hill yards?",
        answer:
          "Most of our pours on the Hill are pumped from the street through a hose to the back. The truck stays out front, the pump operator manages the line, and our crew handles placement in the yard. We've done pours behind houses where the only access was a 30-inch gate.",
      },
    ],
    approximateLat: 47.6253,
    approximateLng: -122.3222,
    heroImage: "/images/before-after/after-stairs2.jpeg",
  },
  {
    slug: "queen-anne",
    name: "Queen Anne",
    h1: "Queen Anne Concrete Contractor",
    metaTitle: "Queen Anne Concrete Contractor | View Lots, Walls, Patios | Portal",
    metaDescription:
      "Concrete contractor serving Queen Anne, Magnolia, and Interbay. Retaining walls for view properties, hillside driveways, stamped patios, and foundation work. Licensed, bonded, 100+ five-star reviews.",
    localContext:
      "Queen Anne's hills mean concrete work here is rarely flat. Most of the projects we do are hillside-related: retaining walls to carve out usable yard space, driveways with significant slope, and view-property patios where the finish quality has to match the architecture.",
    commonProjects: [
      "Retaining walls for view properties on the upper slopes",
      "Sloped driveway replacements and extensions",
      "View-deck and rooftop-style patios with high-end finishes",
      "Foundation drainage work for hillside homes",
      "Stair replacements on the iconic Queen Anne home types",
    ],
    freezeThaw:
      "Queen Anne's elevation means cooler temperatures and a slightly longer freeze-thaw season than lower-lying neighborhoods. We pour with appropriate air-entrainment and use cold-weather blankets when needed so surfaces cure properly even in February.",
    faqs: [
      {
        question: "Will a retaining wall on Queen Anne need engineering?",
        answer:
          "Most walls over 4 feet tall do, per Seattle code. We coordinate with engineers on bigger jobs and handle the permit submission. Walls under 4 feet usually we can build without engineering, depending on soil and what's behind them.",
      },
      {
        question: "Can you match the architecture on a high-end Queen Anne project?",
        answer:
          "Yes. Most of our Queen Anne clients want the concrete to disappear into the design — exposed aggregate that matches the landscape stone, stamped patterns that complement the house, or smooth trowel finishes for modern remodels. We bring samples to the estimate and walk through finish options in detail.",
      },
      {
        question: "How do you handle pours on a steep driveway?",
        answer:
          "Slopes above 10% need careful forming, proper grading, and a finish that stays grippy in wet weather. We've poured Queen Anne driveways at slopes up to 20% and detail the surface — usually with a heavy broom finish — so it's safe in our wet climate.",
      },
    ],
    approximateLat: 47.6362,
    approximateLng: -122.3568,
    heroImage: "/images/walls/walls_7_retaining_wall.jpeg",
  },
  {
    slug: "magnolia",
    name: "Magnolia",
    h1: "Magnolia Concrete Contractor",
    metaTitle: "Magnolia Concrete Contractor | Foundations, Driveways, Walls | Portal",
    metaDescription:
      "Concrete contractor serving Magnolia and Discovery Park area. Foundation repair on older homes, hillside driveways, retaining walls, and patios. Licensed, bonded, 100+ five-star reviews across Seattle.",
    localContext:
      "Magnolia's mix of older homes and post-WWII bungalows means a lot of the concrete work here is foundation-adjacent: repair, crack sealing, drainage improvements, and slab replacements for settled garages. Lot sizes are generous compared to Ballard or Capitol Hill, which gives us more room to work.",
    commonProjects: [
      "Foundation crack repair and reinforcement on pre-1960 homes",
      "Garage slab replacement on settled or cracked floors",
      "Long driveway and walkway pours on Magnolia's larger lots",
      "Retaining walls along the slopes near Discovery Park",
      "Stamped patios with mature-landscape integration",
    ],
    freezeThaw:
      "Magnolia is mostly flat compared to Queen Anne, but the proximity to Puget Sound means salt-laden air. We seal exterior concrete heavily here so surfaces don't pit or scale after a few wet seasons.",
    faqs: [
      {
        question: "Our 1955 home has a settling foundation. Can you help?",
        answer:
          "Yes. Foundation settling is one of the most common things we see in older Magnolia homes. Repair scope ranges from crack sealing and drainage improvements to partial reinforcement. We'll walk the perimeter with you at the estimate and tell you what we think is going on before quoting anything.",
      },
      {
        question: "Do you do long driveways on Magnolia's larger lots?",
        answer:
          "Yes. Magnolia has some of the longest residential driveways we pour in Seattle, often 80 feet or more from the street to the garage. We handle these as straight production pours, with joints placed every 10-12 feet to control cracking.",
      },
      {
        question: "Can you do garage slab replacement?",
        answer:
          "Yes. Garage slabs are usually 3-5 working days: demo the old slab and haul it out day one, set base and forms day two, pour day three. We handle any drainage updates the existing slab didn't have.",
      },
    ],
    approximateLat: 47.6437,
    approximateLng: -122.3993,
    heroImage: "/images/walls/walls_2_base.jpeg",
  },
  {
    slug: "green-lake",
    name: "Green Lake",
    h1: "Green Lake Concrete Contractor",
    metaTitle: "Green Lake Concrete Contractor | Walkways, Patios, Stairs | Portal",
    metaDescription:
      "Concrete contractor serving Green Lake, Wallingford, Tangletown, and Wedgwood. Walkway and stair upgrades on pre-WWII bungalows, smaller-footprint patios, and decorative finishes. Licensed, bonded, 100+ five-star reviews.",
    localContext:
      "Green Lake and the surrounding bungalow neighborhoods have some of the smallest typical project footprints in Seattle. Many of our jobs here are walkways, stoops, and modest backyard patios for craftsman and Tudor bungalows from the 1920s-1940s. The lots are tight but the work is precise.",
    commonProjects: [
      "Front walkway replacement on bungalow lots",
      "Stoop and entry stair refresh with broom or stamped finishes",
      "Smaller-footprint backyard patios (often 150-300 sq ft)",
      "Side-yard walkways connecting front and back",
      "Decorative concrete pour-overs for old, structurally sound surfaces",
    ],
    freezeThaw:
      "Green Lake sees plenty of wet winters but rarely deep freezes. Our biggest concern here is surface wear from age — most of the original concrete is 70-100 years old. We're often deciding whether to recondition vs replace based on what the homeowner wants to spend.",
    faqs: [
      {
        question: "Our front walkway is from the 1920s. Replace or refinish?",
        answer:
          "Both are valid options. If the slab is structurally sound — not heaving, no major cracks — reconditioning gives you a fresh look at maybe 60% of replacement cost. If the slab has settled, has open cracks, or roots have lifted it, replacement is the better call. We'll show you the trade-off at the estimate.",
      },
      {
        question: "How small a patio will you take on?",
        answer:
          "We've poured patios as small as 80 sq ft. Smaller projects get priced per-job rather than per-square-foot because the setup time dominates. We're happy to do them — they're often the most fun designs.",
      },
      {
        question: "Can you match concrete to an existing 1920s walkway?",
        answer:
          "Closely, yes. Old concrete has a distinct color and texture from age. We can match the finish with a color stain after the new pour cures, so adjoining slabs read as one continuous surface.",
      },
    ],
    approximateLat: 47.6817,
    approximateLng: -122.3329,
    heroImage: "/images/walkways-stairs/walkways_stairs_1_blue_house.jpeg",
  },
];
