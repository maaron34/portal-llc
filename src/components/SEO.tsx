import { useEffect } from "react";
import { generateLocalBusinessSchema, type PageSEO } from "../data/seo";

interface SEOProps {
  seo: PageSEO;
  schema?: object | object[];
}

export default function SEO({ seo, schema }: SEOProps) {
  useEffect(() => {
    document.title = seo.title;

    const setMeta = (name: string, content: string, property = false) => {
      const attr = property ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("description", seo.description);
    setMeta("og:title", seo.title, true);
    setMeta("og:description", seo.description, true);
    setMeta("og:url", seo.canonical, true);

    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = seo.canonical;

    // Schema markup: caller-provided schema, or default to LocalBusiness on every route
    // so prerendered pages without page-specific schema (About, Reviews, Contact, etc.)
    // still have LocalBusiness in the snapshot.
    const schemas = schema
      ? (Array.isArray(schema) ? schema : [schema])
      : [generateLocalBusinessSchema()];

    const existingSchemas = document.querySelectorAll('script[data-schema="portal"]');
    existingSchemas.forEach((el) => el.remove());

    schemas.forEach((s) => {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute("data-schema", "portal");
      script.textContent = JSON.stringify(s);
      document.head.appendChild(script);
    });

    return () => {
      const cleanup = document.querySelectorAll('script[data-schema="portal"]');
      cleanup.forEach((el) => el.remove());
    };
  }, [seo, schema]);

  return null;
}
