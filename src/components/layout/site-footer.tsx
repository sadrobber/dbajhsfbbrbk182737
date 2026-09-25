import { getTranslations } from "next-intl/server";
import { BRAND_NAME } from "@/config/site.config";
import { Link } from "@/i18n/navigation";
import { paths } from "@/lib/paths";
import { container } from "@/components/ui/styles";
import { Wordmark } from "./wordmark";

export async function SiteFooter() {
  const t = await getTranslations("Footer");
  const common = await getTranslations("Common");
  const links = [
    { href: paths.store, label: t("store") },
    { href: paths.rules, label: t("rules") },
    { href: paths.legal, label: t("legal") },
  ];

  return (
    <footer className="mt-16 bg-night text-white">
      <div className={`${container} grid gap-8 py-12 sm:grid-cols-[1fr_auto] sm:items-start`}>
        <div>
          <Wordmark onDark />
          <p className="mt-2 max-w-sm text-night-muted">{t("tagline")}</p>
        </div>
        <ul className="flex flex-wrap gap-x-6 gap-y-1">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="inline-flex min-h-11 items-center text-night-muted underline-offset-4 hover:text-white hover:underline focus-visible:outline-night-accent"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="border-t border-white/10">
        <div className={`${container} flex flex-col gap-2 pb-28 pt-6 text-[0.9375rem] text-night-muted sm:flex-row sm:justify-between sm:pb-8`}>
          <p>{t("copyright", { year: String(new Date().getFullYear()), brand: BRAND_NAME })}</p>
          <p>{common("prototypeNotice")}</p>
        </div>
      </div>
    </footer>
  );
}
