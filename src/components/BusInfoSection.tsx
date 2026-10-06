import { getBusInfo } from "@/lib/server/bus-info";
import { BusInfoView, BusSectionFrame } from "./BusInfoView";

/** Streams in behind a `<Suspense fallback={<BusInfoSkeleton />}>` on the page. */
export async function BusInfoSection() {
  const result = await getBusInfo();

  return (
    <BusSectionFrame>
      <BusInfoView result={result} />
    </BusSectionFrame>
  );
}
