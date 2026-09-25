"use client";

import { Search } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { adminCard, adminInput, adminSelect, tableCell, tableHead } from "./styles";

export type RecordColumn = { key: string; label: string; align?: "right" };
export type RecordRow = {
  id: string;
  cells: Record<string, ReactNode>;
  /** Lower-case text the search box looks in. */
  search: string;
  /** Values for the filter dropdowns, by filter key. */
  facets?: Record<string, string>;
};
export type RecordFilter = { key: string; label: string; allLabel: string; options: { value: string; label: string }[] };

/** Read-only list with instant search and filters, for the back-office records. */
export function RecordTable({
  caption,
  columns,
  rows,
  filters = [],
  initialQuery = "",
  searchPlaceholder,
  minWidth = "56rem",
}: {
  caption: string;
  columns: RecordColumn[];
  rows: RecordRow[];
  filters?: RecordFilter[];
  initialQuery?: string;
  searchPlaceholder: string;
  minWidth?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [selected, setSelected] = useState<Record<string, string>>({});

  const visible = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return rows.filter(
      (row) =>
        words.every((word) => row.search.includes(word)) &&
        Object.entries(selected).every(([key, value]) => !value || row.facets?.[key] === value),
    );
  }, [rows, query, selected]);

  return (
    <div className="grid gap-3">
      <div className={cn(adminCard, "flex flex-wrap gap-3 p-3")}>
        <label className="relative min-w-[min(100%,16rem)] flex-1">
          <span className="sr-only">Search</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-fg-subtle" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className={cn(adminInput, "pl-10")}
          />
        </label>
        {filters.map((filter) => (
          <label key={filter.key} className="w-full sm:w-56">
            <span className="sr-only">{filter.label}</span>
            <select
              value={selected[filter.key] ?? ""}
              onChange={(e) => setSelected((s) => ({ ...s, [filter.key]: e.target.value }))}
              className={adminSelect}
            >
              <option value="">{filter.allLabel}</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <div className={cn(adminCard, "overflow-x-auto")}>
        <table className="w-full border-collapse text-[0.9375rem]" style={{ minWidth }}>
          <caption className="sr-only">
            {caption}, {visible.length} shown
          </caption>
          <thead className="border-b border-line bg-surface-1">
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col" className={cn(tableHead, column.align === "right" && "text-right")}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.id} className="border-b border-line last:border-0 hover:bg-surface-1">
                {columns.map((column) => (
                  <td key={column.key} className={cn(tableCell, column.align === "right" && "text-right tabular-nums")}>
                    {row.cells[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && <p className="p-6 text-center text-fg-muted">Nothing matches.</p>}
      </div>
      <p className="text-[0.875rem] text-fg-subtle">
        {visible.length} of {rows.length}
      </p>
    </div>
  );
}
