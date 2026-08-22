import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { Reveal } from "@/components/ui/Reveal";
import { profile } from "@/data/profile";

export const metadata: Metadata = {
  title: `Craft — ${profile.name}`,
  description: "The tools that actually get picked up, and how often.",
};

export default function CraftPage() {
  return (
    <PageShell
      eyebrow="Craft"
      title="What he works with"
      lede="The rule under each name shows how often that tool actually comes off the wall — not how good it looks on a CV."
    >
      <div className="grid gap-x-14 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
        {profile.stack.map((group, gi) => (
          <Reveal key={group.group} delay={0.06 * gi}>
            <div>
              <h2 className="border-b border-rule pb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-moss">
                {group.group}
              </h2>

              <ul className="mt-7 space-y-6">
                {group.items.map((item) => (
                  <li key={item.name}>
                    <p className="text-[15px] text-ink">{item.name}</p>
                    <p className="mt-1 text-[12px] text-faint">{item.note}</p>
                    <div className="mt-2.5 h-[3px] w-full rounded-full bg-shell">
                      <div
                        className="h-full rounded-full bg-moss"
                        style={{ width: `${item.weight * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        ))}
      </div>
    </PageShell>
  );
}
