import type { MetadataRoute } from "next";

const BASE_URL = "https://www.histoire-eternelle-l-atelier.fr";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/admin/",
        "/checkout",
        "/panier",
        "/compte",
        "/connexion",
        "/messages",
        "/souhaits",
        "/confirmation/",
        "/recherche",
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
