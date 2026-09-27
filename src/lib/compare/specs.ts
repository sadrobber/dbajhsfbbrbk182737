import type { Translator } from "@/i18n/messages";
import { intlLocale, type Locale } from "@/i18n/routing";
import type { PhoneModel } from "@/lib/data/schema";
import { translateDynamic } from "@/lib/i18n-dynamic";

/**
 * Two phones' specifications as rows for the comparison table.
 * Values come from the spec database as they are (never retyped): only numbers
 * and units are formatted. "better" is set only where a bigger number is
 * clearly better (battery, refresh rate, charging...), never on taste (size, weight).
 */

export type Side = "mine" | "want";
export type SpecRow = { key: string; label: string; mine: string | null; want: string | null; better: Side | null; differs: boolean };
export type SpecSection = { key: string; title: string; rows: SpecRow[] };

type Specs = PhoneModel["specs"];
type Value = { text: string | null; score: number | null };

const ROLE_KEYS: Record<string, string> = {
  wide: "wide",
  ultrawide: "ultrawide",
  telephoto: "telephoto",
  "periscope telephoto": "periscope",
  depth: "depth",
  macro: "macro",
  monochrome: "monochrome",
  "ToF / LiDAR": "tof",
};

/** A number from text: "Wi-Fi 6E" -> 6.5, "5.3" -> 5.3, "IP68" -> 68 (water digit first), "5G" -> 5. */
export function rankOf(kind: "wifi" | "bluetooth" | "network" | "water", text: string | null): number | null {
  if (!text) return null;
  switch (kind) {
    case "wifi": {
      const match = /wi-?fi\s*(\d)(e)?/i.exec(text);
      return match ? Number(match[1]) + (match[2] ? 0.5 : 0) : null;
    }
    case "bluetooth": {
      const value = Number.parseFloat(text);
      return Number.isFinite(value) ? value : null;
    }
    case "network":
      return /5g/i.test(text) && !/4g\s*\/\s*5g/i.test(text) ? 5 : /4g/i.test(text) ? 4 : null;
    case "water": {
      // Best rating listed ("IP68 / IP69"): water digit counts most, then dust.
      const ratings = [...text.matchAll(/ip([\dx])(\d)/gi)].map((m) => Number(m[2]) * 10 + (m[1] === "x" || m[1] === "X" ? 0 : Number(m[1])));
      return ratings.length > 0 ? Math.max(...ratings) : null;
    }
  }
}

export function compareSpecs(mine: PhoneModel, want: PhoneModel, t: Translator, locale: Locale): SpecSection[] {
  const number = (value: number, digits = 1) => new Intl.NumberFormat(intlLocale[locale], { maximumFractionDigits: digits }).format(value);
  const storage = (gb: number) => (gb >= 1024 ? t("Compare.units.tb", { value: number(gb / 1024) }) : t("Compare.units.gb", { value: number(gb) }));
  const yesNo = (value: boolean) => (value ? t("Compare.specs.yes") : t("Compare.specs.no"));
  const released = (model: PhoneModel) => {
    if (model.release.month) {
      const [year, month] = model.release.month.split("-").map(Number);
      return new Intl.DateTimeFormat(intlLocale[locale], { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
    }
    return model.release.year ? String(model.release.year) : null;
  };
  const dims = (d: { height: number; width: number; thickness: number }) =>
    t("Compare.units.mm", { h: number(d.height), w: number(d.width), t: number(d.thickness) });
  const size = (specs: Specs) => {
    const d = specs.dimensions_mm;
    if (!d) return null;
    if ("folded" in d) return `${t("Compare.specs.folded", { size: dims(d.folded) })} · ${t("Compare.specs.unfolded", { size: dims(d.unfolded) })}`;
    return dims(d);
  };
  const cameras = (specs: Specs) =>
    specs.rear_cameras.length === 0
      ? null
      : `${t("Compare.specs.cameraCount", { count: specs.rear_cameras.length })}: ${specs.rear_cameras
          .map((c) => {
            const role = translateDynamic(t, `Compare.specs.roles.${ROLE_KEYS[c.role] ?? "wide"}`);
            const zoom = c.optical_zoom ? ` ${t("Compare.units.zoom", { value: number(Number.parseFloat(c.optical_zoom)) })}` : "";
            return c.mp ? `${t("Compare.units.mp", { value: number(c.mp) })} ${role}${zoom}` : `${role}${zoom}`;
          })
          .join(" · ")}`;
  const mainCamera = (specs: Specs) => specs.rear_cameras.find((c) => c.role === "wide")?.mp ?? null;
  const maxZoom = (specs: Specs) => {
    const zooms = specs.rear_cameras.flatMap((c) => (c.optical_zoom ? [Number.parseFloat(c.optical_zoom)] : []));
    return zooms.length > 0 ? Math.max(...zooms) : null;
  };

  /** One row: how to read the value from a phone, and whether higher is better. */
  type RowSpec = { key: string; read: (model: PhoneModel) => Value; higherIsBetter?: boolean };
  const text = (value: string | null | undefined): Value => ({ text: value ?? null, score: null });
  const num = (value: number | null | undefined, format: (v: number) => string): Value =>
    value === null || value === undefined ? { text: null, score: null } : { text: format(value), score: value };
  const ranked = (value: string | null, score: number | null): Value => ({ text: value, score });
  const flag = (value: boolean | string | undefined): Value =>
    value === undefined ? { text: null, score: null } : { text: typeof value === "string" ? value : yesNo(value), score: value === false ? 0 : 1 };

  const sections: { key: string; rows: RowSpec[] }[] = [
    {
      key: "overview",
      rows: [
        { key: "released", read: (m) => ({ text: released(m), score: m.release.month ? Number(m.release.month.replace("-", "")) : m.release.year }), higherIsBetter: true },
        { key: "formFactor", read: (m) => text(translateDynamic(t, `Compare.specs.formFactor.${m.form_factor}`)) },
        { key: "os", read: (m) => text(m.specs.os_at_launch) },
      ],
    },
    {
      key: "display",
      rows: [
        { key: "size", read: (m) => num(m.specs.display.size_in, (v) => t("Compare.units.inch", { value: number(v, 2) })) },
        { key: "panel", read: (m) => text(m.specs.display.panel) },
        { key: "refresh", read: (m) => num(m.specs.display.refresh_hz, (v) => t("Compare.units.hz", { value: number(v) })), higherIsBetter: true },
        { key: "resolution", read: (m) => text(m.specs.display.resolution?.replace("x", " × ")) },
        {
          key: "cover",
          read: (m) => {
            const c = m.specs.cover_display;
            return text(c ? `${t("Compare.units.inch", { value: number(c.size_in, 2) })} ${c.panel} · ${t("Compare.units.hz", { value: number(c.refresh_hz) })}` : null);
          },
        },
      ],
    },
    {
      key: "performance",
      rows: [
        { key: "chip", read: (m) => text(m.specs.chip) },
        {
          key: "ram",
          read: (m) =>
            m.specs.ram_gb.length === 0
              ? { text: null, score: null }
              : { text: m.specs.ram_gb.map(storage).join(" / "), score: Math.max(...m.specs.ram_gb) },
          higherIsBetter: true,
        },
        {
          key: "storage",
          read: (m) => ({ text: m.specs.storage_gb.map(storage).join(" / "), score: Math.max(...m.specs.storage_gb) }),
          higherIsBetter: true,
        },
      ],
    },
    {
      key: "cameras",
      rows: [
        { key: "rearCameras", read: (m) => ({ text: cameras(m.specs), score: m.specs.rear_cameras.length || null }), higherIsBetter: true },
        { key: "mainCamera", read: (m) => num(mainCamera(m.specs), (v) => t("Compare.units.mp", { value: number(v) })), higherIsBetter: true },
        { key: "zoom", read: (m) => num(maxZoom(m.specs), (v) => t("Compare.units.zoom", { value: number(v) })), higherIsBetter: true },
        { key: "frontCamera", read: (m) => num(m.specs.front_camera_mp, (v) => t("Compare.units.mp", { value: number(v) })), higherIsBetter: true },
      ],
    },
    {
      key: "battery",
      rows: [
        { key: "battery", read: (m) => num(m.specs.battery_mah, (v) => t("Compare.units.mah", { value: number(v, 0) })), higherIsBetter: true },
        { key: "wired", read: (m) => num(m.specs.charging.wired_w, (v) => t("Compare.units.watt", { value: number(v) })), higherIsBetter: true },
        { key: "wireless", read: (m) => num(m.specs.charging.wireless_w, (v) => t("Compare.units.watt", { value: number(v) })), higherIsBetter: true },
      ],
    },
    {
      key: "design",
      rows: [
        { key: "dimensions", read: (m) => text(size(m.specs)) },
        { key: "weight", read: (m) => num(m.specs.weight_g, (v) => t("Compare.units.gram", { value: number(v) })) },
        { key: "water", read: (m) => ranked(m.specs.water_resistance, rankOf("water", m.specs.water_resistance)), higherIsBetter: true },
        { key: "frame", read: (m) => text(m.specs.frame) },
        { key: "biometrics", read: (m) => text(m.specs.biometrics) },
      ],
    },
    {
      key: "connectivity",
      rows: [
        { key: "network", read: (m) => ranked(m.specs.network, rankOf("network", m.specs.network)), higherIsBetter: true },
        { key: "wifi", read: (m) => ranked(m.specs.wifi, rankOf("wifi", m.specs.wifi)), higherIsBetter: true },
        { key: "bluetooth", read: (m) => ranked(m.specs.bluetooth, rankOf("bluetooth", m.specs.bluetooth)), higherIsBetter: true },
        { key: "sim", read: (m) => text(m.specs.sim) },
        { key: "connector", read: (m) => text(m.specs.connector) },
      ],
    },
    {
      key: "extras",
      rows: [
        { key: "magsafe", read: (m) => flag(m.specs.magsafe), higherIsBetter: true },
        { key: "qi2", read: (m) => flag(m.specs.qi2_magnets), higherIsBetter: true },
        { key: "dynamicIsland", read: (m) => flag(m.specs.dynamic_island), higherIsBetter: true },
        { key: "actionButton", read: (m) => flag(m.specs.action_button), higherIsBetter: true },
        { key: "cameraControl", read: (m) => flag(m.specs.camera_control), higherIsBetter: true },
        { key: "headphoneJack", read: (m) => flag(m.specs.headphone_jack), higherIsBetter: true },
        { key: "microSd", read: (m) => flag(m.specs.micro_sd), higherIsBetter: true },
        { key: "sPen", read: (m) => flag(m.specs.s_pen), higherIsBetter: true },
        { key: "glyph", read: (m) => flag(m.specs.glyph_lights), higherIsBetter: true },
      ],
    },
  ];

  return sections
    .map(({ key, rows }) => ({
      key,
      title: translateDynamic(t, `Compare.specs.sections.${key}`),
      rows: rows.flatMap((row) => {
        let a = row.read(mine);
        let b = row.read(want);
        // Extras only exist where relevant: "No" for the other phone, and hidden when neither has it.
        if (key === "extras") {
          if (a.score !== 1 && b.score !== 1) return [];
          if (a.text === null) a = { text: yesNo(false), score: 0 };
          if (b.text === null) b = { text: yesNo(false), score: 0 };
        }
        // Unknown on both sides: hide the row rather than show empty cells.
        if (a.text === null && b.text === null) return [];
        const better: Side | null =
          row.higherIsBetter && a.score !== null && b.score !== null && a.score !== b.score ? (a.score > b.score ? "mine" : "want") : null;
        return [
          {
            key: row.key,
            label: translateDynamic(t, `Compare.specs.rows.${row.key}`),
            mine: a.text,
            want: b.text,
            better,
            differs: a.text !== b.text,
          },
        ];
      }),
    }))
    .filter((section) => section.rows.length > 0);
}
