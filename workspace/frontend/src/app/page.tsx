import { Suspense } from "react";
import { BackgroundBotanicals } from "@/components/BackgroundBotanicals";
import { BusInfoSection } from "@/components/BusInfoSection";
import { BusInfoSkeleton } from "@/components/BusInfoView";
import { Countdown } from "@/components/Countdown";
import { CoupleDateSection } from "@/components/CoupleDateSection";
import { CoverSection } from "@/components/CoverSection";
import { GiftQrSection } from "@/components/GiftQrSection";
import { PartyInfoSection } from "@/components/PartyInfoSection";
import { RsvpSection } from "@/components/rsvp/RsvpSection";

export default function Home() {
  // `isolate` makes <main> a stacking context, so the fixed `-z-10` background paints above the body
  // background but below every section.
  return (
    <main className="isolate mx-auto min-h-screen max-w-xl pb-16 lg:grid lg:max-w-6xl lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start lg:gap-12 lg:px-gutter">
      <BackgroundBotanicals />
      {/* Hero: sticky left column on desktop, on a soft panel. The cover width is capped so the whole hero fits one screen. */}
      <div className="lg:sticky lg:top-0 lg:h-dvh lg:py-gutter">
        <div className="lg:flex lg:h-full lg:flex-col lg:justify-center-safe lg:rounded-panel lg:bg-lua lg:pb-gutter">
          <div className="lg:max-w-hero-cover">
            <CoverSection />
          </div>
          <CoupleDateSection>
            <div className="mt-5">
              <Countdown />
            </div>
          </CoupleDateSection>
        </div>
      </div>
      <div className="stem-sequence lg:pt-16">
        <PartyInfoSection />
        <Suspense fallback={<BusInfoSkeleton />}>
          <BusInfoSection />
        </Suspense>
        <RsvpSection />
        <GiftQrSection />
      </div>
    </main>
  );
}
