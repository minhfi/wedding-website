import { connection } from "next/server";
import { getBusInfo } from "@/lib/server/bus-info";
import { BusInfoView, BusSectionFrame } from "./BusInfoView";

/** Streams in behind a `<Suspense fallback={<BusInfoSkeleton />}>` on the page. */
export async function BusInfoSection() {
  // Keeps the bus info out of the static shell: it renders at request time inside its Suspense.
  await connection();
  const result = await getBusInfo();

  return (
    // The skeleton already played the stem animation; the streamed-in section must not replay it.
    <BusSectionFrame animate={false}>
      <BusInfoView result={result} />
    </BusSectionFrame>
  );
}
