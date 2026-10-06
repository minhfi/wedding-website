import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { siteConfig } from "@/config/site";
import { GiftQrSection } from "./GiftQrSection";
import { PartyInfoSection } from "./PartyInfoSection";

describe("PartyInfoSection", () => {
  it("renders a labelled section with the party heading", () => {
    render(<PartyInfoSection />);

    expect(
      screen.getByRole("region", { name: "Tiệc cưới" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Tiệc cưới" }),
    ).toBeInTheDocument();
  });

  it("shows the time, venue name and address", () => {
    render(<PartyInfoSection />);

    expect(screen.getByText(/14:00/)).toBeInTheDocument();
    expect(screen.getByText(siteConfig.venue.name)).toBeInTheDocument();
    expect(screen.getByText(siteConfig.venue.address)).toBeInTheDocument();
  });

  it("embeds a lazy-loaded Google Maps iframe for the venue address", () => {
    render(<PartyInfoSection />);

    const map = screen.getByTitle(`Bản đồ đến ${siteConfig.venue.name}`);
    expect(map.tagName).toBe("IFRAME");
    expect(map).toHaveAttribute(
      "src",
      `https://www.google.com/maps?q=${encodeURIComponent(siteConfig.venue.address)}&output=embed`,
    );
    expect(map).toHaveAttribute("loading", "lazy");
  });

  it("links to the venue on Google Maps in a new tab", () => {
    render(<PartyInfoSection />);

    // jsdom trims the sr-only span's leading space; browsers keep it.
    const link = screen.getByRole("link", {
      name: /^Mở bản đồ ?\(mở trong ứng dụng bản đồ\)$/,
    });
    expect(link).toHaveTextContent(/^Mở bản đồ/);
    expect(link).toHaveAttribute("href", siteConfig.venue.mapsUrl);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});

describe("GiftQrSection", () => {
  it("renders a labelled section with the gift heading", () => {
    render(<GiftQrSection />);

    expect(
      screen.getByRole("region", { name: "Mừng cưới" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Mừng cưới" }),
    ).toBeInTheDocument();
  });

  it("shows exactly one QR image with its alt text", () => {
    render(<GiftQrSection />);

    const section = screen.getByRole("region", { name: "Mừng cưới" });
    const images = within(section).getAllByRole("img");
    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAccessibleName(siteConfig.qr.alt);
  });

  it("shows the account holder and bank name", () => {
    render(<GiftQrSection />);

    expect(screen.getByText(siteConfig.qr.accountHolder)).toBeInTheDocument();
    expect(screen.getByText(siteConfig.qr.bankName)).toBeInTheDocument();
  });
});
