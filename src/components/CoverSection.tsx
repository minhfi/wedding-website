import Image from "next/image";
import { Bouquet } from "@/components/botanical/Botanicals";
import { siteConfig } from "@/config/site";

type CoverSectionProps = {
  /** Overrides `siteConfig.cover.src`; `null` shows the line-art bouquet instead of a photo. */
  src?: string | null;
};

export function CoverSection({ src = siteConfig.cover.src }: CoverSectionProps) {
  return (
    <div className="mx-gutter mt-gutter">
      <div className="relative aspect-4/5 overflow-hidden rounded-t-full rounded-b-control border border-nu bg-lua">
        {src ? (
          <Image
            src={src}
            alt={siteConfig.cover.alt}
            fill
            sizes="(min-width: 1024px) 45vw, 100vw"
            preload
            className="object-cover"
          />
        ) : (
          <Bouquet className="absolute inset-x-bouquet-x bottom-bouquet-bottom h-auto w-bouquet-w" />
        )}
      </div>
    </div>
  );
}
