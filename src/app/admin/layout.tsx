import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { AdminI18nProvider } from "@/components/admin/i18n";
import { BRAND_NAME } from "@/config/site.config";
import { getAdminLocale, getAdminMessages } from "@/server/admin/i18n";
import "../globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", weight: ["700", "800"], display: "swap" });

export const metadata: Metadata = {
  title: { default: `${BRAND_NAME} Admin`, template: `%s · ${BRAND_NAME} Admin` },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#0b0c10", colorScheme: "light" };

/**
 * Back office: its own root layout, nothing shared with the customer-facing
 * site's header, footer or advisor. Its language (French by default, or
 * English) comes from a cookie set by the language switch.
 */
export default async function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  const locale = await getAdminLocale();
  return (
    <html lang={locale} data-scroll-behavior="smooth" className={`${inter.variable} ${jakarta.variable}`}>
      <body className="min-h-dvh bg-surface-1 font-sans text-fg antialiased">
        <AdminI18nProvider locale={locale} messages={getAdminMessages(locale)}>
          {children}
        </AdminI18nProvider>
      </body>
    </html>
  );
}
