import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { BusInfoResult } from "@/lib/types";
import { BusInfoSkeleton, BusInfoView } from "./BusInfoView";

const EMPTY = "Thông tin xe sẽ được cập nhật sau";
const SEAT_NOTE = "Đăng ký ghế xe trong phần Xác nhận tham dự bên dưới.";

function ok(info: Extract<BusInfoResult, { status: "ok" }>["info"]): BusInfoResult {
  return { status: "ok", info };
}

describe("BusInfoView", () => {
  it("shows both trips with pickup point and time", () => {
    render(
      <BusInfoView
        result={ok({
          di: { diemDon: "Nhà trai, Quận 7", gio: "06:30" },
          ve: { diemDon: "Nhà hàng Hoa Sen", gio: "15:00" },
        })}
      />,
    );

    expect(screen.getByText("Chiều đi: đón tại Nhà trai, Quận 7 lúc 06:30")).toBeInTheDocument();
    expect(
      screen.getByText("Chiều về: khởi hành từ Nhà hàng Hoa Sen lúc 15:00"),
    ).toBeInTheDocument();
    expect(screen.getByText(SEAT_NOTE)).toBeInTheDocument();
    expect(screen.queryByText(new RegExp(EMPTY))).not.toBeInTheDocument();
  });

  it("shows the empty state for a direction that is not set yet", () => {
    render(
      <BusInfoView
        result={ok({ di: { diemDon: "Nhà trai, Quận 7", gio: "06:30" }, ve: null })}
      />,
    );

    expect(screen.getByText("Chiều đi: đón tại Nhà trai, Quận 7 lúc 06:30")).toBeInTheDocument();
    expect(screen.getByText(`Chiều về: ${EMPTY}`)).toBeInTheDocument();
  });

  it("shows a single empty state when neither direction is set", () => {
    render(<BusInfoView result={ok({ di: null, ve: null })} />);

    expect(screen.getByText(EMPTY)).toBeInTheDocument();
    expect(screen.queryByText(/Chiều đi/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Chiều về/)).not.toBeInTheDocument();
  });

  it("shows the error state with a reload link when bus info is unavailable", () => {
    render(<BusInfoView result={{ status: "unavailable" }} />);

    expect(screen.getByText("Chưa tải được thông tin xe")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tải lại trang" })).toHaveAttribute(
      "href",
      "/?tai-lai=1#bus",
    );
    expect(screen.queryByText(/Chiều đi/)).not.toBeInTheDocument();
  });
});

describe("BusInfoSkeleton", () => {
  it("keeps the section heading and shows the loading text", () => {
    render(<BusInfoSkeleton />);

    expect(screen.getByRole("heading", { level: 2, name: "Xe khách" })).toBeInTheDocument();
    expect(screen.getByText("Đang tải thông tin xe…")).toBeInTheDocument();
  });
});
