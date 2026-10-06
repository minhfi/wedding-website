import { act, render, screen } from "@testing-library/react";
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

const PLACEHOLDER = "Đếm ngược đến ngày cưới";
const ARRIVED = "Ngày vui đã đến";

function getCountdown(): HTMLElement {
  return screen.getByTestId("countdown");
}

describe("Countdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders a neutral placeholder before mount (server render)", () => {
    vi.setSystemTime(TARGET_MS - 2 * DAY);
    const html = renderToString(<Countdown targetIso={TARGET_ISO} />);
    expect(html).toContain(PLACEHOLDER);
    expect(html).not.toContain("Còn");
  });

  it("shows the remaining time as a sentence after mount", () => {
    vi.setSystemTime(TARGET_MS - (3 * DAY + 4 * HOUR + 5 * MINUTE + 6 * SECOND));
    render(<Countdown targetIso={TARGET_ISO} />);
    expect(getCountdown()).toHaveTextContent("Còn 3 ngày 4 giờ 5 phút nữa");
  });

  it("updates every second so minutes roll over", () => {
    vi.setSystemTime(TARGET_MS - (1 * DAY + 2 * HOUR + 3 * MINUTE));
    render(<Countdown targetIso={TARGET_ISO} />);
    expect(getCountdown()).toHaveTextContent("Còn 1 ngày 2 giờ 3 phút nữa");

    act(() => {
      vi.advanceTimersByTime(SECOND);
    });
    expect(getCountdown()).toHaveTextContent("Còn 1 ngày 2 giờ 2 phút nữa");
  });

  it("does not announce every tick to screen readers", () => {
    vi.setSystemTime(TARGET_MS - DAY);
    render(<Countdown targetIso={TARGET_ISO} />);
    expect(getCountdown()).toHaveAttribute("aria-live", "off");
  });

  it("shows the arrived message once the target has passed", () => {
    vi.setSystemTime(TARGET_MS + MINUTE);
    render(<Countdown targetIso={TARGET_ISO} />);
    expect(getCountdown()).toHaveTextContent(ARRIVED);
  });

  it("switches to the arrived message when the target is reached while open", () => {
    vi.setSystemTime(TARGET_MS - SECOND);
    render(<Countdown targetIso={TARGET_ISO} />);
    expect(getCountdown()).toHaveTextContent("Còn chưa đầy 1 phút nữa");

    act(() => {
      vi.advanceTimersByTime(SECOND);
    });
    expect(getCountdown()).toHaveTextContent(ARRIVED);
  });

  it("clears its interval on unmount", () => {
    vi.setSystemTime(TARGET_MS - DAY);
    const { unmount } = render(<Countdown targetIso={TARGET_ISO} />);
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("defaults to siteConfig.eventAt", () => {
    const eventMs = Date.parse(siteConfig.eventAt);
    vi.setSystemTime(eventMs - (2 * DAY + 3 * HOUR + 4 * MINUTE));
    render(<Countdown />);
    expect(getCountdown()).toHaveTextContent("Còn 2 ngày 3 giờ 4 phút nữa");
  });
});
