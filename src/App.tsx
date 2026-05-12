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

  // Use useLayoutEffect so the scroll-to-top fires BEFORE the next route
  // paints. Previously useEffect ran after paint, which meant a frame of
  // visible scroll-position carryover (and on some browsers the scroll never
  // applied at all because the browser's own scroll restoration won the race).
  // "instant" behavior explicitly opts out of any inherited smooth-scroll CSS.
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

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
