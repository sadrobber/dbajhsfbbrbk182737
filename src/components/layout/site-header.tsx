import { ArrowsLeftRightIcon as ArrowLeftRight } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import { BRAND_NAME } from "@/config/site.config";
import { Link } from "@/i18n/navigation";
import { CartLink } from "@/components/checkout/cart-link";
import { container } from "@/components/ui/styles";
import { paths } from "@/lib/paths";
import { LanguageSwitcher } from "./language-switcher";
import { Wordmark } from "./wordmark";

export async function SiteHeader() {
  const t = await getTranslations("Header");
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/85 backdrop-blur-xl">
      {/* Electric-blue identity hairline */}
      <div aria-hidden="true" className="h-0.5 bg-[linear-gradient(90deg,#0b0c10,#1b67da_45%,#6ea8ec)]" />
      <div className={`${container} flex h-[4.5rem] items-center justify-between gap-4`}>
        <Link href="/" aria-label={t("home", { brand: BRAND_NAME })} className="inline-flex min-h-12 items-center rounded-lg">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={paths.compare()}
            className="hidden min-h-12 min-w-12 items-center justify-center gap-2 rounded-full px-3 font-semibold sm:inline-flex text-fg transition hover:bg-surface-1 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent-strong"
          >
            <ArrowLeftRight aria-hidden="true" className="size-5" />
            {/* Not on phones: the header is full there (the homepage hero links to it instead). */}
            {t("compare")}
          </Link>
          <CartLink label={t("cart")} />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
