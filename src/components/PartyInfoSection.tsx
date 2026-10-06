import type { ReactNode } from "react";
import { SectionFrame } from "@/components/SectionFrame";
import { siteConfig } from "@/config/site";

const { venue, timeText, dateText } = siteConfig;
const mapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(venue.address)}&output=embed`;
// dateText reads "Chủ nhật, 17.01.2027"; inside the time sentence the weekday comma is dropped.
const timeSentence = `Vào lúc ${timeText}, ${dateText.replace(", ", " ")}`;

/** 18px decorative line icon that inherits its stroke from the text color. */
function LineIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-1 shrink-0 text-la-dam"
    >
      {children}
    </svg>
  );
}

export function PartyInfoSection() {
  return (
    <SectionFrame headingId="party-heading" title="Tiệc cưới" bloom="rose">
      <div className="mt-4 space-y-3 text-base">
        <div className="flex items-start gap-3">
          <LineIcon>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </LineIcon>
          <p className="font-medium">{timeSentence}</p>
        </div>
        <div className="flex items-start gap-3">
          <LineIcon>
            <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
            <circle cx="12" cy="9.5" r="2.5" />
          </LineIcon>
          <div>
            <p className="font-medium">{venue.name}</p>
            <p className="text-da">{venue.address}</p>
          </div>
        </div>
      </div>

      <iframe
        src={mapEmbedUrl}
        title={`Bản đồ đến ${venue.name}`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="mt-5 aspect-4/3 w-full rounded-control border border-nu"
      />

      <a
        href={venue.mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-block py-2 font-medium text-la-dam underline underline-offset-4"
      >
        Mở bản đồ
        <span className="sr-only"> (mở trong ứng dụng bản đồ)</span>
      </a>
    </SectionFrame>
  );
}
