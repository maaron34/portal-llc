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
import YearRound from "./pages/YearRound";
import LandingPage from "./pages/LandingPage";

function ScrollToTop() {
  const { pathname } = useLocation();

  // Disable the browser's automatic scroll-position restoration so it doesn't
  // fight us on route transitions. Run once on mount.
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  // Pathname-change scroll: handles cross-route navigation (typed URL,
  // back/forward, programmatic navigate). useLayoutEffect runs before paint
  // so there's no frame of stale scroll position.
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  // Click-delegation scroll: handles SAME-route Link clicks. When a user is
  // already on /contact and clicks the Footer "Request an Estimate" Link
  // (which targets /contact), React Router treats it as a no-op and pathname
  // never changes — so the useLayoutEffect above doesn't fire. Document-level
  // click delegation catches every internal-link click regardless of where
  // the Link component lives.
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
      // Only scroll for internal absolute-path links (Links to /something).
      // Skip externals (http://), protocol-relative (//), mailto:, tel:, and
      // hash-only fragments (#section).
      if (!href || !href.startsWith("/") || href.startsWith("//")) return;
      // Defer one animation frame so React Router's navigation logic settles
      // first. Same-route clicks: scroll is the only behavior. Cross-route:
      // both fire, but they both scroll to (0, 0) so no conflict.
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
      });
    }
    document.addEventListener("click", handleInternalLinkClick);
    return () => document.removeEventListener("click", handleInternalLinkClick);
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
                  <Route path="/year-round" element={<YearRound />} />
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
