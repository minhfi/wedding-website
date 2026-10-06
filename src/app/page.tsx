import { Suspense } from "react";
import { BusInfoSection } from "@/components/BusInfoSection";
import { BusInfoSkeleton } from "@/components/BusInfoView";
import { Countdown } from "@/components/Countdown";
import { CoupleDateSection } from "@/components/CoupleDateSection";
import { CoverSection } from "@/components/CoverSection";
import { GiftQrSection } from "@/components/GiftQrSection";
import { PartyInfoSection } from "@/components/PartyInfoSection";
import { RsvpForm } from "@/components/rsvp/RsvpForm";

export default function Home() {
  return (
    <main className="mx-auto min-h-screen max-w-xl pb-16">
      <CoverSection />
      <CoupleDateSection />
      <div className="relative pt-5 pr-gutter pl-stem">
        <span aria-hidden="true" className="absolute inset-y-0 left-gutter w-px bg-la-non" />
        <Countdown />
      </div>
      <PartyInfoSection />
      <Suspense fallback={<BusInfoSkeleton />}>
        <BusInfoSection />
      </Suspense>
      <section id="rsvp" aria-labelledby="rsvp-heading" className="relative py-12 pr-gutter pl-stem">
        <span aria-hidden="true" className="absolute inset-y-0 left-gutter w-px bg-la-non" />
        <h2 id="rsvp-heading" className="relative font-serif text-heading font-light">
          <span
            aria-hidden="true"
            className="absolute top-1/2 -left-bud size-2.25 -translate-x-1/2 -translate-y-1/2 rounded-full bg-la-non"
          />
          Xác nhận tham dự
        </h2>
        <p className="mt-2 text-da">Tìm tên bạn trong danh sách khách mời.</p>
        <div className="mt-5">
          <RsvpForm />
        </div>
      </section>
      <GiftQrSection />
    </main>
  );
}
