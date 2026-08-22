import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { Reveal } from "@/components/ui/Reveal";
import { LiveMockup } from "@/components/ui/LiveMockup";
import { projects } from "@/data/projects";

export function generateStaticParams() {
  // Externally hosted projects have no write-up to build.
  return projects.filter((p) => !p.externalUrl).map((p) => ({ id: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const project = projects.find((p) => p.id === id);
  return {
    title: project ? `${project.title} — ${project.kicker}` : "Work",
    description: project?.summary,
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const index = projects.findIndex((p) => p.id === id);
  if (index === -1 || projects[index].externalUrl) notFound();

  const project = projects[index];
  // Skip past anything that only exists as a live link.
  const order = projects.filter((p) => !p.externalUrl);
  const here = order.findIndex((p) => p.id === id);
  const next = order[(here + 1) % order.length];

  return (
    <PageShell
      eyebrow={`Work · ${String(index + 1).padStart(2, "0")}`}
      title={project.title}
      lede={project.kicker}
      backHref="/work"
      backLabel="All work"
    >
      <Reveal>
        <LiveMockup id={project.id} accent={project.accent} frame={project.frame} />
      </Reveal>

      <div className="mt-20 grid gap-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-20">
        <div>
          <Reveal>
            <p className="max-w-[52ch] text-pretty text-[clamp(1rem,1.5vw,1.15rem)] leading-[1.7] text-body">
              {project.summary}
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <ul className="mt-10 space-y-4">
              {project.highlights.map((h) => (
                <li key={h} className="relative max-w-[56ch] pl-6 text-[14.5px] leading-relaxed text-muted">
                  <span
                    aria-hidden
                    className="absolute left-0 top-[0.62em] h-[5px] w-[5px] rounded-full bg-moss"
                  />
                  {h}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <div>
          <Reveal delay={0.06}>
            <div className="card p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">Built with</p>
              <dl className="mt-4 space-y-2.5">
                {project.stack.map((tech) => (
                  <div key={tech.name} className="flex items-baseline justify-between gap-3">
                    <dt className="shrink-0 font-mono text-[11.5px] text-ink">{tech.name}</dt>
                    <dd
                      aria-hidden
                      className="mx-1 h-px min-w-3 flex-1 self-center"
                      style={{ background: "var(--color-rule)" }}
                    />
                    <dd className="shrink-0 text-right text-[11.5px] text-muted">{tech.role}</dd>
                  </div>
                ))}
              </dl>

              <dl className="mt-7 space-y-4 border-t border-rule pt-6">
                <div className="flex justify-between gap-4">
                  <dt className="text-[13px] text-faint">Year</dt>
                  <dd className="text-[13px] text-ink">{project.year}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[13px] text-faint">Role</dt>
                  <dd className="text-[13px] text-ink">{project.role}</dd>
                </div>
                {project.award && (
                  <div className="flex justify-between gap-4">
                    <dt className="shrink-0 text-[13px] text-faint">Copyright</dt>
                    <dd className="text-right text-[13px] text-moss">{project.award}</dd>
                  </div>
                )}
              </dl>

              <div className="mt-7 flex flex-col gap-3 border-t border-rule pt-6">
                {project.repo && (
                  <a
                    href={project.repo}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="group inline-flex items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink"
                  >
                    View code
                    <span className="text-moss transition-transform duration-500 group-hover:translate-x-1">↗</span>
                  </a>
                )}
                {project.live && (
                  <a
                    href={project.live}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="group inline-flex items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink"
                  >
                    Open the original
                    <span className="text-moss transition-transform duration-500 group-hover:translate-x-1">↗</span>
                  </a>
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      <Reveal delay={0.1}>
        <Link
          href={`/work/${next.id}`}
          className="group mt-24 flex items-center justify-between gap-6 border-t border-rule pt-8"
        >
          <span>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
              Next
            </span>
            <span className="mt-2 block font-display text-[clamp(1.4rem,3vw,2.1rem)] text-ink">
              {next.title}
            </span>
          </span>
          <span className="text-moss transition-transform duration-700 [transition-timing-function:var(--ease-out-expo)] group-hover:translate-x-2">
            →
          </span>
        </Link>
      </Reveal>
    </PageShell>
  );
}
