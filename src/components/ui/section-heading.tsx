import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

export function SectionHeading({
  id,
  title,
  subtitle,
  link,
}: {
  id: string;
  title: string;
  subtitle?: string;
  link?: { href: string; label: string };
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 sm:mb-10">
      <div className="max-w-2xl">
        <h2 id={id} className="text-balance font-display text-[2rem] font-extrabold leading-[1.1] tracking-[-0.03em] sm:text-[2.75rem]">
          {title}
        </h2>
        {subtitle && <p className="mt-3 text-lg text-fg-muted sm:text-xl">{subtitle}</p>}
      </div>
      {link && (
        <Link
          href={link.href}
          className="group inline-flex min-h-12 items-center gap-2 rounded-full px-1 text-[1.0625rem] font-semibold text-accent-text hover:text-accent-strong"
        >
          {link.label}
          <ArrowRight aria-hidden="true" className="size-5 transition group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}
