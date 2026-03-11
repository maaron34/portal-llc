import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Phone } from "lucide-react";
import { BUSINESS } from "../data/content";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/services", label: "Services" },
  { to: "/projects", label: "Projects" },
  { to: "/reviews", label: "Reviews" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white backdrop-blur-sm border-b border-portal-light">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 no-underline shrink-0">
            <img
              src="/images/brand/portal-logo.jpeg"
              alt="Portal LLC"
              className="h-10 sm:h-12 w-auto rounded"
            />
            <div className="hidden lg:block">
              <div className="text-lg font-bold text-portal-dark tracking-tight leading-tight">
                Portal LLC
              </div>
              <div className="text-xs text-portal-mid leading-tight">
                Residential & Commercial Concrete
              </div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium no-underline transition-colors whitespace-nowrap ${
                  location.pathname === link.to ||
                  (link.to !== "/" && location.pathname.startsWith(link.to))
                    ? "text-portal-accent"
                    : "text-portal-gray hover:text-portal-dark"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* CTA + Mobile Toggle */}
          <div className="flex items-center gap-3 shrink-0">
            <a
              href={BUSINESS.phoneHref}
              className="hidden sm:flex items-center gap-2 text-sm font-semibold text-portal-accent no-underline hover:text-portal-accent-dark transition-colors whitespace-nowrap"
            >
              <Phone size={16} />
              {BUSINESS.phone}
            </a>
            <Link
              to="/contact"
              className="hidden lg:inline-flex px-4 py-2 bg-portal-accent text-white text-sm font-semibold rounded-lg no-underline hover:bg-portal-accent-dark transition-colors whitespace-nowrap"
            >
              Free Estimate
            </Link>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 text-portal-gray bg-transparent border-none cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-t border-portal-light">
          <nav className="px-4 py-4 space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`block py-3 px-3 rounded-lg text-base font-medium no-underline transition-colors ${
                  location.pathname === link.to
                    ? "bg-portal-cream text-portal-accent"
                    : "text-portal-gray hover:bg-portal-cream"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <a
              href={BUSINESS.phoneHref}
              className="flex items-center gap-2 py-3 px-3 text-base font-semibold text-portal-accent no-underline"
            >
              <Phone size={18} />
              {BUSINESS.phone}
            </a>
            <Link
              to="/contact"
              onClick={() => setMobileOpen(false)}
              className="block text-center py-3 px-3 bg-portal-accent text-white font-semibold rounded-lg no-underline mt-2"
            >
              Get a Free Estimate
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
