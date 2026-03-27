import type { PageSEO } from "./seo";

export interface LandingPageData {
  slug: string;
  headline: string;
  subheadline: string;
  heroImage: string;
  galleryTitle: string;
  defaultProjectType: string;
  trustBadges: string[];
  reviews: { text: string; author: string }[];
  galleryImages: string[];
  seo: PageSEO;
}

export const LANDING_PAGES: Record<string, LandingPageData> = {
  driveways: {
    slug: "driveways",
    headline: "Seattle's Most Trusted Driveway\u00A0Contractor",
    subheadline:
      "New concrete driveways built right, start to finish.\nSame crew, owner on site, every time.",
    heroImage: "/images/driveways/driveway_4_big_house.jpeg",
    galleryTitle: "Recent Driveway Work",
    defaultProjectType: "driveway",
    trustBadges: [
      "100+ Five-Star Reviews",
      "Licensed & Insured",
      "35+ Years Experience",
      "Free Estimates",
    ],
    reviews: [
      {
        text: "Chris was great to work with. Responsive, showed up on time, and delivered exactly what he promised. Our new driveway looks fantastic.",
        author: "Mike L.",
      },
      {
        text: "We got quotes from several contractors and Portal was the most professional by far. Fair price, great communication, beautiful finished product.",
        author: "Sarah K.",
      },
      {
        text: "We had a great experience with Portal. They poured our new concrete driveway within a few days. Highly recommend!",
        author: "Elizabeth F.",
      },
      {
        text: "Complete professional throughout. Excellent results for an extremely challenging project -- 70-yard long driveway on a slope with a curve.",
        author: "Jennifer C.",
      },
      {
        text: "Hired Chris to recoat my aged driveway. Unlike many contractors, Chris specializes in concrete only and it shows. The 30-year-old driveway looks like new!",
        author: "Armand W.",
      },
      {
        text: "We had a wonderful experience. They poured our new concrete driveway and installed our new curb cut within a few days. Highly recommend!",
        author: "Elizabeth F.",
      },
    ],
    galleryImages: [
      "/images/driveways/driveway_4_big_house.jpeg",
      "/images/driveways/driveway_1_grey_garage.jpeg",
      "/images/driveways/driveway_5_modern_garage.jpeg",
      "/images/driveways/driveway_3_white_garage.jpeg",
    ],
    seo: {
      title:
        "Seattle Driveway Replacement - Free Estimate | Portal LLC",
      description:
        "New concrete driveways for Seattle homes. Owner on every job site, 100+ five-star reviews, free estimates. Call (206) 829-6396.",
      canonical: "https://buildwithportal.com/lp/driveways",
    },
  },
  patios: {
    slug: "patios",
    headline: "Seattle's Most Trusted Patio\u00A0Contractor",
    subheadline:
      "Extend your living space outdoors. Custom patios poured to last, with the finish options you want.",
    heroImage: "/images/patios/patio_3_fountain.jpeg",
    galleryTitle: "Recent Patio Work",
    defaultProjectType: "patio",
    trustBadges: [
      "100+ Five-Star Reviews",
      "Licensed & Insured",
      "35+ Years Experience",
      "Free Estimates",
    ],
    reviews: [
      {
        text: "Chris really knows his stuff. He walked us through the whole process and helped us choose the right finish for our patio. Highly recommend.",
        author: "Linda M.",
      },
      {
        text: "Portal did a great job in both designing and executing my patio and walkway. They deserve a 5-star rating.",
        author: "Donna B.",
      },
      {
        text: "Chris and his team poured a patio for us and we couldn't be happier. They were so fast and efficient.",
        author: "Joel O.",
      },
      {
        text: "We hired Portal to demo our old patio and construct a new larger one. Chris was responsive to our needs. The end result was a beautiful patio.",
        author: "Dave T.",
      },
      {
        text: "We hired Portal to build a slab on grade patio in our backyard. The end product is fantastic and Chris was great throughout the whole process.",
        author: "Steven T.",
      },
      {
        text: "We're so happy with our new walkway and patio. Chris and the Portal team were professional, easy to communicate with and got the work done in a timely manner.",
        author: "Terri G.",
      },
    ],
    galleryImages: [
      "/images/patios/patio_3_fountain.jpeg",
      "/images/patios/patio_1_bw_chairs.jpeg",
      "/images/patios/patio_7_overhang.jpeg",
      "/images/stamped/stamped_decorative_2_rainy.jpeg",
    ],
    seo: {
      title: "Seattle Concrete Patios - Free Estimate | Portal LLC",
      description:
        "Custom concrete patios for Seattle homes. Broom finish, exposed aggregate, stamped options. Owner on every job, 100+ five-star reviews. Call (206) 829-6396.",
      canonical: "https://buildwithportal.com/lp/patios",
    },
  },
  stairs: {
    slug: "stairs",
    headline: "Seattle's Most Trusted Stairs & Walkway\u00A0Contractor",
    subheadline:
      "Crumbling stairs are a safety hazard. We replace and repair walkways and stairs across Seattle.",
    heroImage: "/images/walkways-stairs/walkways_stairs_1_blue_house.jpeg",
    galleryTitle: "Recent Stairs & Walkway Work",
    defaultProjectType: "walkway-stairs",
    trustBadges: [
      "100+ Five-Star Reviews",
      "Licensed & Insured",
      "35+ Years Experience",
      "Free Estimates",
    ],
    reviews: [
      {
        text: "Chris and his guys were stellar. On time, kind and courteous, with competitive pricing. The stairway wall repair and step refinishing were done very well.",
        author: "Matt C.",
      },
      {
        text: "Had our front walkway and stairs replaced. The crew was efficient, cleaned up after themselves, and the result exceeded our expectations.",
        author: "James R.",
      },
      {
        text: "Portal just finished a new sidewalk and stairs for me. It all looks great! Chris was professional, friendly, and reliable.",
        author: "T. Adams",
      },
      {
        text: "Portal rescued us from a botched concrete pour job and left gleaming new stairs in place of their crumbly old predecessors. Highly recommend!",
        author: "Chinmay B.",
      },
      {
        text: "Chris' team did several projects for us. Demoed our concrete stairs and rebuilt new ones, skimmed the walkway. Excellent and professional.",
        author: "Mark.",
      },
      {
        text: "Portal built a walkway in our garden and shored up some poorly constructed stairs. They provided helpful advice and came up with a more economical option.",
        author: "Aimee K.",
      },
    ],
    galleryImages: [
      "/images/walkways-stairs/walkways_stairs_1_blue_house.jpeg",
      "/images/walkways-stairs/wix_pretty_stairs.jpeg",
      "/images/walkways-stairs/wix_more_pretty_stairs.jpeg",
      "/images/before-after/after-stairs2.jpeg",
    ],
    seo: {
      title:
        "Seattle Concrete Stairs & Walkway Repair - Free Estimate | Portal LLC",
      description:
        "Concrete stair replacement and walkway repair in Seattle. Fix crumbling steps before they become a hazard. 100+ five-star reviews. Call (206) 829-6396.",
      canonical: "https://buildwithportal.com/lp/stairs",
    },
  },
  estimate: {
    slug: "estimate",
    headline: "Seattle's Most Trusted Concrete\u00A0Contractor",
    subheadline:
      "Tell us about your project and we will call you back within a couple hours. No pressure, no obligation.",
    heroImage: "/images/team/team_3_job_site.jpeg",
    galleryTitle: "Recent Work",
    defaultProjectType: "",
    trustBadges: [
      "100+ Five-Star Reviews",
      "Licensed & Insured",
      "35+ Years Experience",
      "Year-Round Service",
    ],
    reviews: [
      {
        text: "The professionalism and quality of work were top notch!",
        author: "Raam W.",
      },
      {
        text: "Consistent quality and a crew that actually cares about doing things right.",
        author: "Karen P.",
      },
      {
        text: "Very communicative and trustworthy concrete contractor! Fair pricing and fast results!",
        author: "Tim E.",
      },
      {
        text: "Chris and his crew were stellar. On time, kind and courteous, with competitive pricing.",
        author: "Matt C.",
      },
      {
        text: "Second time using Portal and they delivered again. Consistent quality and a crew that actually cares.",
        author: "Karen P.",
      },
      {
        text: "Portal was the most professional by far. Fair price, great communication, beautiful finished product.",
        author: "Sarah K.",
      },
    ],
    galleryImages: [
      "/images/driveways/driveway_4_big_house.jpeg",
      "/images/patios/patio_3_fountain.jpeg",
      "/images/walkways-stairs/wix_pretty_stairs.jpeg",
      "/images/walls/walls_7_retaining_wall.jpeg",
    ],
    seo: {
      title: "Free Concrete Estimate Seattle | Portal LLC",
      description:
        "Get a free concrete estimate from Portal LLC. Driveways, patios, stairs, retaining walls, foundations. 100+ five-star reviews. Call (206) 829-6396.",
      canonical: "https://buildwithportal.com/lp/estimate",
    },
  },
};
