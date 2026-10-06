import type { ReactNode, SVGProps } from "react";

// Decorative botanical line art drawn from the owner's bridal bouquet.
// Colors come only from design tokens; every svg is hidden from assistive tech.

const INK = "var(--color-la-dam)";
const PETAL = "var(--color-canh-hoa)";
const BUD = "var(--color-nu)";
const LEAF = "var(--color-la-non)";
const RIBBON = "var(--color-da)";

export type BloomVariant = "rose" | "tulip" | "lace" | "bud";

type SvgFrameProps = {
  width: number;
  height: number;
  viewBox: string;
  className?: string;
  children: ReactNode;
};

function SvgFrame({ width, height, viewBox, className, children }: SvgFrameProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      width={width}
      height={height}
      viewBox={viewBox}
      className={className}
      fill="none"
      stroke={INK}
      strokeWidth={1.1}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

function P(props: SVGProps<SVGPathElement>) {
  return <path vectorEffect="non-scaling-stroke" {...props} />;
}

function Dot(props: SVGProps<SVGCircleElement>) {
  return <circle vectorEffect="non-scaling-stroke" fill={PETAL} {...props} />;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Maps the 32-unit bloom box onto a point: anchor (16, ay) lands on (x, y). */
const at = (x: number, y: number, s: number, rot = 0, ay = 16) =>
  `translate(${x} ${y}) rotate(${rot}) scale(${s}) translate(-16 -${ay})`;

/* ---------- flower heads (32-unit box) ---------- */

function RoseHead() {
  return (
    <g>
      <P
        fill={PETAL}
        d="M5 16C4 11 7 7 11 7C13 4.5 19 4.5 21 7C25 7 28 11 27 16C27.5 21 24 25 20 25.5C18 27.5 14 27.5 12 25.5C8 25 4.5 21 5 16Z"
      />
      <P d="M9 14C10 10 13.5 8.8 16 9.4C19 8.8 22.5 11 23 14.5M11 7C11.8 8.4 12 9.6 11.8 10.6M21 7C20.2 8.2 19.8 9.4 19.9 10.4" />
      <P d="M12 16C12 18.2 14 19.5 16 19.3C18.5 19 20.5 17.3 20.3 14.5" />
      <P d="M13.5 14C14 11.8 17.5 11.5 18.5 13.5C19.3 15.2 17.8 16.8 16 16.3C14.8 16 14.6 14.6 15.6 14.1" />
      <P fill={PETAL} d="M6.4 16.6C7.2 21.8 11.2 25.2 16.4 25C14.2 23 13.2 21 13.4 18.8C10.8 18.9 8.4 18.1 6.4 16.6Z" />
      <P fill={PETAL} d="M25.6 16.2C25.2 21.4 21.4 24.9 16.4 25C18.8 23.2 19.8 21 19.6 18.7C21.9 18.7 24 17.6 25.6 16.2Z" />
    </g>
  );
}

function TulipHead() {
  return (
    <g>
      <P fill={PETAL} d="M16 25C10 25 8 19 9 8C12 9 15 12 16 16Z" />
      <P fill={PETAL} d="M16 25C22 25 24 19 23 8C20 9 17 12 16 16Z" />
      <P
        fill={PETAL}
        d="M16 25C12.2 24.4 11.2 18.5 12 12.5C12.8 9.5 14.6 7 16 5C17.4 7 19.2 9.5 20 12.5C20.8 18.5 19.8 24.4 16 25Z"
      />
      <P d="M16 9.5C15.6 14 15.7 19 16 22.5" />
    </g>
  );
}

const UMBEL = [-160, -133, -110, -90, -70, -47, -20].map((deg) => {
  const a = (deg * Math.PI) / 180;
  return { x: r1(16 + 12 * Math.cos(a)), y: r1(25 + 12 * Math.sin(a)) };
});
const FLORET = [0, 72, 144, 216, 288].map((deg) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return { dx: r1(1.7 * Math.cos(a)), dy: r1(1.7 * Math.sin(a)) };
});

function LaceHead() {
  return (
    <g>
      <P
        d={UMBEL.map(
          (p) => `M16 25L${p.x} ${p.y}${FLORET.map((f) => `M${p.x} ${p.y}l${r1(f.dx * 0.6)} ${r1(f.dy * 0.6)}`).join("")}`,
        ).join("")}
      />
      {UMBEL.map((p) => (
        <g key={`${p.x}-${p.y}`}>
          {FLORET.map((f) => (
            <Dot key={`${f.dx}-${f.dy}`} cx={r1(p.x + f.dx)} cy={r1(p.y + f.dy)} r={0.75} />
          ))}
        </g>
      ))}
    </g>
  );
}

function BudHead() {
  return (
    <g>
      <P fill={BUD} d="M16 6C20 10 21.2 15 19.4 19C18.4 21 13.6 21 12.6 19C10.8 15 12 10 16 6Z" />
      <P d="M16 7.5C14.8 11 14.8 16 16 20.4" />
      <P fill={BUD} d="M16 22C14 20.4 12 19.6 10.4 20C11.6 21.8 13.8 22.6 16 22Z" />
      <P fill={BUD} d="M16 22C18 20.4 20 19.6 21.6 20C20.4 21.8 18.2 22.6 16 22Z" />
    </g>
  );
}

const RUFFLE = (r: number, n: number, amp: number) => {
  const pt = (a: number, rr: number) =>
    `${r1(16 + rr * Math.cos(a))} ${r1(16 + rr * Math.sin(a))}`;
  const step = (2 * Math.PI) / n;
  const arcs = Array.from({ length: n }, (_, i) =>
    `Q${pt((i + 0.5) * step, r + amp * (i % 2 ? 1 : 0.55))} ${pt((i + 1) * step, r)}`,
  );
  return `M${pt(0, r)}${arcs.join("")}Z`;
};
const CARNATION = [RUFFLE(10.5, 17, 2.2), RUFFLE(7.2, 12, 1.9), RUFFLE(3.8, 8, 1.5)];

function CarnationHead() {
  return (
    <g>
      {CARNATION.map((d) => (
        <P key={d} fill={PETAL} d={d} />
      ))}
    </g>
  );
}

const STAR = [0, 72, 144, 216, 288];

function StarFlower({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {STAR.map((deg) => (
        <P key={deg} transform={`rotate(${deg})`} fill={PETAL} d="M0 0C-1.6 -1.6 -1.3 -3.6 0 -4.4C1.3 -3.6 1.6 -1.6 0 0Z" />
      ))}
    </g>
  );
}

/* ---------- leaves ---------- */

/** Lanceolate leaf 10 units long along +x from the origin, gently curved. */
function LeafShape({ transform, fill = LEAF }: { transform: string; fill?: string }) {
  return (
    <g transform={transform}>
      <P fill={fill} d="M0 0C2.5 -3 6.5 -3.6 10 -1.6C7 1.4 3 2 0 0Z" />
      <P d="M0.4 0C3.6 -0.6 6.6 -1 9.6 -1.6" />
    </g>
  );
}

const leafAt = (x: number, y: number, rot: number, s = 1) =>
  `translate(${x} ${y}) rotate(${rot}) scale(${s})`;

/* ---------- exported components ---------- */

type DecorProps = { className?: string; size?: number };

const BLOOMS: Record<BloomVariant, ReactNode> = {
  rose: (
    <>
      <P d="M16 26.5C16 28.5 15.6 30 15 31" />
      <LeafShape transform={leafAt(15.6, 29, -160, 0.8)} />
      <RoseHead />
    </>
  ),
  tulip: (
    <>
      <P d="M16 24.5C16 27 15.6 29.5 15 31" />
      <LeafShape transform={leafAt(15.4, 30, -40, 0.85)} />
      <TulipHead />
    </>
  ),
  lace: (
    <>
      <P d="M16 25C16 27.5 15.6 29.5 15 31" />
      <LaceHead />
    </>
  ),
  bud: (
    <>
      <P d="M16 22C16 25 15.4 28.5 14.6 31" />
      <LeafShape transform={leafAt(15.3, 27.5, -30, 0.8)} />
      <BudHead />
    </>
  ),
};

export function Bloom({ variant, size = 28, className }: DecorProps & { variant: BloomVariant }) {
  return (
    <SvgFrame width={size} height={size} viewBox="0 0 32 32" className={className}>
      {BLOOMS[variant]}
    </SvgFrame>
  );
}

export function Leaf({ size = 14, className }: DecorProps) {
  return (
    <SvgFrame width={size} height={size} viewBox="0 0 16 16" className={className}>
      <LeafShape transform="translate(2 14) rotate(-45) scale(1.6)" />
    </SvgFrame>
  );
}

export function LeafSprig({ className }: { className?: string }) {
  return (
    <SvgFrame width={72} height={18} viewBox="0 0 72 18" className={className}>
      <P d="M2 11C18 7 40 7 64 9" />
      <LeafShape transform={leafAt(12, 9.2, -40, 0.8)} />
      <LeafShape transform={leafAt(20, 8.2, 30, 0.8)} />
      <LeafShape transform={leafAt(32, 7.8, -35, 0.85)} />
      <LeafShape transform={leafAt(42, 7.8, 28, 0.85)} />
      <LeafShape transform={leafAt(52, 8.2, -30, 0.8)} />
      <g transform={at(66, 9, 0.42, 90, 22)}>
        <BudHead />
      </g>
    </SvgFrame>
  );
}

export function CornerSprig({ className }: { className?: string }) {
  return (
    <SvgFrame width={72} height={72} viewBox="0 0 72 72" className={className}>
      <P d="M70 70C58 60 44 46 26 28M50 52C50 44 52 38 56 34" />
      <LeafShape transform={leafAt(60, 61, -100, 1.3)} />
      <LeafShape transform={leafAt(45, 46, 170, 1.3)} />
      <LeafShape transform={leafAt(38, 38, -95, 1.2)} />
      <g transform={at(56, 34, 0.45, 40, 22)}>
        <BudHead />
      </g>
      <g transform={at(22, 24, 0.9, -20)}>
        <RoseHead />
      </g>
    </SvgFrame>
  );
}

/* ---------- bouquet ---------- */

const STEM_TOPS: Array<[number, number]> = [
  [160, 150], [112, 180], [210, 180], [126, 114], [196, 106], [80, 142], [242, 136],
  [58, 192], [268, 196], [160, 82], [160, 214],
];

const STEMS = STEM_TOPS.map(
  ([x, y], i) => `M${x} ${y}Q${r1((x + 160) / 2)} ${r1(y + (238 - y) * 0.7)} ${152 + i * 1.6} 238`,
).join("");

const plume = (x0: number, y0: number, x1: number, y1: number) =>
  Array.from({ length: 8 }, (_, i) => {
    const t = i / 7;
    const x = r1(x0 + (x1 - x0) * t);
    const y = r1(y0 + (y1 - y0) * t);
    return `M${x} ${y}l-${r1(6 - 3 * t)} -${r1(4 - t)}M${x} ${y}l${r1(5 - 2 * t)} -${r1(6 - 2 * t)}`;
  }).join("");
const GRASS = `M150 238C126 170 104 100 80 20M170 238C196 170 226 90 246 26${plume(100, 82, 81, 24)}${plume(222, 92, 245, 30)}`;

const SPRIG_LEAVES: Array<[number, number, number]> = [
  [236, 176, -95], [244, 164, 0], [254, 150, -100], [262, 138, -5],
  [272, 124, -105], [280, 112, -15], [288, 98, -110], [294, 86, -20],
];

export function Bouquet({ className }: { className?: string }) {
  return (
    <SvgFrame width={320} height={300} viewBox="0 0 320 300" className={className}>
      <P d={`${STEMS}${GRASS}M172 238C210 190 250 130 300 72`} />
      {SPRIG_LEAVES.map(([x, y, rot]) => (
        <LeafShape key={`${x}-${y}`} transform={leafAt(x, y, rot, 0.9)} />
      ))}
      <LeafShape transform={leafAt(130, 222, 200, 2.8)} />
      <LeafShape transform={leafAt(190, 222, -20, 2.8)} />
      <LeafShape transform={leafAt(92, 204, 205, 2.5)} />
      <LeafShape transform={leafAt(228, 206, -25, 2.5)} />
      <LeafShape transform={leafAt(84, 172, 192, 2.2)} fill={BUD} />
      <LeafShape transform={leafAt(238, 172, -12, 2.2)} fill={BUD} />
      <LeafShape transform={leafAt(150, 230, 235, 2)} fill={BUD} />
      <LeafShape transform={leafAt(172, 230, -55, 1.9)} />
      <g transform={at(80, 142, 2, -22, 25)}><LaceHead /></g>
      <g transform={at(242, 136, 1.8, 20, 25)}><LaceHead /></g>
      <g transform={at(58, 192, 1.3, -50, 22)}><BudHead /></g>
      <g transform={at(268, 196, 1.3, 50, 22)}><BudHead /></g>
      <g transform={at(160, 82, 1.3, 2, 22)}><BudHead /></g>
      <g transform={at(126, 114, 2.1, -14, 25)}><TulipHead /></g>
      <g transform={at(196, 106, 1.9, 12, 25)}><TulipHead /></g>
      <g transform={`${at(112, 160, 2.4)} scale(-1 1) translate(-32 0)`}><RoseHead /></g>
      <g transform={at(210, 160, 2.4, 8)}><RoseHead /></g>
      <g transform={at(160, 200, 2.1)}><CarnationHead /></g>
      <g transform={at(160, 128, 2.7, -4)}><RoseHead /></g>
      <StarFlower x={132} y={190} />
      <StarFlower x={190} y={186} />
      <StarFlower x={94} y={116} />
      <StarFlower x={228} y={104} />
      <StarFlower x={110} y={210} />
      <P
        fill={PETAL}
        stroke={RIBBON}
        d="M145 236C152 239.5 168 239.5 175 236L171 270C165 273 155 273 149 270ZM147 252C155 255 165 255 173 252"
      />
      <P stroke={RIBBON} d="M160 262C155 274 149 282 141 290M160 262C166 274 172 282 181 289" />
      <P d="M151 271L148 294M157 272L156 296M163 272L164 296M169 271L172 294" />
    </SvgFrame>
  );
}
