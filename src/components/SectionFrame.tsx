import type { ReactNode } from "react";
import { Bloom, Leaf, type BloomVariant } from "./botanical/Botanicals";

type LeafPlacement = { className: string };

// Leaves grow from the stem line. "Right" leaves sit with their base on the stem; "left" ones are
// mirrored so their base also touches it. Positions and tilt differ per bloom so stacked sections
// don't look stamped. Class strings are literal so Tailwind can see them.
const RIGHT = "left-gutter";
const LEFT = "left-gutter -translate-x-full -scale-x-100";

const LEAVES: Record<BloomVariant, LeafPlacement[]> = {
  rose: [
    { className: `${LEFT} top-28 rotate-6` },
    { className: `${RIGHT} top-2/3 -rotate-12` },
  ],
  tulip: [{ className: `${RIGHT} top-24 rotate-12` }],
  lace: [
    { className: `${RIGHT} top-32 -rotate-6` },
    { className: `${LEFT} top-3/4 rotate-12` },
  ],
  bud: [{ className: `${LEFT} top-24 -rotate-12` }],
};

type SectionFrameProps = {
  id?: string;
  headingId: string;
  title: string;
  bloom: BloomVariant;
  children: ReactNode;
  className?: string;
  /** Play the stem draw-on. Off for content that replaces an already-animated placeholder. */
  animate?: boolean;
};

/** Page section on the leafy stem: a full-height stem segment, a few leaves, and a bloom on the heading. */
export function SectionFrame({
  id,
  headingId,
  title,
  bloom,
  children,
  className,
  animate = true,
}: SectionFrameProps) {
  const grow = animate ? " motion-safe:animate-stem-grow" : "";
  const fade = animate ? " motion-safe:animate-stem-fade" : "";

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={`relative py-12 pr-gutter pl-stem${className ? ` ${className}` : ""}`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-gutter w-px origin-top bg-la-non${grow}`}
      />
      {LEAVES[bloom].map((leaf) => (
        <Leaf key={leaf.className} className={`pointer-events-none absolute${fade} ${leaf.className}`} />
      ))}
      <h2 id={headingId} className="relative font-serif text-heading font-light">
        <Bloom
          variant={bloom}
          size={30}
          className={`absolute top-1/2 -left-bud -translate-x-1/2 -translate-y-1/2${fade}`}
        />
        {title}
      </h2>
      {children}
    </section>
  );
}
