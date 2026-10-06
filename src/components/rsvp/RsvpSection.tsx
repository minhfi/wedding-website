import { SectionFrame } from "@/components/SectionFrame";
import { RsvpForm } from "./RsvpForm";

export function RsvpSection() {
  return (
    <SectionFrame id="rsvp" headingId="rsvp-heading" title="Xác nhận tham dự" bloom="lace">
      <p className="mt-2 text-da">Tìm tên bạn trong danh sách khách mời.</p>
      <div className="mt-5">
        <RsvpForm />
      </div>
    </SectionFrame>
  );
}
