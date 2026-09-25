import { getTranslations } from "next-intl/server";

export async function SkipLink() {
  const t = await getTranslations("Common");
  return (
    <a
      href="#main"
      className="sr-only z-50 rounded-full bg-fg px-5 py-3 font-semibold text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
    >
      {t("skipToContent")}
    </a>
  );
}
