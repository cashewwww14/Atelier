import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { Reveal } from "@/components/ui/Reveal";
import { profile } from "@/data/profile";

export const metadata: Metadata = {
  title: `Contact — ${profile.name}`,
  description: "The way to reach him.",
};

const LINKS = [
  { label: "Email", value: profile.email, href: `mailto:${profile.email}` },
  { label: "GitHub", value: profile.github.handle, href: profile.github.url },
  { label: "LinkedIn", value: profile.linkedin.handle, href: profile.linkedin.url },
];

export default function ContactPage() {
  return (
    <PageShell
      eyebrow="Contact"
      title="The way to reach him"
      lede="If there is something to build, the signpost points here."
    >
      <ul className="border-t border-rule">
        {LINKS.map((link, i) => {
          const external = link.href.startsWith("http");
          return (
            <Reveal key={link.label} delay={0.05 * i} as="li" className="block border-b border-rule">
              <a
                href={link.href}
                target={external ? "_blank" : undefined}
                rel={external ? "noreferrer noopener" : undefined}
                className="group relative flex items-center justify-between gap-6 overflow-hidden py-7"
              >
                <span
                  aria-hidden
                  className="absolute inset-0 origin-left scale-x-0 bg-moss-wash transition-transform duration-700 [transition-timing-function:var(--ease-out-expo)] group-hover:scale-x-100"
                />

                <span className="relative flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-6">
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint sm:w-24 sm:shrink-0">
                    {link.label}
                  </span>
                  <span className="min-w-0 break-all font-display text-[clamp(1.05rem,2.4vw,1.7rem)] text-ink transition-transform duration-700 [transition-timing-function:var(--ease-out-expo)] group-hover:translate-x-2 sm:break-normal">
                    {link.value}
                  </span>
                </span>

                <span className="relative shrink-0 text-moss transition-transform duration-700 [transition-timing-function:var(--ease-out-expo)] group-hover:translate-x-1">
                  ↗
                </span>
              </a>
            </Reveal>
          );
        })}
      </ul>

      <Reveal delay={0.24}>
        <p className="mt-14 max-w-[52ch] text-[13.5px] leading-relaxed text-muted">
          {profile.publication.detail} Issued by {profile.publication.issuer}.
        </p>
      </Reveal>
    </PageShell>
  );
}
