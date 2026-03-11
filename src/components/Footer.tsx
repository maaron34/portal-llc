import { Link } from "react-router-dom";
import { Phone, Mail, Instagram, Facebook, Clock } from "lucide-react";
import { BUSINESS, SERVICE_AREAS } from "../data/content";

export default function Footer() {
  return (
    <footer className="bg-portal-dark text-white">
      {/* Photo Strip */}
      <div className="h-48 sm:h-64 overflow-hidden">
        <img
          src="/images/other/other_1_half_pipe.jpeg"
          alt="Custom concrete half pipe"
          className="w-full h-full object-cover"
        />
      </div>

      {/* CTA Band */}
      <div className="bg-portal-accent">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Ready to start your project?
          </h2>
          <p className="text-white/90 mb-6 text-lg">
            Get a free estimate - we typically respond within 24 hours and are available to start within 2 weeks.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/contact"
              className="inline-flex px-6 py-3 bg-white text-portal-accent font-bold rounded-lg no-underline hover:bg-portal-cream transition-colors"
            >
              Request an Estimate
            </Link>
            <a
              href={BUSINESS.phoneHref}
              className="inline-flex items-center gap-2 px-6 py-3 border-2 border-white text-white font-bold rounded-lg no-underline hover:bg-white/10 transition-colors"
            >
              <Phone size={18} />
              {BUSINESS.phone}
            </a>
          </div>
        </div>
      </div>

      {/* Footer Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Company */}
          <div>
            <h3 className="text-lg font-bold mb-4">Portal LLC</h3>
            <p className="text-white/70 text-sm leading-relaxed mb-4">
              Residential and commercial concrete contractor serving West Seattle
              and the greater Seattle area. Licensed, bonded, and insured.
            </p>
            <div className="flex items-center gap-3 mb-4">
              <a
                href={BUSINESS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 text-white no-underline hover:bg-white/20 transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={20} />
              </a>
              <a
                href={BUSINESS.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 text-white no-underline hover:bg-white/20 transition-colors"
                aria-label="Facebook"
              >
                <Facebook size={20} />
              </a>
            </div>
            <p className="text-white/50 text-xs">
              WA License: {BUSINESS.license}
            </p>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-lg font-bold mb-4">Services</h3>
            <ul className="space-y-2 list-none p-0 m-0">
              {[
                { to: "/services/driveways", label: "Driveways" },
                { to: "/services/patios", label: "Patios" },
                { to: "/services/walkways-stairs", label: "Walkways & Stairs" },
                { to: "/services/retaining-walls", label: "Retaining Walls" },
                { to: "/services/foundation-work", label: "Foundations" },
                { to: "/services/reconditioning", label: "Repair & Reconditioning" },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-white/70 text-sm no-underline hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Service Areas */}
          <div>
            <h3 className="text-lg font-bold mb-4">Service Areas</h3>
            <p className="text-white/70 text-sm leading-relaxed">
              {SERVICE_AREAS.join(" · ")}
            </p>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-bold mb-4">Contact</h3>
            <ul className="space-y-3 list-none p-0 m-0">
              <li>
                <a
                  href={BUSINESS.phoneHref}
                  className="flex items-center gap-2 text-white/70 text-sm no-underline hover:text-white transition-colors"
                >
                  <Phone size={15} />
                  {BUSINESS.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${BUSINESS.email}`}
                  className="flex items-center gap-2 text-white/70 text-sm no-underline hover:text-white transition-colors"
                >
                  <Mail size={15} />
                  {BUSINESS.email}
                </a>
              </li>
              <li className="flex items-start gap-2 text-white/70 text-sm">
                <Clock size={15} className="mt-0.5 shrink-0" />
                <span>{BUSINESS.hours}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col items-center gap-4">
          <img
            src="/images/brand/swirlie-logo.png"
            alt=""
            className="h-12 w-12 opacity-40 invert animate-spin-slow"
          />
          <p className="text-white/40 text-sm">
            &copy; {new Date().getFullYear()} Portal LLC. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
