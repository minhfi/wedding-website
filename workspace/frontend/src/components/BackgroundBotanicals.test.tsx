import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BackgroundBotanicals } from "./BackgroundBotanicals";

const HEX = /#[0-9a-f]{3,8}\b/i;

function renderLayer(): HTMLElement {
  const { container } = render(<BackgroundBotanicals />);
  const layer = container.firstElementChild;
  if (!(layer instanceof HTMLElement)) throw new Error("no layer rendered");
  return layer;
}

describe("BackgroundBotanicals", () => {
  it("is a fixed, full-viewport layer behind content that ignores the pointer", () => {
    const layer = renderLayer();

    expect(layer).toHaveAttribute("aria-hidden", "true");
    expect(layer).toHaveClass("pointer-events-none", "fixed", "inset-0", "-z-10", "overflow-hidden");
  });

  it("is very faint", () => {
    expect(renderLayer().className).toMatch(/\bopacity-(1[0-9]|20)\b/);
  });

  it("draws decorative svgs that are hidden from assistive tech", () => {
    const svgs = renderLayer().querySelectorAll("svg");

    expect(svgs.length).toBeGreaterThan(0);
    for (const svg of Array.from(svgs)) {
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(svg).toHaveAttribute("focusable", "false");
    }
  });

  it("uses token colors only (no hex in the markup)", () => {
    const layer = renderLayer();

    expect(layer.outerHTML).not.toMatch(HEX);
    expect(layer.innerHTML).toContain("var(--color-");
  });

  it("shows corner branches only below lg and side-margin branches only from lg", () => {
    const layer = renderLayer();
    const mobile = layer.querySelector('[data-placement="corners"]');
    const desktop = layer.querySelector('[data-placement="margins"]');

    expect(mobile).toHaveClass("xl:hidden");
    expect(mobile).not.toHaveClass("hidden");
    expect(mobile?.querySelectorAll("svg").length).toBeGreaterThan(0);

    expect(desktop).toHaveClass("hidden", "xl:block");
    expect(desktop?.querySelectorAll("svg").length).toBeGreaterThan(0);
  });

  it("keeps mobile branches in the corners (top and bottom edges only)", () => {
    const corners = renderLayer().querySelectorAll('[data-placement="corners"] > svg');

    expect(corners.length).toBe(2);
    expect(corners[0]).toHaveClass("top-0", "right-0");
    expect(corners[1]).toHaveClass("bottom-0", "left-0");
  });
});
