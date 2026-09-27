import type { Metadata } from "next";
import { RecordLink } from "@/components/admin/record-links";
import { type RecordRow, RecordTable } from "@/components/admin/record-table";
import { Banner, PageHeader, Pill } from "@/components/admin/ui";
import { listModels, listProducts } from "@/lib/data/admin-repository";
import { requireAdmin } from "@/server/admin/auth";

export const metadata: Metadata = { title: "Models" };

/** The phone spec database: every model the shop can sell, buy back or compare. Read-only for now. */
export default async function ModelsPage({ searchParams }: PageProps<"/admin/models">) {
  await requireAdmin();
  const [models, products, { q }] = await Promise.all([listModels(), listProducts(), searchParams]);
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
          form: model.form_factor === "foldable" ? "Foldable" : "Bar",
          specs:
            missing.length > 0 ? (
              <span className="grid gap-1">
                <Pill tone="danger">Incomplete</Pill>
                <span className="text-[0.8125rem] text-fg-muted">Missing: {missing.join(", ")}</span>
              </span>
            ) : model.data_quality.status === "needs_check" ? (
              <Pill tone="warning">Specs to check</Pill>
            ) : (
              <Pill tone="success">Checked</Pill>
            ),
          source: model.data_quality.source ?? <span className="text-fg-subtle">—</span>,
          colours:
            model.colors.length === 0 ? (
              <span className="text-fg-subtle">Unknown</span>
            ) : (
              <span className="grid text-[0.875rem]">
                {model.colors.map((c) => c.name_en).join(", ")}
                {colorsToTranslate > 0 && <span className="text-fg-subtle">FR / IT names to add</span>}
              </span>
            ),
          variants: variants > 0 ? <RecordLink href={`/admin/products?q=${encodeURIComponent(model.id)}`}>{variants}</RecordLink> : "0",
        },
      };
    });

  return (
    <>
      <PageHeader
        title="Models"
        description="The phone spec database: specs, colours and storage options for every model. Products (the phones in stock) each belong to one model."
      />
      <Banner tone="warning">
        <strong>{toCheck} models have specs to check</strong> and {incomplete} are incomplete. Before a model goes on sale, compare its specs
        with the manufacturer&rsquo;s page. Editing models here comes later: for now, fixes go in <code>data/models.json</code>.
      </Banner>
      <RecordTable
        caption="Models"
        searchPlaceholder="Search by name, series or chip…"
        initialQuery={typeof q === "string" ? q : ""}
        minWidth="68rem"
        columns={[
          { key: "name", label: "Model" },
          { key: "released", label: "Released" },
          { key: "form", label: "Form" },
          { key: "specs", label: "Specs" },
          { key: "source", label: "Checked on" },
          { key: "colours", label: "Colours" },
          { key: "variants", label: "Products", align: "right" },
        ]}
        filters={[
          {
            key: "brand",
            label: "Brand",
            allLabel: "All brands",
            options: [...new Set(models.map((m) => m.brand))].sort().map((brand) => ({ value: brand, label: brand })),
          },
          {
            key: "status",
            label: "Specs",
            allLabel: "Any specs status",
            options: [
              { value: "needs_check", label: "Specs to check" },
              { value: "incomplete", label: "Incomplete" },
              { value: "web_checked", label: "Checked" },
            ],
          },
          {
            key: "sold",
            label: "In the shop",
            allLabel: "Sold or not",
            options: [
              { value: "yes", label: "Has products" },
              { value: "no", label: "No products" },
            ],
          },
        ]}
        rows={rows}
      />
    </>
  );
}
