import { siteConfig } from "@/config/site";

const { venue, timeText } = siteConfig;
const mapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(venue.address)}&output=embed`;

export function PartyInfoSection() {
  return (
    <section aria-labelledby="party-heading" className="relative py-12 pr-gutter pl-stem">
      <span aria-hidden="true" className="absolute inset-y-0 left-gutter w-px bg-la-non" />
      <div className="relative">
        <span
          aria-hidden="true"
          className="absolute top-1/2 -left-bud size-2.25 -translate-x-1/2 -translate-y-1/2 rounded-full bg-la-non"
        />
        <h2 id="party-heading" className="font-serif text-heading font-light">
          Tiệc cưới
        </h2>
      </div>

      <div className="mt-4 space-y-1 text-base">
        <p className="font-medium">Vào lúc {timeText}</p>
        <p className="font-medium">{venue.name}</p>
        <p className="text-da">{venue.address}</p>
      </div>

      <iframe
        src={mapEmbedUrl}
        title={`Bản đồ đến ${venue.name}`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="mt-5 aspect-4/3 w-full rounded-control border-0"
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
    </section>
  );
}
