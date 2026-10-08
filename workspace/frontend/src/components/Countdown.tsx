"use client";

import { useEffect, useState } from "react";
import { siteConfig } from "@/config/site";
import { getRemaining, type RemainingTime } from "@/lib/countdown";

const TICK_MS = 1000;
const ARRIVED = "Ngày vui đã đến";
const PLACEHOLDER_VALUE = "–";

const UNITS = [
  { key: "days", label: "ngày" },
  { key: "hours", label: "giờ" },
  { key: "minutes", label: "phút" },
  { key: "seconds", label: "giây" },
] as const satisfies ReadonlyArray<{ key: keyof Omit<RemainingTime, "passed">; label: string }>;

interface CountdownProps {
  /** Absolute target instant; defaults to the wedding time. */
  targetIso?: string;
}

/** Days stay as-is; hours, minutes and seconds are zero-padded so the boxes don't jitter. */
function formatValue(key: (typeof UNITS)[number]["key"], value: number): string {
  return key === "days" ? String(value) : String(value).padStart(2, "0");
}

function accessibleLabel(remaining: RemainingTime): string {
  const { days, hours, minutes, seconds } = remaining;
  return `Còn ${days} ngày ${hours} giờ ${minutes} phút ${seconds} giây`;
}

export function Countdown({ targetIso = siteConfig.eventAt }: CountdownProps) {
  // Time is read only after mount, so prerender and hydration see the placeholder boxes.
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNowMs(Date.now());
    tick();
    const intervalId = setInterval(tick, TICK_MS);
    return () => clearInterval(intervalId);
  }, []);

  const countdown = nowMs === null ? null : getRemaining(Date.parse(targetIso), nowMs);

  if (countdown?.passed) {
    return (
      <p
        data-testid="countdown"
        className="flex min-h-20 items-center font-serif text-heading font-light text-la-dam"
      >
        {ARRIVED}
      </p>
    );
  }

  return (
    // role="timer" is implicitly aria-live="off"; set it explicitly so ticks are never announced.
    <div
      data-testid="countdown"
      role="timer"
      aria-live="off"
      aria-label={countdown ? accessibleLabel(countdown) : "Đếm ngược đến ngày cưới"}
      className="grid max-w-sm grid-cols-4 gap-2 lg:mx-auto"
    >
      {UNITS.map(({ key, label }) => (
        <div
          key={key}
          data-unit={key}
          aria-hidden="true"
          className="flex min-h-20 flex-col items-center justify-center rounded-control border border-nu bg-lua px-1 py-2 lg:bg-canh-hoa"
        >
          <span data-testid="value" className="font-serif text-heading font-light text-than tabular-nums">
            {countdown ? formatValue(key, countdown[key]) : PLACEHOLDER_VALUE}
          </span>
          <span className="text-body text-da">{label}</span>
        </div>
      ))}
    </div>
  );
}
