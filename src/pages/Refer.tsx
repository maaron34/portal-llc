import { useState, type FormEvent } from "react";
import { CheckCircle2, Gift, Users } from "lucide-react";
import SEO from "../components/SEO";
import { PAGE_SEO } from "../data/seo";
import { BUSINESS } from "../data/content";

const WEB3FORMS_KEY = "97c81447-a5dc-43a2-8880-542d83c80609";

type Direction = "sending" | "received";

export default function Refer() {
  const [direction, setDirection] = useState<Direction>("sending");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const form = e.currentTarget;
    const formData = new FormData(form);

    const yourName = (formData.get("your_name") as string) || "";
    const yourPhone = (formData.get("your_phone") as string) || "";
    const yourEmail = (formData.get("your_email") as string) || "";
    const friendName = (formData.get("friend_name") as string) || "";
    const friendPhone = (formData.get("friend_phone") as string) || "";
    const projectType = (formData.get("project_type") as string) || "";
    const notes = (formData.get("notes") as string) || "";

    const subjectPrefix =
      direction === "sending"
        ? `Portal Referral (sent): ${yourName} → ${friendName}`
        : `Portal Referral (received): ${yourName} was referred by ${friendName}`;

    const messageBlock =
      direction === "sending"
        ? [
            `Referrer (gets $100 when job is paid):`,
            `  Name:  ${yourName}`,
            `  Phone: ${yourPhone}`,
            `  Email: ${yourEmail || "(not provided)"}`,
            ``,
            `Friend they're referring (gets $100 off):`,
            `  Name:  ${friendName}`,
            `  Phone: ${friendPhone || "(not provided)"}`,
            ``,
            `Project type:  ${projectType || "(not specified)"}`,
            `Notes: ${notes || "(none)"}`,
          ].join("\n")
        : [
            `New customer (gets $100 off their first job):`,
            `  Name:  ${yourName}`,
            `  Phone: ${yourPhone}`,
            `  Email: ${yourEmail || "(not provided)"}`,
            ``,
            `Referred by (gets $100 when this job is paid):`,
            `  Name:  ${friendName}`,
            `  Phone: ${friendPhone || "(not provided)"}`,
            ``,
            `Project type:  ${projectType || "(not specified)"}`,
            `Notes: ${notes || "(none)"}`,
          ].join("\n");

    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: subjectPrefix,
          from_name: "Portal LLC Website — Referral Form",
          direction,
          referrer_name: direction === "sending" ? yourName : friendName,
          referrer_phone: direction === "sending" ? yourPhone : friendPhone,
          friend_name: direction === "sending" ? friendName : yourName,
          friend_phone: direction === "sending" ? friendPhone : yourPhone,
          friend_email: direction === "received" ? yourEmail : "",
          project_type: projectType,
          notes,
          message: messageBlock,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (typeof window !== "undefined" && (window as any).gtag) {
          (window as any).gtag("event", "generate_lead", {
            event_category: "form",
            event_label: `refer_${direction}`,
          });
        }
        setSubmitted(true);
      } else {
        setError("Something went wrong. Please call or text us directly.");
      }
    } catch {
      setError("Something went wrong. Please call or text us directly.");
    } finally {
      setSubmitting(false);
    }
  };

  // Field labels swap based on direction so the form reads correctly for both audiences.
  const labels =
    direction === "sending"
      ? {
          yourSection: "Your info (you'll get the $100)",
          yourNameLabel: "Your name",
          yourPhoneLabel: "Your phone",
          yourEmailLabel: "Your email (so we can confirm payment)",
          friendSection: "Friend's info (they'll get $100 off)",
          friendNameLabel: "Friend's name",
          friendPhoneLabel: "Friend's phone",
          submitText: "Send the referral",
        }
      : {
          yourSection: "Your info (the new customer — $100 off)",
          yourNameLabel: "Your name",
          yourPhoneLabel: "Your phone",
          yourEmailLabel: "Your email",
          friendSection: "Who referred you? (they get $100)",
          friendNameLabel: "Their name",
          friendPhoneLabel: "Their phone (if you know it)",
          submitText: "Apply my $100 discount",
        };

  return (
    <>
      <SEO seo={PAGE_SEO.refer} />

      {/* Hero */}
      <section className="pt-28 pb-12 sm:pt-36 sm:pb-16 bg-portal-charcoal text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 text-portal-warm text-sm font-semibold uppercase tracking-wider mb-4">
            <Gift size={18} className="text-portal-accent" />
            Portal Referral Program
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4">
            Refer a friend.
            <br className="hidden sm:inline" /> You both get $100.
          </h1>
          <p className="text-lg sm:text-xl text-portal-warm max-w-2xl mx-auto">
            Your friend gets <strong className="text-white">$100 off</strong>{" "}
            their first Portal job. You get{" "}
            <strong className="text-white">$100</strong> when their job is
            booked. No catch. No limit.
          </p>
        </div>
      </section>

      {/* How it works strip */}
      <section className="py-10 bg-portal-cream">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-2xl font-bold text-portal-accent mb-1">1</div>
            <div className="text-sm font-semibold text-portal-dark mb-1">
              Fill out the form
            </div>
            <div className="text-xs text-portal-mid">
              Either side can submit. We connect the dots.
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-portal-accent mb-1">2</div>
            <div className="text-sm font-semibold text-portal-dark mb-1">
              Your friend's $100 off is auto-applied
            </div>
            <div className="text-xs text-portal-mid">
              We mention the discount upfront on their estimate.
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-portal-accent mb-1">3</div>
            <div className="text-sm font-semibold text-portal-dark mb-1">
              You get $100 when their job is booked
            </div>
            <div className="text-xs text-portal-mid">
              Sent within 30 days of booking. Forfeit if project cancels.
            </div>
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="py-12 sm:py-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          {submitted ? (
            <div className="bg-green-50 rounded-xl p-10 text-center">
              <CheckCircle2
                size={48}
                className="text-green-700 mx-auto mb-4"
              />
              <h2 className="text-2xl font-bold text-green-800 mb-3">
                Got it — thanks!
              </h2>
              <p className="text-green-700 mb-4">
                {direction === "sending"
                  ? `We'll reach out to your friend, mention the $100 discount, and let you know when their job is booked so we can send your $100.`
                  : `We'll add the $100 discount to your estimate. Expect a call or text from us within 24 hours.`}
              </p>
              <p className="text-green-700 text-sm">
                Questions? Call or text us at{" "}
                <a href={BUSINESS.phoneHref} className="underline font-semibold">
                  {BUSINESS.phone}
                </a>
                .
              </p>
            </div>
          ) : (
            <>
              {/* Direction toggle */}
              <div className="mb-8">
                <p className="text-sm font-semibold text-portal-dark mb-3 text-center">
                  Which side are you?
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDirection("sending")}
                    className={`flex items-center justify-center gap-3 px-5 py-4 rounded-lg border-2 font-semibold text-base cursor-pointer transition-colors ${
                      direction === "sending"
                        ? "bg-portal-accent text-white border-portal-accent"
                        : "bg-white text-portal-dark border-portal-warm hover:border-portal-accent"
                    }`}
                  >
                    <Users size={20} />
                    I'm sending a friend
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection("received")}
                    className={`flex items-center justify-center gap-3 px-5 py-4 rounded-lg border-2 font-semibold text-base cursor-pointer transition-colors ${
                      direction === "received"
                        ? "bg-portal-accent text-white border-portal-accent"
                        : "bg-white text-portal-dark border-portal-warm hover:border-portal-accent"
                    }`}
                  >
                    <Gift size={20} />
                    Someone referred me
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Your info */}
                <div className="space-y-5">
                  <h2 className="text-lg font-bold text-portal-dark border-b border-portal-warm pb-2">
                    {labels.yourSection}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-portal-dark mb-1.5">
                        {labels.yourNameLabel} *
                      </label>
                      <input
                        type="text"
                        name="your_name"
                        required
                        className="w-full px-4 py-3 rounded-lg border border-portal-warm bg-white text-portal-dark text-base focus:outline-none focus:ring-2 focus:ring-portal-accent focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-portal-dark mb-1.5">
                        {labels.yourPhoneLabel} *
                      </label>
                      <input
                        type="tel"
                        name="your_phone"
                        required
                        className="w-full px-4 py-3 rounded-lg border border-portal-warm bg-white text-portal-dark text-base focus:outline-none focus:ring-2 focus:ring-portal-accent focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-portal-dark mb-1.5">
                      {labels.yourEmailLabel}
                    </label>
                    <input
                      type="email"
                      name="your_email"
                      className="w-full px-4 py-3 rounded-lg border border-portal-warm bg-white text-portal-dark text-base focus:outline-none focus:ring-2 focus:ring-portal-accent focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Friend's info */}
                <div className="space-y-5">
                  <h2 className="text-lg font-bold text-portal-dark border-b border-portal-warm pb-2">
                    {labels.friendSection}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-portal-dark mb-1.5">
                        {labels.friendNameLabel} *
                      </label>
                      <input
                        type="text"
                        name="friend_name"
                        required
                        className="w-full px-4 py-3 rounded-lg border border-portal-warm bg-white text-portal-dark text-base focus:outline-none focus:ring-2 focus:ring-portal-accent focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-portal-dark mb-1.5">
                        {labels.friendPhoneLabel}
                      </label>
                      <input
                        type="tel"
                        name="friend_phone"
                        className="w-full px-4 py-3 rounded-lg border border-portal-warm bg-white text-portal-dark text-base focus:outline-none focus:ring-2 focus:ring-portal-accent focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Project type */}
                <div className="space-y-5">
                  <h2 className="text-lg font-bold text-portal-dark border-b border-portal-warm pb-2">
                    Project details
                  </h2>
                  <div>
                    <label className="block text-sm font-semibold text-portal-dark mb-1.5">
                      What's the project?
                    </label>
                    <select
                      name="project_type"
                      className="w-full px-4 py-3 rounded-lg border border-portal-warm bg-white text-portal-dark text-base focus:outline-none focus:ring-2 focus:ring-portal-accent focus:border-transparent"
                    >
                      <option value="">— Select —</option>
                      <option value="Driveway">Driveway (new or replacement)</option>
                      <option value="Patio">Patio</option>
                      <option value="Stairs">Stairs / steps</option>
                      <option value="Walkway">Walkway</option>
                      <option value="Retaining wall">Retaining wall</option>
                      <option value="Concrete repair">
                        Concrete repair / resurfacing
                      </option>
                      <option value="Foundation">Foundation work</option>
                      <option value="Stamped / decorative">
                        Stamped or decorative
                      </option>
                      <option value="Other">Not sure / other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-portal-dark mb-1.5">
                      Anything else we should know?
                    </label>
                    <textarea
                      name="notes"
                      rows={3}
                      placeholder="Optional — neighborhood, rough timing, project size, etc."
                      className="w-full px-4 py-3 rounded-lg border border-portal-warm bg-white text-portal-dark text-base focus:outline-none focus:ring-2 focus:ring-portal-accent focus:border-transparent placeholder:text-portal-warm resize-y"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-red-600 text-sm font-medium">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-8 py-4 bg-portal-accent text-white font-bold text-lg rounded-lg border-none cursor-pointer hover:bg-portal-accent-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? "Sending..." : labels.submitText}
                </button>

                <p className="text-xs text-portal-mid text-center leading-relaxed">
                  Applies to new Portal customers only. The friend's $100 off is applied at booking.
                  Your $100 is paid within 30 days of booking; forfeit if the project cancels before completion.
                  One discount per project.
                </p>
              </form>
            </>
          )}
        </div>
      </section>
    </>
  );
}
