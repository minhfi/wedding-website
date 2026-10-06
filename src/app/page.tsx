import { Suspense } from "react";
import { BusInfoSection } from "@/components/BusInfoSection";
import { BusInfoSkeleton } from "@/components/BusInfoView";
import { Countdown } from "@/components/Countdown";
import { CoupleDateSection } from "@/components/CoupleDateSection";
import { CoverSection } from "@/components/CoverSection";
import { GiftQrSection } from "@/components/GiftQrSection";
import { PartyInfoSection } from "@/components/PartyInfoSection";
import { RsvpSection } from "@/components/rsvp/RsvpSection";

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
      <RsvpSection />
      <GiftQrSection />
    </main>
  );
}
