import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Services from "./pages/Services";
import ServiceDetail from "./pages/ServiceDetail";
import Projects from "./pages/Projects";
import About from "./pages/About";
import Reviews from "./pages/Reviews";
import Contact from "./pages/Contact";
import Refer from "./pages/Refer";
import YearRound from "./pages/YearRound";
import LandingPage from "./pages/LandingPage";
import NeighborhoodPage from "./pages/NeighborhoodPage";

function scrollToHashOrTop(hash: string | null) {
  if (hash) {
    const el = document.querySelector(hash);
    if (el) {
      el.scrollIntoView({ behavior: "instant" as ScrollBehavior, block: "start" });
      return;
    }
  }
  window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
}

function ScrollToTop() {
  const { pathname, hash } = useLocation();

  // Disable the browser's automatic scroll-position restoration so it doesn't
  // fight us on route transitions. Run once on mount.
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  // Pathname/hash-change scroll: handles cross-route navigation (typed URL,
  // back/forward, programmatic navigate). If a hash is present, scroll to
  // that element; otherwise scroll to top. useLayoutEffect runs before paint
  // so there's no frame of stale scroll position.
  useLayoutEffect(() => {
    scrollToHashOrTop(hash || null);
  }, [pathname, hash]);

  // Click-delegation scroll: handles SAME-route Link clicks. When a user is
  // already on /contact and clicks the Footer "Request an Estimate" Link
  // (which targets /contact#estimate-form), React Router may treat the
  // pathname as a no-op and the hash change doesn't reliably trigger our
  // pathname-change effect. Document-level click delegation guarantees the
  // scroll fires regardless of how React Router handles the navigation.
  useEffect(() => {
    function handleInternalLinkClick(e: MouseEvent) {
      // Bail on modified clicks (open-in-new-tab, middle-click, etc.) so we
      // don't interfere with the browser's native behavior.
      if (
        e.defaultPrevented ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey ||
        e.button !== 0
      ) {
        return;
      }
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      // Only handle internal absolute-path links (Links to /something).
      // Skip externals (http://), protocol-relative (//), mailto:, tel:, and
      // hash-only fragments (#section).
      if (!href || !href.startsWith("/") || href.startsWith("//")) return;
      // Extract the hash portion if present so links to /contact#estimate-form
      // scroll to the form rather than the top of the page.
      const hashIdx = href.indexOf("#");
      const clickHash = hashIdx > -1 ? href.slice(hashIdx) : null;
      // Defer one animation frame so React Router's navigation logic settles
      // first. Same-route clicks: scroll is the only behavior. Cross-route:
      // both fire, but both target the same destination so no conflict.
      requestAnimationFrame(() => scrollToHashOrTop(clickHash));
    }
    // CAPTURE phase (third arg true) so this handler runs BEFORE React's
    // synthetic event delegation. React Router's Link calls preventDefault()
    // during bubble-phase event dispatch; if we registered in bubble phase
    // too, e.defaultPrevented would already be true when we see the click
    // and the bail-out at the top of this handler would skip the scroll
    // entirely. Capture phase walks down from document first, so we run
    // before any React onClick has a chance to preventDefault.
    document.addEventListener("click", handleInternalLinkClick, true);
    return () => document.removeEventListener("click", handleInternalLinkClick, true);
  }, []);

  return null;
}

function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Landing pages - no header/footer navigation */}
        <Route path="/lp/:slug" element={<LandingPage />} />

        {/* Main site with header/footer */}
        <Route
          path="*"
          element={
            <>
              <Header />
              <main className="min-h-screen">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/services" element={<Services />} />
                  <Route path="/services/:slug" element={<ServiceDetail />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/reviews" element={<Reviews />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/refer" element={<Refer />} />
                  <Route path="/year-round" element={<YearRound />} />
                  <Route path="/concrete-contractor/:slug" element={<NeighborhoodPage />} />
                </Routes>
              </main>
              <Footer />
            </>
          }
        />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
