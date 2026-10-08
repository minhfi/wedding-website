import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { siteConfig } from "@/config/site";
import { VideoSection } from "./VideoSection";

describe("VideoSection", () => {
  it("is a labelled section titled 'Chuyện của chúng mình'", () => {
    render(<VideoSection />);

    const region = screen.getByRole("region", { name: "Chuyện của chúng mình" });
    expect(within(region).getByRole("heading", { level: 2 })).toHaveTextContent(
      "Chuyện của chúng mình",
    );
  });

  it("embeds the configured film in a lazy, full-screen-capable 16:9 frame", () => {
    const { container } = render(<VideoSection />);

    const iframe = container.querySelector("iframe");
    expect(iframe).toHaveAttribute("src", siteConfig.video.embedUrl);
    expect(iframe).toHaveAttribute("title", "Phim cưới của Mỹ Ngân và Minh Phi");
    expect(iframe).toHaveAttribute("loading", "lazy");
    expect(iframe).toHaveAttribute("allowfullscreen");
    expect(iframe?.getAttribute("allow")).toContain("fullscreen");
    expect(iframe).toHaveClass("aspect-video", "w-full", "rounded-control", "border-nu");
  });

  it("offers a fallback link that opens the film in a new tab", () => {
    render(<VideoSection />);

    const link = screen.getByRole("link", { name: /Xem video trên Google Drive/ });
    expect(link).toHaveAttribute("href", siteConfig.video.watchUrl);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
