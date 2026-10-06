import Image from "next/image";
import { siteConfig } from "@/config/site";

const { qr } = siteConfig;

export function GiftQrSection() {
  return (
    <section aria-labelledby="gift-heading" className="relative py-12 pr-gutter pl-stem">
      <span aria-hidden="true" className="absolute inset-y-0 left-gutter w-px bg-la-non" />
      <div className="relative">
        <span
          aria-hidden="true"
          className="absolute top-1/2 -left-bud size-2.25 -translate-x-1/2 -translate-y-1/2 rounded-full bg-la-non"
        />
        <h2 id="gift-heading" className="font-serif text-heading font-light">
          Mừng cưới
        </h2>
      </div>

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
    </section>
  );
}
