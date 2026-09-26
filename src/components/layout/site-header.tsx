import { getTranslations } from "next-intl/server";
import { BRAND_NAME } from "@/config/site.config";
import { Link } from "@/i18n/navigation";
import { CartLink } from "@/components/checkout/cart-link";
import { container } from "@/components/ui/styles";
import { LanguageSwitcher } from "./language-switcher";
import { Wordmark } from "./wordmark";

export async function SiteHeader() {
  const t = await getTranslations("Header");
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/85 backdrop-blur-xl">
      {/* Electric-blue identity hairline */}
      <div aria-hidden="true" className="h-0.5 bg-[linear-gradient(90deg,#0b0c10,#0066ff_45%,#5aa9ff)]" />
      <div className={`${container} flex h-[4.5rem] items-center justify-between gap-4`}>
        <Link href="/" aria-label={t("home", { brand: BRAND_NAME })} className="inline-flex min-h-12 items-center rounded-lg">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-2">
          <CartLink label={t("cart")} />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
