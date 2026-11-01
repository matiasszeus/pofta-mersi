import type { Metadata } from "next";
import { content } from "@/config/content";

// The site's own address, for links in previews and the canonical address
// (set NEXT_PUBLIC_SITE_URL in Vercel, e.g. https://poftamersi.ro; without
// it: the address Vercel gives the production site, or localhost).
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

// A page's title, description and preview (what WhatsApp, Instagram,
// Facebook show when its link is shared: og:* and twitter:*):
//   title   as it should read, e.g. "Pofta Mersi · brățări"
//   path    its address, also its canonical one ("/album/bratari")
//   image   its preview picture in public/ (1200x630 JPG, made by
//           scripts/og-images.ts: npm run og)
export function pageMetadata({
  title,
  description,
  path,
  image,
}: {
  title: string;
  description: string;
  path: string;
  image: string;
}): Metadata {
  const images = [{ url: image, width: 1200, height: 630, alt: title }];
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: content.meta.siteName,
      locale: "ro_RO",
      title,
      description,
      url: path,
      images,
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}
