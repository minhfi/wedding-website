import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { BloomVariant } from "./botanical/Botanicals";
import { SectionFrame } from "./SectionFrame";

function renderFrame(props: { id?: string; bloom?: BloomVariant } = {}) {
  return render(
    <SectionFrame id={props.id} headingId="test-heading" title="Tiêu đề" bloom={props.bloom ?? "rose"}>
      <p>Nội dung</p>
    </SectionFrame>,
  );
}

describe("SectionFrame", () => {
  it("renders a region named by its heading", () => {
    renderFrame();

    const region = screen.getByRole("region", { name: "Tiêu đề" });
    expect(region.tagName).toBe("SECTION");
    expect(region).toHaveAttribute("aria-labelledby", "test-heading");
    expect(screen.getByRole("heading", { level: 2, name: "Tiêu đề" })).toHaveAttribute(
      "id",
      "test-heading",
    );
  });

  it("renders its children inside the region", () => {
    renderFrame();

    const region = screen.getByRole("region", { name: "Tiêu đề" });
    expect(within(region).getByText("Nội dung")).toBeInTheDocument();
  });

  it("passes the id through to the section", () => {
    renderFrame({ id: "bus" });

    expect(screen.getByRole("region", { name: "Tiêu đề" })).toHaveAttribute("id", "bus");
  });

  it("omits the id when none is given", () => {
    renderFrame();

    expect(screen.getByRole("region", { name: "Tiêu đề" })).not.toHaveAttribute("id");
  });

  it.each<BloomVariant>(["rose", "tulip", "lace", "bud"])(
    "draws the %s bloom on the heading, hidden from assistive tech",
    (bloom) => {
      renderFrame({ bloom });

      const heading = screen.getByRole("heading", { level: 2, name: "Tiêu đề" });
      const svg = heading.querySelector("svg");
      expect(svg).not.toBeNull();
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(heading).toHaveAccessibleName("Tiêu đề");
    },
  );

  it("keeps the stem and its leaves decorative", () => {
    const { container } = renderFrame();

    const section = container.querySelector("section");
    const decor = Array.from(section?.children ?? []).filter(
      (el) => el.getAttribute("aria-hidden") === "true",
    );
    expect(decor.length).toBeGreaterThan(0);
    for (const el of section?.querySelectorAll("svg") ?? []) {
      expect(el).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("grows its stem segment from the top only when motion is allowed", () => {
    const { container } = renderFrame();

    const stem = container.querySelector("section > span[aria-hidden='true']");
    expect(stem).toHaveClass("origin-top", "motion-safe:animate-stem-grow");
  });

  it("fades its leaves and bloom in only when motion is allowed", () => {
    const { container } = renderFrame();

    const svgs = container.querySelectorAll("section svg");
    expect(svgs.length).toBeGreaterThan(0);
    for (const svg of svgs) {
      expect(svg).toHaveClass("motion-safe:animate-stem-fade");
    }
  });

  it("renders a static stem, leaves and bloom when animate is false", () => {
    const { container } = render(
      <SectionFrame headingId="h" title="Xe khách" bloom="tulip" animate={false}>
        <p>nội dung</p>
      </SectionFrame>,
    );

    expect(container.innerHTML).not.toMatch(/animate-stem/);
  });
});
