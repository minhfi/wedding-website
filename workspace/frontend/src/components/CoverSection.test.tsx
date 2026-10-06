import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { siteConfig } from "@/config/site";
import { CoverSection } from "./CoverSection";

describe("CoverSection", () => {
  it("shows the decorative bouquet and no photo while there is no cover photo", () => {
    const { container } = render(<CoverSection src={null} />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("uses the bouquet by default because the site has no cover photo yet", () => {
    const { container } = render(<CoverSection />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("shows the photo with its Vietnamese alt text inside the arch when a src is set", () => {
    const { container } = render(<CoverSection src="/cover.jpg" />);

    expect(
      screen.getByRole("img", { name: siteConfig.cover.alt }),
    ).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeInTheDocument();
  });
});
