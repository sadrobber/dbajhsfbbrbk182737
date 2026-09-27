import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";

/**
 * Section title on the left, its line and link on the right (stacked on phones).
 * Headings stay moderate: hierarchy comes from weight and colour, not size.
 */
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
    <div className="mb-8 grid gap-4 sm:mb-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-end lg:gap-12">
      <h2 id={id} className="max-w-[18ch] text-balance font-display text-3xl font-bold leading-none tracking-tighter md:text-5xl">
        {title}
      </h2>
      {(subtitle || link) && (
        <div className="flex flex-col items-start gap-2">
          {subtitle && <p className="max-w-[46ch] text-base leading-relaxed text-fg-muted md:text-lg">{subtitle}</p>}
          {link && (
            <Link
              href={link.href}
              className="group inline-flex min-h-11 items-center gap-2 font-semibold text-accent-text underline-offset-4 hover:underline"
            >
              {link.label}
              <ArrowRightIcon aria-hidden="true" className="size-5 transition group-hover:translate-x-1" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
