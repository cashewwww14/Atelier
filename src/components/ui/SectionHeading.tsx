export function SectionHeading({ index, title }: { index: string; title: string }) {
  return (
    <div className="flex items-baseline gap-5">
      <span className="font-mono text-[11px] tracking-[0.28em] text-amber/70">{index}</span>
      <h2 className="font-display text-[clamp(2rem,5.5vw,3.6rem)] leading-[0.98] text-cream">
        {title}
      </h2>
    </div>
  );
}
