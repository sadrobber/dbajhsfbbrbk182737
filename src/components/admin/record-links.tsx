import Link from "next/link";
import type { ReactNode } from "react";
import type { AdminTranslator } from "@/i18n/admin";
import type { Customer } from "@/lib/data/records";

/** Links between records: each one opens the other list, searched for that record. */

export function CustomerLink({ customer, t }: { customer: Customer | undefined; t: AdminTranslator }) {
  if (!customer) return <span className="text-fg-subtle">{t("Common.unknownCustomer")}</span>;
  return (
    <Link href={`/admin/customers?q=${encodeURIComponent(customer.email)}`} className="font-semibold text-accent-text underline-offset-2 hover:underline">
      {customer.firstName} {customer.lastName}
    </Link>
  );
}

export function RecordLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-semibold text-accent-text underline-offset-2 hover:underline">
      {children}
    </Link>
  );
}

export function customerSearchText(customer: Customer | undefined): string {
  return customer ? `${customer.firstName} ${customer.lastName} ${customer.email} ${customer.phone}` : "";
}
