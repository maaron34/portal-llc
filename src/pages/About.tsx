import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import SEO from "../components/SEO";
import { PAGE_SEO, generateLocalBusinessSchema } from "../data/seo";
import { BUSINESS } from "../data/content";

// About-page-specific schemas. The LocalBusiness already nests Chris as
// `founder`, but extracting Person as a standalone schema with its own
// @id gives /about/ a distinct structured-data fingerprint vs the
// homepage — addresses the "Duplicate, Google chose different canonical"
// GSC report on this URL.
const PERSON_CHRIS = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": "https://buildwithportal.com/about/#chris-hildebrand",
  name: BUSINESS.founder,
  jobTitle: "Owner & Lead Contractor",
  description: `${BUSINESS.founderYearsExperience}+ years of construction experience. Founded Portal in 2020 after decades on Seattle-area job sites.`,
  knowsAbout: [
    "Residential concrete",
    "Driveways",
    "Retaining walls",
    "Foundation repair",
    "Stamped concrete",
    "Seattle hillside drainage",
  ],
  worksFor: {
    "@type": "Organization",
    "@id": BUSINESS.url,
    name: BUSINESS.name,
  },
  homeLocation: {
    "@type": "Place",
    name: "West Seattle, WA",
  },
};

const BREADCRUMBS = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: BUSINESS.url + "/",
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "About",
      item: BUSINESS.url + "/about/",
    },
  ],
};

const ABOUT_PAGE = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "@id": "https://buildwithportal.com/about/#aboutpage",
  url: "https://buildwithportal.com/about/",
  name: "About Portal",
  description: PAGE_SEO.about.description,
  mainEntity: { "@id": "https://buildwithportal.com/about/#chris-hildebrand" },
  isPartOf: { "@id": BUSINESS.url },
};

export default function About() {
  return (
    <>
      <SEO
        seo={PAGE_SEO.about}
        schema={[
          generateLocalBusinessSchema(),
          PERSON_CHRIS,
          ABOUT_PAGE,
          BREADCRUMBS,
        ]}
      />

      {/* Hero */}
      <section className="relative pt-20">
        <div className="aspect-[3/1] sm:aspect-[4/1] relative overflow-hidden">
          <img
            src="/images/other/wix_skate_ramp.jpeg"
            alt="Custom concrete skate ramp by Portal"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-portal-dark/50" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg">
              <img
                src="/images/brand/portal-logo-new.jpeg"
                alt="Portal"
                className="h-16 sm:h-24 lg:h-32 w-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-portal-dark mb-4">
            About Portal
          </h1>
          <p className="text-portal-mid text-lg mb-12">
            Seattle residential concrete contractor. Family operation,
            owner on every job, year-round work.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">
            <div className="lg:col-span-3 space-y-6 text-portal-gray leading-relaxed text-lg">
              <p>
                Portal is a residential concrete contractor based in West
                Seattle. We specialize in driveways, patios, walkways, stairs,
                and retaining walls for homeowners across Seattle. We pour
                year-round, rain or shine, which is unusual for this market —
                most Seattle concrete contractors stop in November and don't
                restart until April.
              </p>
              <p>
                The short version: we show up when we say we will, we do
                quality work, and we don't disappear when something needs
                fixing.
              </p>

              <h2 className="text-2xl font-bold text-portal-dark pt-4">
                The founder
              </h2>
              <p>
                Portal was founded by {BUSINESS.founder}, who has been on
                construction job sites for over {BUSINESS.founderYearsExperience}{" "}
                years. He started in framing and finish carpentry in his
                early twenties, moved into project management on larger
                residential builds, and started Portal in 2020 to focus on
                concrete specifically — the part of every project he kept
                seeing done poorly by crews that didn't take the time.
              </p>
              <p>
                What started as a one-truck operation has grown through
                word-of-mouth and repeat customers. The crew is still small.
                That's a choice. We'd rather take fewer jobs and finish each
                one well than chase volume and end up with a punch list we
                can't close.
              </p>

              <h2 className="text-2xl font-bold text-portal-dark pt-4">
                Seattle-specific
              </h2>
              <p>
                Concrete in Seattle isn't just concrete anywhere else. The
                soil settles. Hillside lots move with the seasons. Trees and
                roots crack slabs that were poured ten years ago without
                expansion joints in the right places. And rain — real rain,
                not Texas rain — changes when you can pour, how you cure, and
                what you do about drainage on the lot before the first form
                gets set.
              </p>
              <p>
                Thirty-five years on Seattle and Western Washington job sites
                means we know which neighborhoods have settling problems
                (most of West Seattle, parts of Magnolia and Queen Anne),
                which hillsides need real drainage solutions before you pour
                a retaining wall (Capitol Hill, Mt. Baker, anything sloping
                toward Puget Sound), and what the freeze-thaw cycle does to
                a five-year-old driveway that wasn't sealed properly. We
                build for what Seattle actually does, not what a generic
                contractor's spec sheet says.
              </p>

              <h2 className="text-2xl font-bold text-portal-dark pt-4">
                How we work
              </h2>
              <p>
                Every estimate is free and on-site — there's no way to
                accurately price residential concrete without seeing the lot,
                the access, the existing slab, and the drainage. You'll have
                a written, line-item quote within 48 hours of the visit, with
                the timeline, materials, and finished look explained in plain
                language. No "ballpark" numbers that triple when the truck
                shows up.
              </p>
              <p>
                Chris visits every job site. You're not handing your project
                off to a random subcontractor or a different crew than the
                one that gave you the estimate. The same faces show up on day
                one as on the day we hand it over.
              </p>
              <p>
                We don't bid on highway projects, parking lots, or commercial
                slabs over a certain size. We do residential — your driveway,
                your backyard patio, your front steps, the retaining wall
                keeping your yard from sliding into your neighbor's. We're
                fine being the small, careful option in a market that mostly
                isn't.
              </p>

              <h2 className="text-2xl font-bold text-portal-dark pt-4">
                What we won't do
              </h2>
              <p>
                We won't quote a number we can't honor. We won't push
                upgrades you don't need. We won't disappear after the pour
                — if something cracks unexpectedly or a joint opens up
                early, we come back and fix it. Most of our work is
                referrals from past customers; that doesn't happen if the
                last job ended badly.
              </p>
              <p>
                "Portal Seattle Concrete" is the d/b/a Portal LLC filed with
                the Washington Department of Revenue in May 2026 — same
                company, same owner, same crew, registered to put "Seattle"
                in the name where customers can see it. Some of the
                contractors ranking ahead of us on Google did the same thing
                by editing their business listing instead of filing
                paperwork; we did it the right way.
              </p>
            </div>

            <div className="lg:col-span-2">
              <img
                src="/images/team/team_1_rainbow_warrior.jpeg"
                alt="Portal team at work"
                className="w-full rounded-xl mb-6"
              />
              <div className="bg-portal-cream rounded-xl p-6">
                <h3 className="font-bold text-portal-dark mb-3">
                  Licensed, Bonded, Insured
                </h3>
                <p className="text-sm text-portal-mid">
                  Washington State Contractor License: {BUSINESS.license}
                </p>
                <p className="text-sm text-portal-mid mt-2">
                  General liability + L&amp;I bond — certificates available on
                  request.
                </p>
                <p className="text-sm text-portal-mid mt-2">
                  {BUSINESS.reviewCount}+ five-star reviews from Seattle
                  homeowners.
                </p>
              </div>
              <div className="mt-6">
                <Link
                  to="/year-round/"
                  className="block bg-amber-50 border border-amber-300 rounded-xl p-5 no-underline hover:bg-amber-100 transition-colors"
                >
                  <p className="text-portal-dark font-semibold mb-1">
                    Year-round pours
                  </p>
                  <p className="text-portal-mid text-sm">
                    How we keep pouring through Seattle's wet winters.{" "}
                    <span className="text-amber-700 font-semibold">
                      Learn how →
                    </span>
                  </p>
                </Link>
              </div>
            </div>
          </div>

          {/* Team Photos */}
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-portal-dark mb-8">
              The Crew
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                "/images/team/chris_team1.jpeg",
                "/images/team/chris_team3.jpeg",
                "/images/team/team_2_jackhammer.jpeg",
                "/images/team/team_3_job_site.jpeg",
                "/images/team/team_5_stairs.jpeg",
                "/images/team/chris_team2.jpeg",
                "/images/team/team_4_backs.jpeg",
                "/images/team/team_6_green_lines.jpeg",
                "/images/team/wix_garage_pour.jpeg",
                "/images/team/chris_team4.jpeg",
                "/images/team/wix_team_grinding.jpeg",
              ].map((img, idx) => (
                <div
                  key={idx}
                  className="aspect-[4/3] rounded-xl overflow-hidden"
                >
                  <img
                    src={img}
                    alt={`Portal crew at work ${idx + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
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
