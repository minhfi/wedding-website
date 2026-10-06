import { siteConfig } from "@/config/site";

export function CoupleDateSection() {
  const { groom, bride, dateText, timeText, lunarText, eventAt } = siteConfig;

  return (
    <section className="relative z-10 -mt-14 pr-gutter pl-stem">
      <div
        aria-hidden="true"
        className="absolute top-0 bottom-0 left-gutter w-px bg-la-non"
      />
      <h1 className="font-serif text-names font-extralight text-than">
        <span className="block">{groom.shortName}</span>{" "}
        <span className="block text-names-join text-la-dam">và</span>{" "}
        <span className="block">{bride.shortName}</span>
      </h1>
      <p className="mt-6 text-lg font-medium text-than">
        <time dateTime={eventAt}>
          {dateText} lúc {timeText}
        </time>
      </p>
      <p className="mt-1 text-sm text-da">{lunarText}</p>
    </section>
  );
}
