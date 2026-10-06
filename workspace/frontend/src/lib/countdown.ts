export type RemainingTime = {
  passed: false;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export type Countdown = RemainingTime | { passed: true };

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * Time left until an absolute instant. Works on epoch milliseconds only, so the
 * device time zone never affects the result. Every unit is floored: 1 ms before
 * the target yields 0/0/0/0 (not passed); at or after the target yields passed.
 */
export function getRemaining(targetMs: number, nowMs: number): Countdown {
  const diff = targetMs - nowMs;
  if (diff <= 0) {
    return { passed: true };
  }
  return {
    passed: false,
    days: Math.floor(diff / DAY_MS),
    hours: Math.floor((diff % DAY_MS) / HOUR_MS),
    minutes: Math.floor((diff % HOUR_MS) / MINUTE_MS),
    seconds: Math.floor((diff % MINUTE_MS) / SECOND_MS),
  };
}

/** Vietnamese summary of the remaining time, without seconds. */
export function formatRemaining(remaining: RemainingTime): string {
  const { days, hours, minutes } = remaining;
  if (days > 0) {
    return `Còn ${days} ngày ${hours} giờ ${minutes} phút nữa`;
  }
  if (hours > 0 || minutes > 0) {
    return `Còn ${hours} giờ ${minutes} phút nữa`;
  }
  return "Còn chưa đầy 1 phút nữa";
}
