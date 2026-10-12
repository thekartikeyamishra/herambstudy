import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { InstallControl } from "@/components/pwa/InstallControl";
import { StoreBadges } from "@/components/pwa/StoreBadges";
import { footerNav, siteConfig } from "@/config/site";

const columns = [
  { title: "Product", links: footerNav.product },
  { title: "Resources", links: footerNav.resources },
  { title: "Company", links: footerNav.company },
  { title: "Legal", links: footerNav.legal },
];

export function SiteFooter() {
  const socials = [
    { label: "LinkedIn", href: siteConfig.social.linkedin },
    { label: "X (Twitter)", href: siteConfig.social.x },
    { label: "Instagram", href: siteConfig.social.instagram },
  ].filter((s): s is { label: string; href: string } => Boolean(s.href));

  return (
    <footer role="contentinfo" className="on-night bg-night text-white">
      <div className="container py-16">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <Logo inverse />
            <p className="mt-4 max-w-sm font-display text-xl text-white/90">{siteConfig.tagline}</p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/60">
              {siteConfig.acronym} — {siteConfig.acronymExpansion}.
            </p>
            <div className="mt-8 space-y-4">
              <InstallControl inverse />
              <StoreBadges inverse />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {columns.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <h2 className="font-sans text-sm font-semibold text-white">{col.title}</h2>
                <ul className="mt-4 space-y-1">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="inline-block py-1.5 text-sm text-white/65 hover:text-white">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-6 text-sm text-white/55 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {siteConfig.operatorName ?? siteConfig.name}. Invite-only early access — no
            paid plans are offered yet.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {siteConfig.contactEmail ? (
              <a href={`mailto:${siteConfig.contactEmail}`} className="hover:text-white">
                {siteConfig.contactEmail}
              </a>
            ) : (
              <Link href="/contact" className="hover:text-white">
                Contact us
              </Link>
            )}
            {socials.map((s) => (
              <a key={s.label} href={s.href} rel="noopener me" target="_blank" className="hover:text-white">
                {s.label}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
