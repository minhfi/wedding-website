import Image from "next/image";
import { SectionFrame } from "@/components/SectionFrame";
import { CornerSprig } from "@/components/botanical/Botanicals";
import { siteConfig } from "@/config/site";

const { qr } = siteConfig;

export function GiftQrSection() {
  return (
    <SectionFrame headingId="gift-heading" title="Mừng cưới" bloom="bud">
      <div className="relative mt-4 rounded-control bg-lua p-6">
        <Image
          src={qr.src}
          alt={qr.alt}
          width={600}
          height={600}
          sizes="240px"
          className="size-60"
        />
        <p className="mt-4 text-da">Quét mã bằng ứng dụng ngân hàng</p>
        <p className="mt-2 font-medium">{qr.accountHolder}</p>
        <p className="text-da">{qr.bankName}</p>
        <CornerSprig className="pointer-events-none absolute -right-3 -bottom-4 h-16 w-16" />
      </div>
    </SectionFrame>
  );
}
