import { afterEach, describe, expect, it, vi } from "vitest";
import { getRemaining } from "./countdown";

const TARGET_ISO = "2027-01-17T14:00:00+07:00";
// 14:00 at UTC+7 is 07:00 UTC.
const TARGET_MS = Date.UTC(2027, 0, 17, 7, 0, 0);

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("getRemaining", () => {
  it("splits the remaining time into floored days, hours, minutes and seconds", () => {
    const nowMs = TARGET_MS - (3 * DAY + 4 * HOUR + 5 * MINUTE + 6 * SECOND + 789);
    expect(getRemaining(TARGET_MS, nowMs)).toEqual({
      passed: false,
      days: 3,
      hours: 4,
      minutes: 5,
      seconds: 6,
    });
  });

  it("returns all zeros (not passed) 1 ms before the target", () => {
    expect(getRemaining(TARGET_MS, TARGET_MS - 1)).toEqual({
      passed: false,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
  });

  it("returns passed exactly at the target", () => {
    expect(getRemaining(TARGET_MS, TARGET_MS)).toEqual({ passed: true });
  });

  it("returns passed after the target", () => {
    expect(getRemaining(TARGET_MS, TARGET_MS + DAY)).toEqual({ passed: true });
  });

  it("counts days from a fixed instant one week before", () => {
    const nowMs = Date.UTC(2027, 0, 10, 7, 0, 0);
    expect(getRemaining(TARGET_MS, nowMs)).toEqual({
      passed: false,
      days: 7,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
  });

  it("handles a midnight-in-Vietnam instant on the wedding day", () => {
    // 00:00 on 17/01/2027 at UTC+7 is 17:00 UTC on 16/01/2027.
    const nowMs = Date.UTC(2027, 0, 16, 17, 0, 0);
    expect(getRemaining(TARGET_MS, nowMs)).toEqual({
      passed: false,
      days: 0,
      hours: 14,
      minutes: 0,
      seconds: 0,
    });
  });
});

describe("getRemaining is independent of the device time zone", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const zones = ["Asia/Ho_Chi_Minh", "UTC", "America/Los_Angeles", "Pacific/Kiritimati"];
  const nowMs = Date.UTC(2027, 0, 15, 22, 30, 15);

  it.each(zones)("parses the target ISO string to the same instant in %s", (zone) => {
    vi.stubEnv("TZ", zone);
    expect(Date.parse(TARGET_ISO)).toBe(TARGET_MS);
  });

  it.each(zones)("returns the same countdown in %s", (zone) => {
    vi.stubEnv("TZ", zone);
    expect(getRemaining(Date.parse(TARGET_ISO), nowMs)).toEqual({
      passed: false,
      days: 1,
      hours: 8,
      minutes: 29,
      seconds: 45,
    });
  });

  it("actually changes the local time zone when TZ is stubbed", () => {
    vi.stubEnv("TZ", "UTC");
    const utcHour = new Date(TARGET_MS).getHours();
    vi.stubEnv("TZ", "Asia/Ho_Chi_Minh");
    const vnHour = new Date(TARGET_MS).getHours();
    expect(utcHour).toBe(7);
    expect(vnHour).toBe(14);
  });
});
