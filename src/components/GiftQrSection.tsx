import Image from "next/image";
import { SectionFrame } from "@/components/SectionFrame";
import { siteConfig } from "@/config/site";

const { qr } = siteConfig;

export function GiftQrSection() {
  return (
    <SectionFrame headingId="gift-heading" title="Mừng cưới" bloom="bud">
      <div className="mt-4 rounded-control bg-lua p-6">
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
      </div>
    </SectionFrame>
  );
}
