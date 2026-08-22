import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { Reveal } from "@/components/ui/Reveal";
import { profile } from "@/data/profile";
import { projects } from "@/data/projects";

export const metadata: Metadata = {
  title: `Work — ${profile.name}`,
  description: "Seven systems that were built and used.",
};

export default function WorkPage() {
  return (
    <PageShell
      eyebrow="Work"
      title="Seven things that shipped"
      lede="From a framework-free PHP news portal to a layered recommendation pipeline. Every interface here opens and runs — the data inside is invented, but the buttons genuinely work."
    >
      <ul className="grid gap-5 sm:grid-cols-2">
        {projects.map((project, i) => {
          // An externally hosted project skips the write-up entirely — the
          // running application is a better introduction than a page about it.
          const external = Boolean(project.externalUrl);
          const CardTag = external ? "a" : Link;
          const linkProps = external
            ? { href: project.externalUrl!, target: "_blank", rel: "noreferrer noopener" }
            : { href: `/work/${project.id}` };

          return (
          <Reveal key={project.id} delay={0.05 * i} as="li" className="block">
            <CardTag
              {...linkProps}
              className="group card flex h-full flex-col p-6 transition-shadow duration-500 hover:card-raised"
            >
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-mono text-[10px] tracking-[0.22em] text-faint">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
                  {project.year} · {project.role}
                </span>
              </div>

              <h2 className="mt-5 font-display text-[1.7rem] leading-tight text-ink">
                {project.title}
              </h2>
              <p className="mt-1.5 text-[14px] italic text-muted">{project.kicker}</p>

              {project.award && (
                <p
                  className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[9.5px] uppercase tracking-[0.14em]"
                  style={{
                    background: "var(--color-moss-wash)",
                    color: "var(--color-moss)",
                  }}
                >
                  ✦ {project.award}
                </p>
              )}

              <p className="mt-5 line-clamp-3 text-[14px] leading-relaxed text-muted">
                {project.summary}
              </p>

              <div className="mt-6 flex flex-wrap gap-1.5">
                {project.stack.slice(0, 4).map((tech) => (
                  <span
                    key={tech.name}
                    title={tech.role}
                    className="rounded-full border border-rule px-2.5 py-1 font-mono text-[10px] text-muted"
                  >
                    {tech.name}
                  </span>
                ))}
                {project.stack.length > 4 && (
                  <span className="px-1 py-1 font-mono text-[10px] text-faint">
                    +{project.stack.length - 4}
                  </span>
                )}
              </div>

              <span className="mt-7 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-moss">
                {external ? "Open the live app" : "Try the interface"}
                <span className="transition-transform duration-500 [transition-timing-function:var(--ease-out-expo)] group-hover:translate-x-1">
                  {external ? "↗" : "→"}
                </span>
              </span>
            </CardTag>
          </Reveal>
          );
        })}
      </ul>
    </PageShell>
  );
}
