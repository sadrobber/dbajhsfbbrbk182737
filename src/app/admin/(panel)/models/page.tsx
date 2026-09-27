import type { Metadata } from "next";
import { RecordLink } from "@/components/admin/record-links";
import { type RecordRow, RecordTable } from "@/components/admin/record-table";
import { Banner, PageHeader, Pill } from "@/components/admin/ui";
import { listModels, listProducts } from "@/lib/data/admin-repository";
import { modelColorName } from "@/lib/data/schema";
import { requireAdmin } from "@/server/admin/auth";
import { getAdminI18n } from "@/server/admin/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getAdminI18n();
  return { title: t("Models.title") };
}

/** The phone spec database: every model the shop can sell, buy back or compare. Read-only for now. */
export default async function ModelsPage({ searchParams }: PageProps<"/admin/models">) {
  await requireAdmin();
  const [models, products, { q }, { t, locale }] = await Promise.all([listModels(), listProducts(), searchParams, getAdminI18n()]);
  const variantCounts = new Map<string, number>();
  for (const p of products) variantCounts.set(p.modelId, (variantCounts.get(p.modelId) ?? 0) + 1);
  const toCheck = models.filter((m) => m.data_quality.status === "needs_check").length;
  const incomplete = models.filter((m) => m.data_quality.missing_fields.length > 0).length;

  const rows: RecordRow[] = [...models]
    .sort((a, b) => (b.release.month ?? "").localeCompare(a.release.month ?? "") || a.full_name.localeCompare(b.full_name))
    .map((model) => {
      const variants = variantCounts.get(model.id) ?? 0;
      const missing = model.data_quality.missing_fields;
      const colorsToTranslate = model.colors.filter((c) => c.name_fr === null || c.name_it === null).length;
      return {
        id: model.id,
        search: `${model.brand} ${model.name} ${model.id} ${model.series} ${model.specs.chip ?? ""}`.toLowerCase(),
        facets: {
          brand: model.brand,
          status: missing.length > 0 ? "incomplete" : model.data_quality.status,
          sold: variants > 0 ? "yes" : "no",
        },
        cells: {
          name: (
            <span className="grid">
              <span className="font-semibold">
                {model.brand} {model.name}
              </span>
              <span className="text-[0.8125rem] text-fg-subtle">{model.id}</span>
            </span>
          ),
          released: model.release.month ?? "—",
          form: model.form_factor === "foldable" ? t("Models.foldable") : t("Models.bar"),
          specs:
            missing.length > 0 ? (
              <span className="grid gap-1">
                <Pill tone="danger">{t("Models.incomplete")}</Pill>
                <span className="text-[0.8125rem] text-fg-muted">{t("Models.missing", { fields: missing.join(", ") })}</span>
              </span>
            ) : model.data_quality.status === "needs_check" ? (
              <Pill tone="warning">{t("Models.toCheck")}</Pill>
            ) : (
              <Pill tone="success">{t("Models.checked")}</Pill>
            ),
          source: model.data_quality.source ?? <span className="text-fg-subtle">—</span>,
          colours:
            model.colors.length === 0 ? (
              <span className="text-fg-subtle">{t("Models.unknownColours")}</span>
            ) : (
              <span className="grid text-[0.875rem]">
                {model.colors.map((c) => modelColorName(c, locale) ?? c.name_en).join(", ")}
                {colorsToTranslate > 0 && <span className="text-fg-subtle">{t("Models.coloursToTranslate")}</span>}
              </span>
            ),
          variants: variants > 0 ? <RecordLink href={`/admin/products?q=${encodeURIComponent(model.id)}`}>{variants}</RecordLink> : "0",
        },
      };
    });

  return (
    <>
      <PageHeader title={t("Models.title")} description={t("Models.description")} />
      <Banner tone="warning">
        <strong>{t("Models.bannerTitle", { count: toCheck })}</strong> {t("Models.bannerText", { incomplete })}
      </Banner>
      <RecordTable
        caption={t("Models.caption")}
        searchPlaceholder={t("Models.searchPlaceholder")}
        initialQuery={typeof q === "string" ? q : ""}
        minWidth="68rem"
        columns={[
          { key: "name", label: t("Models.colModel") },
          { key: "released", label: t("Models.colReleased") },
          { key: "form", label: t("Models.colForm") },
          { key: "specs", label: t("Models.colSpecs") },
          { key: "source", label: t("Models.colSource") },
          { key: "colours", label: t("Models.colColours") },
          { key: "variants", label: t("Models.colProducts"), align: "right" },
        ]}
        filters={[
          {
            key: "brand",
            label: t("Models.brand"),
            allLabel: t("Models.allBrands"),
            options: [...new Set(models.map((m) => m.brand))].sort().map((brand) => ({ value: brand, label: brand })),
          },
          {
            key: "status",
            label: t("Models.specsFilter"),
            allLabel: t("Models.anySpecs"),
            options: [
              { value: "needs_check", label: t("Models.toCheck") },
              { value: "incomplete", label: t("Models.incomplete") },
              { value: "web_checked", label: t("Models.checked") },
            ],
          },
          {
            key: "sold",
            label: t("Models.inShop"),
            allLabel: t("Models.soldOrNot"),
            options: [
              { value: "yes", label: t("Models.hasProducts") },
              { value: "no", label: t("Models.noProducts") },
            ],
          },
        ]}
        rows={rows}
      />
    </>
  );
}
