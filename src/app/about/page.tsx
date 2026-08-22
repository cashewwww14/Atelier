import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import Image from "next/image";
import { Reveal } from "@/components/ui/Reveal";
import { profile } from "@/data/profile";

export const metadata: Metadata = {
  title: `About — ${profile.name}`,
  description: profile.tagline,
};

export default function AboutPage() {
  return (
    <PageShell
      eyebrow="About"
      title="Who works here"
      lede={profile.intro.join(" ")}
    >
      <div className="grid gap-16 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
        <div>
          <Reveal>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-7 border-t border-rule pt-8">
              <Fact label="Education" value={profile.education.degree} sub={profile.education.school} />
              <Fact label="GPA" value={profile.education.gpa} sub={profile.education.period} />
              <Fact label="Based in" value={profile.location} sub="Open to remote" />
              <Fact label="Copyright" value={profile.publication.year} sub="Moditium · DJKI" />
            </dl>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="mt-12 rounded-xl bg-moss-wash p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-moss">
                Registered
              </p>
              <p className="mt-3 font-display text-[1.4rem] leading-snug text-ink">
                {profile.publication.title}
              </p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
                {profile.publication.detail}
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.16}>
            <div className="mt-12">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
                Certifications
              </p>
              <ul className="mt-5 space-y-4">
                {profile.certifications.map((c) => (
                  <li key={c.name}>
                    <p className="text-[15px] text-ink">{c.name}</p>
                    <p className="mt-0.5 text-[13px] text-muted">{c.issuer}</p>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>

        <div>
          <Reveal>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
              Track record
            </p>
          </Reveal>

          <ol className="relative mt-8">
            <span
              aria-hidden
              className="absolute left-0 top-2 h-[calc(100%-1rem)] w-px"
              style={{
                background:
                  "linear-gradient(to bottom, var(--color-moss), var(--color-rule) 42%, transparent)",
              }}
            />

            {profile.experience.map((job, i) => (
              <Reveal key={job.org} delay={0.07 * i} as="li" className="relative block pb-12 pl-9 last:pb-0">
                <span
                  aria-hidden
                  className="absolute left-0 top-[0.45rem] h-[7px] w-[7px] -translate-x-[3px] rounded-full"
                  style={{
                    background: i === 0 ? "var(--color-moss)" : "var(--color-edge)",
                    boxShadow: i === 0 ? "0 0 0 5px var(--color-moss-wash)" : "none",
                  }}
                />

                <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                  {/* The logo carries the name, so printing both would say it
                      twice. The heading keeps the text for semantics and
                      screen readers; the mark is what you actually see. */}
                  <h2 className="font-display text-[1.3rem] text-ink">
                    <Image
                      src={job.logo.src}
                      alt={job.org}
                      width={job.logo.w}
                      height={job.logo.h}
                      className="w-auto"
                      style={{ height: job.logo.d, width: "auto" }}
                      // Eager on purpose. These are 2–8KB each, and native
                      // lazy-loading never fired for them in production:
                      // Lenis drives scrolling with a transform on a wrapper,
                      // so the browser never counts them as having entered the
                      // viewport and the request is simply never made.
                      loading="eager"
                    />
                  </h2>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
                    {job.period}
                  </span>
                </div>
                <p className="mt-1 text-[13.5px] text-moss">
                  {job.role} · {job.place}
                </p>

                <ul className="mt-4 space-y-2.5">
                  {job.points.map((point) => (
                    <li
                      key={point}
                      className="relative pl-4 text-[14px] leading-relaxed text-muted before:absolute before:left-0 before:top-[0.62em] before:h-px before:w-2 before:bg-edge"
                    >
                      {point}
                    </li>
                  ))}
                </ul>

                {/* Only Peruri carries one, hence the guard rather than a field
                    every entry has to leave empty. */}
                {"certificate" in job && (
                  <a
                    href={job.certificate.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-rule px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted transition-colors hover:border-moss hover:text-moss"
                  >
                    {job.certificate.label} <span aria-hidden>↗</span>
                  </a>
                )}
              </Reveal>
            ))}
          </ol>

          <Reveal delay={0.2}>
            <div className="mt-4 border-t border-rule pt-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
                Volunteer
              </p>
              <ul className="mt-5 space-y-5">
                {/* Keyed on org *and* period — two of these share an organiser. */}
                {profile.volunteer.map((v) => (
                  <li key={`${v.org}-${v.period}`}>
                    <p className="text-[15px] text-ink">
                      {v.org} <span className="text-faint">· {v.period}</span>
                    </p>
                    <p className="mt-0.5 text-[13px] text-moss">{v.role}</p>
                    <p className="mt-1 max-w-[52ch] text-[13.5px] leading-relaxed text-muted">
                      {v.desc}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={0.26}>
            <div className="mt-10 border-t border-rule pt-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
                Written elsewhere
              </p>
              <ul className="mt-5 space-y-3">
                {profile.posts.map((post) => (
                  <li key={post.url}>
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block rounded-xl border border-rule p-5 transition-colors hover:border-moss"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-moss">
                          {post.org}
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
                          {post.date} · {post.reactions} reactions
                          {"comments" in post ? ` · ${post.comments} comments` : ""}
                        </span>
                      </div>
                      <p className="mt-2 font-display text-[1.15rem] leading-snug text-ink">
                        {post.title}
                      </p>
                      <p className="mt-2 max-w-[58ch] text-[13.5px] leading-relaxed text-muted">
                        {post.excerpt}
                      </p>
                      <span className="mt-3 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-faint transition-colors group-hover:text-moss">
                        Read on LinkedIn <span aria-hidden>↗</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </PageShell>
  );
}

function Fact({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">{label}</dt>
      <dd className="mt-2 text-[15px] text-ink">{value}</dd>
      <dd className="mt-0.5 text-[12.5px] text-muted">{sub}</dd>
    </div>
  );
}
