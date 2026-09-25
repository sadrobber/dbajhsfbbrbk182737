import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { AdvisorLauncher } from "@/components/advisor/advisor-buttons";
import { AdvisorPanel } from "@/components/advisor/advisor-panel";
import { AdvisorProvider } from "@/components/advisor/advisor-provider";
import { SiteFooter } from "@/components/layout/site-footer";
import { RevealOnScroll } from "@/components/layout/reveal-on-scroll";
import { SiteHeader } from "@/components/layout/site-header";
import { SkipLink } from "@/components/layout/skip-link";
import { ALLOW_SEARCH_INDEXING, BRAND_NAME } from "@/config/site.config";
import { routing } from "@/i18n/routing";
import { pick } from "@/lib/pick";
import "../globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["600", "700", "800"],
  display: "swap",
});

/** Only these message namespaces are sent to the browser (for client components). */
const CLIENT_NAMESPACES = ["Common", "Header", "Hero", "Advisor"] as const;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "Metadata" });
  const title = t("title", { brand: BRAND_NAME });
  return {
    metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
    title: { default: title, template: `%s · ${BRAND_NAME}` },
    description: t("description"),
    applicationName: BRAND_NAME,
    robots: ALLOW_SEARCH_INDEXING ? undefined : { index: false, follow: false },
    openGraph: { title, description: t("description"), siteName: BRAND_NAME, locale, type: "website" },
  };
}

export const viewport: Viewport = {
  themeColor: "#050507",
  colorScheme: "dark",
};

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html lang={locale} className={`${inter.variable} ${jakarta.variable}`}>
      <body className="min-h-dvh bg-ink font-sans text-fg antialiased">
        <NextIntlClientProvider messages={pick(messages, CLIENT_NAMESPACES)}>
          <AdvisorProvider>
            <SkipLink />
            <SiteHeader />
            <main id="main" tabIndex={-1} className="outline-none">
              {children}
            </main>
            <SiteFooter />
            <AdvisorPanel />
            <AdvisorLauncher />
            <RevealOnScroll />
          </AdvisorProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
