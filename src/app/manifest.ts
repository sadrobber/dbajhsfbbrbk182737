import type { MetadataRoute } from "next";
import { BRAND_NAME } from "@/config/site.config";
import { getTranslator } from "@/i18n/messages";
import { routing } from "@/i18n/routing";

/** Web app manifest: first step towards the PWA / installable app. */
export default function manifest(): MetadataRoute.Manifest {
  const t = getTranslator(routing.defaultLocale);
  return {
    name: BRAND_NAME,
    short_name: BRAND_NAME,
    description: t("Metadata.description"),
    lang: routing.defaultLocale,
    start_url: `/${routing.defaultLocale}`,
    display: "standalone",
    background_color: "#050507",
    theme_color: "#050507",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
