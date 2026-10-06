"use client";

import { useEffect, useState, type ReactNode } from "react";
import { siteConfig } from "@/config/site";
import { formatRemaining, getRemaining } from "@/lib/countdown";

const TICK_MS = 1000;
const PLACEHOLDER = "Đếm ngược đến ngày cưới";
const ARRIVED = "Ngày vui đã đến";

interface CountdownProps {
  /** Absolute target instant; defaults to the wedding time. */
  targetIso?: string;
}

/** Renders the sentence with each number in weight 500, e.g. "Còn <3> ngày <4> giờ …". */
function renderSentence(sentence: string) {
  return sentence.split(/(\d+)/).map((part, index) =>
    index % 2 === 1 ? (
      <span key={index} className="font-medium">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

export function Countdown({ targetIso = siteConfig.eventAt }: CountdownProps) {
  // Time is read only after mount, so prerender and hydration see the placeholder.
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNowMs(Date.now());
    tick();
    const intervalId = setInterval(tick, TICK_MS);
    return () => clearInterval(intervalId);
  }, []);

  let content: ReactNode = PLACEHOLDER;
  if (nowMs !== null) {
    const remaining = getRemaining(Date.parse(targetIso), nowMs);
    content = remaining.passed ? ARRIVED : renderSentence(formatRemaining(remaining));
  }

  return (
    <p data-testid="countdown" aria-live="off" className="text-body text-than">
      {content}
    </p>
  );
}
