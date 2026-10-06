import Image from "next/image";
import { siteConfig } from "@/config/site";

export function CoverSection() {
  const { src, alt } = siteConfig.cover;

  return (
    <div className="w-full">
      <Image
        src={src}
        alt={alt}
        width={1200}
        height={1500}
        sizes="100vw"
        preload
        className="aspect-4/5 h-auto w-full object-cover"
      />
    </div>
  );
}
