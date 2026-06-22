import SEO from "../components/SEO";

const SEO_DATA = {
  title: "Terms & Conditions | Portal Seattle Concrete",
  description:
    "Terms and conditions for Portal LLC d/b/a Portal Seattle Concrete — residential concrete work in the Seattle area.",
  canonical: "https://buildwithportal.com/terms/",
};

const CLAUSES: { h: string; p: string }[] = [
  { h: "1. Proposal validity", p: "This proposal is valid until the Expiration Date shown on it. Acceptance (your signature or online approval) plus the deposit forms our agreement." },
  { h: "2. Pricing & sales tax", p: "Prices are as listed in the proposal. Washington state sales tax is added to the final invoice at the prevailing rate. The quote assumes normal access and the site conditions described." },
  { h: "3. Deposit & payment", p: "A deposit of 50% is due to reserve a spot on the schedule. Once your job is scheduled, the deposit covers mobilization and is non-refundable. The balance is due upon substantial completion. Balances unpaid after 15 days accrue 1.5% per month. Portal reserves its lien rights under RCW 60.04." },
  { h: "4. Scope & exclusions", p: "Work is limited to what the proposal describes. Unless explicitly included, the price excludes: permits, landscaping or restoration outside the marked work area, and repair of private utilities not marked by the Owner." },
  { h: "5. Permits", p: "The Owner pulls and pays for any required permits unless the proposal says Portal will." },
  { h: "6. Utility locates", p: "Portal calls 811 to locate public utilities. The Owner is responsible for marking private lines (irrigation, low-voltage, landscape lighting, private water/power, etc.). Portal is not responsible for damage to private lines that were not marked." },
  { h: "7. Unforeseen site conditions", p: "If hidden conditions are encountered during the work — buried debris, poor or unstable soil, undocumented utilities, contamination, groundwater, etc. — work pauses and a written Change Order is required before continuing. Pricing and schedule may change." },
  { h: "8. Concrete cracking", p: "Concrete naturally cracks. Portal uses control joints, proper sub-base prep, and standard practices to manage it, but hairline, temperature, and settlement cracking is normal, expected, and not a defect." },
  { h: "9. Workmanship warranty", p: "Portal warrants its workmanship for 1 year from substantial completion. This does not cover normal cracking (see #8), damage from misuse or neglect, Owner-caused or site conditions, additions or loads beyond design, or acts of nature." },
  { h: "10. Insurance & licensing", p: "Portal carries general liability and workers' compensation insurance; a certificate of insurance with current limits is available on request. Portal is a registered Washington contractor (RCW 18.27)." },
  { h: "11. Weather & delays", p: "Portal may reschedule for safety or quality (e.g., temperature, rain, cure conditions). Portal is not liable for delays caused by weather, supply-chain, or government action." },
  { h: "12. Changes", p: "Any change to scope or price must be in a written Change Order signed by both parties before that work proceeds." },
  { h: "13. Dispute resolution & governing law", p: "If a dispute arises, both sides will try in good faith to resolve it, then mediate in King County, Washington before going to court. Washington law governs; venue is King County." },
  { h: "14. Limitation of liability", p: "Portal's total liability is limited to the contract amount. Portal is not liable for consequential or incidental damages." },
  { h: "15. Entire agreement", p: "The signed proposal and these terms are the complete agreement and replace any prior discussions or quotes." },
];

export default function Terms() {
  return (
    <>
      <SEO seo={SEO_DATA} />
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-bold text-gray-900">Terms &amp; Conditions</h1>
        <p className="mt-2 text-lg text-gray-600">Portal LLC d/b/a Portal Seattle Concrete</p>
        <p className="mt-5 text-gray-700">
          These terms are part of the proposal you accepted. By accepting the proposal and paying the deposit, you agree to them.
        </p>

        <div className="mt-8 space-y-6">
          {CLAUSES.map((c) => (
            <section key={c.h}>
              <h2 className="text-base font-semibold text-gray-900">{c.h}</h2>
              <p className="mt-1 leading-relaxed text-gray-700">{c.p}</p>
            </section>
          ))}
        </div>

        <div className="mt-10 border-t border-gray-200 pt-6 text-sm text-gray-700">
          <p>
            <span className="font-semibold">Parties.</span> This agreement is between Portal LLC d/b/a Portal Seattle Concrete and the Customer named on the proposal.
          </p>
          <p className="mt-2">
            <span className="font-semibold">Authorized signature:</span> John Christopher Hildebrand, Owner, Portal LLC.
          </p>
          <p className="mt-4 text-xs text-gray-400">
            Standard-practice template; not legal advice.
          </p>
        </div>
      </div>
    </>
  );
}
