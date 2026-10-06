import { Bloom, Leaf, type BloomVariant } from "@/components/botanical/Botanicals";

// Faint line-art branches framing the page (spec → Implementation notes → Background botanicals).
// Each branch is a few curved stems drawn here, dressed with leaves and blooms from the botanical kit.

const INK = "var(--color-la-dam)";

type Pt = readonly [number, number];
type Curve = readonly [Pt, Pt, Pt, Pt];
/** Leaf at curve parameter t, on the left (-1) or right (1) of the stem direction, with a size in user units. */
type LeafSpot = readonly [t: number, side: 1 | -1, size: number];
type Tip = { variant: BloomVariant; size: number } | { leaf: number };
type Stem = { curve: Curve; leaves?: readonly LeafSpot[]; tip?: Tip };
type BranchArt = { viewBox: string; stems: readonly Stem[] };

const r1 = (n: number) => Math.round(n * 10) / 10;

function pointOn([a, b, c, d]: Curve, t: number): Pt {
  const u = 1 - t;
  const k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  return [r1(k[0] * a[0] + k[1] * b[0] + k[2] * c[0] + k[3] * d[0]), r1(k[0] * a[1] + k[1] * b[1] + k[2] * c[1] + k[3] * d[1])];
}

/** Direction of travel along the curve at t, in degrees (0 = +x, clockwise as in SVG). */
function angleOn([a, b, c, d]: Curve, t: number): number {
  const u = 1 - t;
  const dx = 3 * u * u * (b[0] - a[0]) + 6 * u * t * (c[0] - b[0]) + 3 * t * t * (d[0] - c[0]);
  const dy = 3 * u * u * (b[1] - a[1]) + 6 * u * t * (c[1] - b[1]) + 3 * t * t * (d[1] - c[1]);
  return r1((Math.atan2(dy, dx) * 180) / Math.PI);
}

// The kit's Leaf grows from (2, 14) towards -45° in its 16-unit box; Bloom grows from (15, 31) towards -90° in 32.
const leafTransform = ([x, y]: Pt, angle: number, size: number) =>
  `translate(${x} ${y}) rotate(${r1(angle + 45)}) translate(${r1((-2 * size) / 16)} ${r1((-14 * size) / 16)})`;
const bloomTransform = ([x, y]: Pt, angle: number, size: number) =>
  `translate(${x} ${y}) rotate(${r1(angle + 90)}) translate(${r1((-15 * size) / 32)} ${r1((-31 * size) / 32)})`;

const LEAF_SPREAD = 42;

function Branch({ art, className }: { art: BranchArt; className: string }) {
  const d = art.stems
    .map(({ curve: [a, b, c, e] }) => `M${a[0]} ${a[1]}C${b[0]} ${b[1]} ${c[0]} ${c[1]} ${e[0]} ${e[1]}`)
    .join("");

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      viewBox={art.viewBox}
      className={className}
      fill="none"
      overflow="visible"
    >
      <path d={d} stroke={INK} strokeWidth={1.2} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {art.stems.map(({ curve, leaves = [], tip }) => {
        const end = curve[3];
        const endAngle = angleOn(curve, 1);
        return (
          <g key={`${curve[0][0]}-${curve[0][1]}-${end[0]}-${end[1]}`}>
            {leaves.map(([t, side, size]) => (
              <g key={t} transform={leafTransform(pointOn(curve, t), angleOn(curve, t) + side * LEAF_SPREAD, size)}>
                <Leaf size={size} />
              </g>
            ))}
            {tip && "leaf" in tip ? (
              <g transform={leafTransform(end, endAngle, tip.leaf)}>
                <Leaf size={tip.leaf} />
              </g>
            ) : null}
            {tip && "variant" in tip ? (
              <g transform={bloomTransform(end, endAngle, tip.size)}>
                <Bloom variant={tip.variant} size={tip.size} />
              </g>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

/* ---------- arrangements ---------- */

const alternate = (from: number, to: number, count: number, size: number, firstSide: 1 | -1 = 1): LeafSpot[] =>
  Array.from({ length: count }, (_, i) => {
    const t = r1((from + ((to - from) * i) / Math.max(count - 1, 1)) * 100) / 100;
    const side: 1 | -1 = i % 2 === 0 ? firstSide : firstSide === 1 ? -1 : 1;
    return [t, side, r1(size * (1 - 0.25 * (i / count)))] as const;
  });

/** Mobile, top-right corner: a branch reaching down-left with a rose, a bud twig and a lace umbel. */
const CORNER_MAIN: Curve = [[250, -12], [206, 26], [158, 46], [104, 100]];
const TOP_CORNER: BranchArt = {
  viewBox: "0 0 240 240",
  stems: [
    { curve: CORNER_MAIN, leaves: alternate(0.18, 0.86, 5, 30), tip: { variant: "rose", size: 54 } },
    {
      curve: [pointOn(CORNER_MAIN, 0.38), [196, 60], [204, 96], [214, 128]],
      leaves: [[0.45, -1, 22]],
      tip: { variant: "bud", size: 34 },
    },
    {
      curve: [pointOn(CORNER_MAIN, 0.62), [150, 46], [128, 30], [104, 26]],
      leaves: [[0.5, 1, 20]],
      tip: { variant: "lace", size: 40 },
    },
  ],
};

/** Mobile, bottom-left corner: a lower, leafier branch rising up-right with one lace umbel. */
const BOTTOM_MAIN: Curve = [[-12, 236], [30, 200], [70, 186], [128, 150]];
const BOTTOM_CORNER: BranchArt = {
  viewBox: "0 0 220 220",
  stems: [
    { curve: BOTTOM_MAIN, leaves: alternate(0.2, 0.85, 5, 28, -1), tip: { variant: "lace", size: 46 } },
    {
      curve: [pointOn(BOTTOM_MAIN, 0.45), [52, 170], [48, 140], [56, 112]],
      leaves: [[0.5, 1, 20]],
      tip: { leaf: 24 },
    },
  ],
};

/** Desktop, left edge: a tall climbing branch with a rose at the top, a lace umbel and a bud. */
const LEFT_MAIN: Curve = [[18, 920], [74, 700], [8, 520], [70, 300]];
const LEFT_EDGE: BranchArt = {
  viewBox: "0 0 240 900",
  stems: [
    { curve: LEFT_MAIN, leaves: alternate(0.08, 0.9, 9, 44), tip: { variant: "rose", size: 84 } },
    {
      curve: [pointOn(LEFT_MAIN, 0.42), [90, 560], [122, 530], [134, 456]],
      leaves: alternate(0.3, 0.75, 2, 30),
      tip: { variant: "lace", size: 60 },
    },
    {
      curve: [pointOn(LEFT_MAIN, 0.7), [14, 400], [4, 370], [14, 322]],
      tip: { variant: "bud", size: 44 },
    },
    {
      curve: [pointOn(LEFT_MAIN, 0.16), [90, 764], [118, 750], [138, 724]],
      leaves: alternate(0.35, 0.8, 2, 28, -1),
      tip: { leaf: 34 },
    },
  ],
};

/** Desktop, right edge: a shorter branch than the left (asymmetric), ending in a lace umbel with a rose twig. */
const RIGHT_MAIN: Curve = [[214, 920], [168, 780], [222, 660], [160, 500]];
const RIGHT_EDGE: BranchArt = {
  viewBox: "0 0 240 900",
  stems: [
    { curve: RIGHT_MAIN, leaves: alternate(0.1, 0.88, 7, 42, -1), tip: { variant: "lace", size: 72 } },
    {
      curve: [pointOn(RIGHT_MAIN, 0.5), [176, 650], [130, 640], [104, 600]],
      leaves: [[0.5, 1, 28]],
      tip: { variant: "rose", size: 62 },
    },
    {
      curve: [pointOn(RIGHT_MAIN, 0.22), [236, 800], [238, 760], [232, 726]],
      tip: { variant: "bud", size: 36 },
    },
  ],
};

/** Desktop, top-right corner: a small hanging sprig. */
const CLUSTER_MAIN: Curve = [[250, -10], [214, 30], [196, 70], [170, 112]];
const TOP_CLUSTER: BranchArt = {
  viewBox: "0 0 240 240",
  stems: [
    { curve: CLUSTER_MAIN, leaves: alternate(0.2, 0.8, 4, 28), tip: { variant: "bud", size: 40 } },
    {
      curve: [pointOn(CLUSTER_MAIN, 0.45), [196, 40], [170, 30], [146, 34]],
      leaves: [[0.5, -1, 20]],
      tip: { variant: "lace", size: 38 },
    },
  ],
};

export function BackgroundBotanicals() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden opacity-15">
      <div data-placement="corners" className="xl:hidden">
        <Branch art={TOP_CORNER} className="absolute top-0 right-0 size-64" />
        <Branch art={BOTTOM_CORNER} className="absolute bottom-0 left-0 size-56" />
      </div>
      <div data-placement="margins" className="hidden xl:block">
        <Branch art={LEFT_EDGE} className="absolute bottom-0 left-0 h-full w-auto" />
        <Branch art={RIGHT_EDGE} className="absolute right-0 bottom-0 h-full w-auto" />
        <Branch art={TOP_CLUSTER} className="absolute top-0 right-0 size-60" />
      </div>
    </div>
  );
}
