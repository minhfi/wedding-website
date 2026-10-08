import { describe, expect, it } from "vitest";
import { siteConfig } from "./site";

describe("siteConfig", () => {
  it("has the exact solar and lunar date text", () => {
    expect(siteConfig.dateText).toBe("Chủ nhật, 17.01.2027");
    expect(siteConfig.lunarText).toBe("Nhằm ngày 10 tháng Chạp năm Bính Ngọ");
    expect(siteConfig.timeText).toBe("14:00");
  });

  it("has the event instant at 14:00 UTC+7 on 17 Jan 2027", () => {
    expect(Date.parse(siteConfig.eventAt)).toBe(Date.UTC(2027, 0, 17, 7, 0, 0));
  });

  it("has the couple names", () => {
    expect(siteConfig.groom).toEqual({
      fullName: "Nguyễn Minh Phi",
      shortName: "Minh Phi",
    });
    expect(siteConfig.bride).toEqual({
      fullName: "Trần Thị Mỹ Ngân",
      shortName: "Mỹ Ngân",
    });
  });

  it("builds the maps URL from the encoded venue address", () => {
    expect(siteConfig.venue.mapsUrl).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(siteConfig.venue.address)}`,
    );
  });

  it("has no cover photo yet (the arch shows the bouquet) and points to the QR image", () => {
    expect(siteConfig.cover.src).toBeNull();
    expect(siteConfig.cover.alt).not.toBe("");
    expect(siteConfig.qr.src).toBe("/qr.png");
  });

  it("embeds the wedding film from its Google Drive preview URL", () => {
    expect(siteConfig.video.title).toBe("Chuyện của chúng mình");
    expect(siteConfig.video.embedUrl).toBe(
      "https://drive.google.com/file/d/13Kdgk5WeoSGdL8nijg1mxYBJNxNIf6Fm/preview",
    );
    expect(siteConfig.video.watchUrl).toBe(
      "https://drive.google.com/file/d/13Kdgk5WeoSGdL8nijg1mxYBJNxNIf6Fm/view",
    );
  });
});
