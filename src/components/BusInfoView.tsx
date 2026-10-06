import type { ReactNode } from "react";
import { SectionFrame } from "@/components/SectionFrame";
import type { BusInfoResult, BusTrip } from "@/lib/types";

const EMPTY_TEXT = "Thông tin xe sẽ được cập nhật sau";

/** Section frame shared by the loaded section and its Suspense fallback, so layout stays stable. */
export function BusSectionFrame({ children, animate = true }: { children: ReactNode; animate?: boolean }) {
  return (
    <SectionFrame id="bus" headingId="bus-heading" title="Xe khách" bloom="tulip" animate={animate}>
      <div className="mt-4 text-base text-than">{children}</div>
    </SectionFrame>
  );
}

/** One direction: a muted label line, then "<place> lúc <time>" with the time in weight 500. */
function TripRow({ label, trip, placePrefix }: { label: string; trip: BusTrip | null; placePrefix: string }) {
  return (
    <li>
      <p className="text-body text-da">{label}</p>
      <p>
        {trip ? (
          <>
            {placePrefix} {trip.diemDon} lúc <span className="font-medium">{trip.gio}</span>
          </>
        ) : (
          EMPTY_TEXT
        )}
      </p>
    </li>
  );
}

export function BusInfoView({ result }: { result: BusInfoResult }) {
  if (result.status === "unavailable") {
    return (
      <>
        <p>Chưa tải được thông tin xe</p>
        <p className="mt-2">
          {/* A plain document link, not client-side <Link>: the retry should be a real page load. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/?tai-lai=1#bus" className="font-medium text-la-dam underline underline-offset-4">
            Tải lại trang
          </a>
        </p>
      </>
    );
  }

  const { di, ve } = result.info;

  return (
    <>
      {di === null && ve === null ? (
        <p>{EMPTY_TEXT}</p>
      ) : (
        <ul className="space-y-3 border-l-2 border-nu pl-4">
          <TripRow label="Chiều đi" trip={di} placePrefix="Đón tại" />
          <TripRow label="Chiều về" trip={ve} placePrefix="Khởi hành từ" />
        </ul>
      )}
      <p className="mt-4 text-da">Đăng ký ghế xe trong phần Xác nhận tham dự bên dưới.</p>
    </>
  );
}

export function BusInfoSkeleton() {
  return (
    <BusSectionFrame>
      <p role="status" className="text-da">Đang tải thông tin xe…</p>
    </BusSectionFrame>
  );
}
