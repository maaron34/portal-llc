import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import SEO from "../components/SEO";
import { PAGE_SEO } from "../data/seo";
import { BUSINESS } from "../data/content";

export default function About() {
  return (
    <>
      <SEO seo={PAGE_SEO.about} />

      {/* Hero */}
      <section className="pt-28 pb-16 sm:pt-36 sm:pb-20 bg-portal-cream">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-portal-dark mb-4">
            About Portal
          </h1>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">
            <div className="lg:col-span-3 space-y-6 text-portal-gray leading-relaxed text-lg">
              <p>
                Portal LLC is a residential concrete contractor based in West
                Seattle. We specialize in driveways, patios, walkways, stairs,
                and retaining walls for homeowners throughout Seattle.
              </p>
              <p>
                The short version: We show up when we say we will, we do quality
                work, and we don't disappear when something needs fixing.
              </p>
              <p>
                The company was founded by {BUSINESS.founder}, who has been
                working in the construction industry for over{" "}
                {BUSINESS.founderYearsExperience} years. What started as a small
                operation has grown through word-of-mouth and repeat customers.
              </p>
              <p>
                We're not the biggest concrete company in Seattle, and we're fine
                with that. We do residential work - your driveway, your backyard
                patio, your front steps. We're not bidding on highway projects.
              </p>
              <p>
                Our crew is small, which means Chris visits every job site.
                You're not handing your project off to a random subcontractor.
              </p>
            </div>

            <div className="lg:col-span-2">
              <img
                src="/images/team/team_1_rainbow_warrior.jpeg"
                alt="Portal LLC team at work"
                className="w-full rounded-xl mb-6"
              />
              <div className="bg-portal-cream rounded-xl p-6">
                <h3 className="font-bold text-portal-dark mb-3">
                  Licensed, Bonded, Insured
                </h3>
                <p className="text-sm text-portal-mid">
                  Washington State Contractor License: {BUSINESS.license}
                </p>
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
                "/images/team/wix_team_pushing.jpeg",
              ].map((img, idx) => (
                <div
                  key={idx}
                  className="aspect-[4/3] rounded-xl overflow-hidden"
                >
                  <img
                    src={img}
                    alt={`Portal LLC crew at work ${idx + 1}`}
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
