import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import {
  Bloom,
  Bouquet,
  CornerSprig,
  Leaf,
  LeafSprig,
  type BloomVariant,
} from "./Botanicals";

const HEX = /#[0-9a-f]{3,8}\b/i;

function renderSvg(element: ReactElement): SVGSVGElement {
  const { container } = render(element);
  const svg = container.querySelector("svg");
  if (!svg) throw new Error("no svg rendered");
  return svg;
}

const components: Array<[string, () => ReactElement]> = [
  ["Bloom", () => <Bloom variant="rose" className="test-class" />],
  ["Leaf", () => <Leaf className="test-class" />],
  ["LeafSprig", () => <LeafSprig className="test-class" />],
  ["CornerSprig", () => <CornerSprig className="test-class" />],
  ["Bouquet", () => <Bouquet className="test-class" />],
];

describe("botanical kit", () => {
  it.each(components)("%s is a decorative svg hidden from assistive tech", (_, make) => {
    const svg = renderSvg(make());

    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
    expect(svg.querySelector("title")).toBeNull();
  });

  it.each(components)("%s passes className through", (_, make) => {
    expect(renderSvg(make())).toHaveClass("test-class");
  });

  it.each(components)("%s uses token colors only (no hex fill/stroke)", (_, make) => {
    const svg = renderSvg(make());
    const painted = [svg, ...Array.from(svg.querySelectorAll("*"))];

    for (const node of painted) {
      for (const attr of ["fill", "stroke", "style"]) {
        expect(node.getAttribute(attr) ?? "").not.toMatch(HEX);
      }
    }
    expect(painted.some((node) => node.getAttribute("stroke")?.startsWith("var(--color-"))).toBe(true);
  });

  it("Bloom renders distinct markup per variant", () => {
    const variants: BloomVariant[] = ["rose", "tulip", "lace", "bud"];
    const markup = variants.map((variant) => renderSvg(<Bloom variant={variant} />).innerHTML);

    expect(new Set(markup).size).toBe(variants.length);
  });

  it("Bloom defaults to a 28px box with a 32-unit viewBox", () => {
    const svg = renderSvg(<Bloom variant="tulip" />);

    expect(svg).toHaveAttribute("width", "28");
    expect(svg).toHaveAttribute("height", "28");
    expect(svg).toHaveAttribute("viewBox", "0 0 32 32");
  });

  it("size prop sets width and height", () => {
    const bloom = renderSvg(<Bloom variant="lace" size={40} />);
    expect(bloom).toHaveAttribute("width", "40");
    expect(bloom).toHaveAttribute("height", "40");

    const leaf = renderSvg(<Leaf size={20} />);
    expect(leaf).toHaveAttribute("width", "20");
    expect(leaf).toHaveAttribute("height", "20");
  });

  it("sprigs and bouquet keep their native proportions", () => {
    expect(renderSvg(<LeafSprig />)).toHaveAttribute("viewBox", "0 0 72 18");
    expect(renderSvg(<CornerSprig />)).toHaveAttribute("viewBox", "0 0 72 72");
    expect(renderSvg(<Bouquet />)).toHaveAttribute("viewBox", "0 0 320 300");
  });
});
