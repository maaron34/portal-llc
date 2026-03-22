import { useState, type FormEvent } from "react";
import { Phone, Mail, Clock, Instagram, MapPin } from "lucide-react";
import SEO from "../components/SEO";
import { PAGE_SEO } from "../data/seo";
import { BUSINESS, SERVICE_AREAS } from "../data/content";

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    // Build mailto body
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const neighborhood = formData.get("neighborhood") as string;
    const message = formData.get("message") as string;

    const subject = encodeURIComponent(`Website Inquiry from ${name}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nNeighborhood: ${neighborhood}\n\nProject Details:\n${message}`
    );

    window.location.href = `mailto:${BUSINESS.email}?subject=${subject}&body=${body}`;
    setSubmitted(true);
  };

  return (
    <>
      <SEO seo={PAGE_SEO.contact} />

      {/* Hero */}
      <section className="pt-28 pb-16 sm:pt-36 sm:pb-20 bg-portal-cream">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-portal-dark mb-4">
            Get in Touch
          </h1>
          <p className="text-xl text-portal-mid max-w-2xl mx-auto">
            Request an estimate or ask a question. We start with a phone or video
            estimate, then follow up with an on-site visit. We typically respond
            within 24 hours and are available to start within 2 weeks.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            {/* Form */}
            <div className="lg:col-span-3">
              {submitted ? (
                <div className="bg-green-50 rounded-xl p-10 text-center">
                  <h2 className="text-2xl font-bold text-green-800 mb-3">
                    Thanks for reaching out!
                  </h2>
                  <p className="text-green-700">
                    Your email client should have opened with the message. If
                    not, please email us directly at{" "}
                    <a
                      href={`mailto:${BUSINESS.email}`}
                      className="underline"
                    >
                      {BUSINESS.email}
                    </a>{" "}
                    or call{" "}
                    <a href={BUSINESS.phoneHref} className="underline">
                      {BUSINESS.phone}
                    </a>
                    .
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-portal-dark mb-1.5">
                        Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        className="w-full px-4 py-3 rounded-lg border border-portal-warm bg-white text-portal-dark text-base focus:outline-none focus:ring-2 focus:ring-portal-accent focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-portal-dark mb-1.5">
                        Phone
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        className="w-full px-4 py-3 rounded-lg border border-portal-warm bg-white text-portal-dark text-base focus:outline-none focus:ring-2 focus:ring-portal-accent focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-portal-dark mb-1.5">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      className="w-full px-4 py-3 rounded-lg border border-portal-warm bg-white text-portal-dark text-base focus:outline-none focus:ring-2 focus:ring-portal-accent focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-portal-dark mb-1.5">
                      Address
                    </label>
                    <input
                      type="text"
                      name="neighborhood"
                      placeholder="Street address"
                      className="w-full px-4 py-3 rounded-lg border border-portal-warm bg-white text-portal-dark text-base focus:outline-none focus:ring-2 focus:ring-portal-accent focus:border-transparent placeholder:text-portal-warm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-portal-dark mb-1.5">
                      Tell us about your project *
                    </label>
                    <textarea
                      name="message"
                      required
                      rows={5}
                      placeholder="What type of concrete work do you need? Any details about the project help us give you a better estimate."
                      className="w-full px-4 py-3 rounded-lg border border-portal-warm bg-white text-portal-dark text-base focus:outline-none focus:ring-2 focus:ring-portal-accent focus:border-transparent placeholder:text-portal-warm resize-y"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-8 py-4 bg-portal-accent text-white font-bold text-lg rounded-lg border-none cursor-pointer hover:bg-portal-accent-dark transition-colors"
                  >
                    Send Message
                  </button>
                </form>
              )}
            </div>

            {/* Contact Info */}
            <div className="lg:col-span-2">
              <div className="bg-portal-cream rounded-xl p-8 space-y-6">
                <h2 className="text-xl font-bold text-portal-dark">
                  Contact Info
                </h2>
                <div className="space-y-5">
                  <a
                    href={BUSINESS.phoneHref}
                    className="flex items-center gap-3 text-portal-gray no-underline hover:text-portal-accent transition-colors"
                  >
                    <Phone size={20} className="text-portal-accent shrink-0" />
                    <div>
                      <div className="font-semibold">{BUSINESS.phone}</div>
                      <div className="text-sm text-portal-mid">
                        Call or text
                      </div>
                    </div>
                  </a>
                  <a
                    href={`mailto:${BUSINESS.email}`}
                    className="flex items-center gap-3 text-portal-gray no-underline hover:text-portal-accent transition-colors"
                  >
                    <Mail size={20} className="text-portal-accent shrink-0" />
                    <div>
                      <div className="font-semibold">{BUSINESS.email}</div>
                      <div className="text-sm text-portal-mid">
                        Email anytime
                      </div>
                    </div>
                  </a>
                  <a
                    href={BUSINESS.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-portal-gray no-underline hover:text-portal-accent transition-colors"
                  >
                    <Instagram
                      size={20}
                      className="text-portal-accent shrink-0"
                    />
                    <div>
                      <div className="font-semibold">@portal.llc</div>
                      <div className="text-sm text-portal-mid">
                        Follow our work
                      </div>
                    </div>
                  </a>
                  <div className="flex items-start gap-3 text-portal-gray">
                    <Clock
                      size={20}
                      className="text-portal-accent shrink-0 mt-0.5"
                    />
                    <div>
                      <div className="font-semibold">Hours</div>
                      <div className="text-sm text-portal-mid">
                        Mon-Fri: 7:30 AM - 5:00 PM
                        <br />
                        Saturday by appointment
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-portal-gray">
                    <MapPin
                      size={20}
                      className="text-portal-accent shrink-0 mt-0.5"
                    />
                    <div>
                      <div className="font-semibold">Service Area</div>
                      <div className="text-sm text-portal-mid">
                        All Seattle and Seattle-adjacent neighborhoods including {SERVICE_AREAS.join(", ")}, and more
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
