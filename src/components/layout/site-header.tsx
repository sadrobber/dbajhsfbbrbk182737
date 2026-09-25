import { getTranslations } from "next-intl/server";
import { BRAND_NAME } from "@/config/site.config";
import { Link } from "@/i18n/navigation";
import { container } from "@/components/ui/styles";
import { LanguageSwitcher } from "./language-switcher";
import { Wordmark } from "./wordmark";

export async function SiteHeader() {
  const t = await getTranslations("Header");
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/75 backdrop-blur-xl">
      <div className={`${container} flex h-[4.5rem] items-center justify-between gap-4`}>
        <Link href="/" aria-label={t("home", { brand: BRAND_NAME })} className="inline-flex min-h-12 items-center rounded-lg">
          <Wordmark />
        </Link>
        <LanguageSwitcher />
      </div>
    </header>
  );
}
