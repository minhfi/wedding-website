import { act, render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { siteConfig } from "@/config/site";
import { Countdown } from "./Countdown";

const TARGET_ISO = "2027-01-17T14:00:00+07:00";
const TARGET_MS = Date.parse(TARGET_ISO);

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const ARRIVED = "Ngày vui đã đến";

function getTimer(): HTMLElement {
  return screen.getByTestId("countdown");
}

/** Number shown in the box whose label is `label` (e.g. "ngày"). */
function boxValue(label: string): string {
  const box = screen.getByText(label).closest("[data-unit]");
  if (!(box instanceof HTMLElement)) {
    throw new Error(`no box for ${label}`);
  }
  return within(box).getByTestId("value").textContent ?? "";
}

function renderAt(nowMs: number) {
  vi.setSystemTime(nowMs);
  return render(<Countdown targetIso={TARGET_ISO} />);
}

describe("Countdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("server-renders four placeholder boxes without reading the time", () => {
    vi.setSystemTime(TARGET_MS - DAY);
    const html = renderToString(<Countdown targetIso={TARGET_ISO} />);

    expect(html).toContain("ngày");
    expect(html).toContain("giây");
    expect(html.match(/data-unit=/g)).toHaveLength(4);
    expect(html).toContain("–");
    expect(html).not.toMatch(/>\d+</);
  });

  it("shows days, hours, minutes and seconds in labelled boxes after mount", () => {
    renderAt(TARGET_MS - (3 * DAY + 4 * HOUR + 5 * MINUTE + 6 * SECOND));

    expect(boxValue("ngày")).toBe("3");
    expect(boxValue("giờ")).toBe("04");
    expect(boxValue("phút")).toBe("05");
    expect(boxValue("giây")).toBe("06");
  });

  it("ticks every second and rolls minutes over", () => {
    renderAt(TARGET_MS - (1 * DAY + 2 * HOUR + 3 * MINUTE + 1 * SECOND));
    expect(boxValue("giây")).toBe("01");

    act(() => {
      vi.advanceTimersByTime(SECOND);
    });
    expect(boxValue("giây")).toBe("00");
    expect(boxValue("phút")).toBe("03");

    act(() => {
      vi.advanceTimersByTime(SECOND);
    });
    expect(boxValue("giây")).toBe("59");
    expect(boxValue("phút")).toBe("02");
  });

  it("exposes a timer with a full Vietnamese label and no per-second announcements", () => {
    renderAt(TARGET_MS - (2 * DAY + 3 * HOUR + 4 * MINUTE + 5 * SECOND));

    const timer = screen.getByRole("timer");
    expect(timer).toHaveAccessibleName("Còn 2 ngày 3 giờ 4 phút 5 giây");
    expect(timer).toHaveAttribute("aria-live", "off");
  });

  it("uses tabular light serif figures and bordered token boxes", () => {
    renderAt(TARGET_MS - DAY);

    const boxes = getTimer().querySelectorAll("[data-unit]");
    expect(boxes).toHaveLength(4);
    for (const box of boxes) {
      expect(box).toHaveClass("border", "border-nu", "bg-lua", "lg:bg-canh-hoa", "rounded-control");
      expect(within(box as HTMLElement).getByTestId("value")).toHaveClass(
        "font-serif",
        "font-light",
        "tabular-nums",
      );
    }
  });

  it("shows the arrived message once the target has passed", () => {
    renderAt(TARGET_MS + MINUTE);

    expect(getTimer()).toHaveTextContent(ARRIVED);
    expect(getTimer().querySelectorAll("[data-unit]")).toHaveLength(0);
  });

  it("switches to the arrived message when the target is reached while open", () => {
    renderAt(TARGET_MS - 2 * SECOND);
    expect(boxValue("giây")).toBe("02");

    act(() => {
      vi.advanceTimersByTime(2 * SECOND);
    });
    expect(getTimer()).toHaveTextContent(ARRIVED);
  });

  it("clears its interval on unmount", () => {
    const { unmount } = renderAt(TARGET_MS - DAY);
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("defaults to siteConfig.eventAt", () => {
    vi.setSystemTime(Date.parse(siteConfig.eventAt) - (5 * DAY + 30 * SECOND));
    render(<Countdown />);

    expect(boxValue("ngày")).toBe("5");
    expect(boxValue("giây")).toBe("30");
  });
});
