import { SectionFrame } from "@/components/SectionFrame";
import { siteConfig } from "@/config/site";

const { video, bride, groom } = siteConfig;

export function VideoSection() {
  return (
    <SectionFrame headingId="video-heading" title={video.title} bloom="bud">
      <iframe
        src={video.embedUrl}
        title={`Phim cưới của ${bride.shortName} và ${groom.shortName}`}
        allow="autoplay; fullscreen"
        allowFullScreen
        loading="lazy"
        className="mt-5 aspect-video w-full rounded-control border border-nu bg-lua"
      />
      <a
        href={video.watchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex min-h-11 touch-manipulation items-center font-medium text-la-dam underline underline-offset-4 hover:text-than motion-safe:transition-colors"
      >
        Xem video trên Google Drive
        <span className="sr-only"> (mở trong tab mới)</span>
      </a>
    </SectionFrame>
  );
}
