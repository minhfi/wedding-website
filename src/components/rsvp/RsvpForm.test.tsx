import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { submitRsvp } from "@/lib/api-client";
import type { ApiResult } from "@/lib/api-client";
import type { GuestDetail, GuestSuggestion } from "@/lib/types";
import { RsvpForm } from "./RsvpForm";

vi.mock("@/lib/api-client", () => ({
  searchGuests: vi.fn(),
  getGuest: vi.fn(),
  submitRsvp: vi.fn(),
}));

const AN: GuestSuggestion = { id: "g1", ten: "Nguyễn Văn An" };

vi.mock("./GuestLookup", () => ({
  GuestLookup: ({ onSelect }: { onSelect: (guest: GuestSuggestion) => void }) => (
    <button type="button" onClick={() => onSelect({ id: "g1", ten: "Nguyễn Văn An" })}>
      Chọn khách mẫu
    </button>
  ),
}));

const mockedSubmit = vi.mocked(submitRsvp);

function savedGuest(rsvp: GuestDetail["rsvp"]): GuestDetail {
  return { id: AN.id, ten: AN.ten, rsvp, capNhatLuc: "2026-10-06T10:00:00+07:00" };
}

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

async function selectGuest(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Chọn khách mẫu" }));
}

async function fillAttending(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("radio", { name: "Có, mình sẽ đến" }));
  await user.type(screen.getByLabelText("Số người đi tiệc"), "3");
  await chooseBus(user, "đi", "Có");
  await user.type(screen.getByLabelText("Số ghế chiều đi"), "2");
  await chooseBus(user, "về", "Không");
}

async function chooseBus(
  user: ReturnType<typeof userEvent.setup>,
  direction: "đi" | "về",
  choice: "Có" | "Không",
) {
  const group = screen.getByRole("radiogroup", { name: new RegExp(`Đi xe khách chiều ${direction}`) });
  await user.click(within(group).getByRole("radio", { name: choice }));
}

function submitButton() {
  return screen.getByRole("button", { name: /Gửi xác nhận|Đang gửi…/ });
}

beforeEach(() => {
  mockedSubmit.mockReset();
});

describe("RsvpForm", () => {
  it("starts with the guest lookup and no RSVP fields", () => {
    render(<RsvpForm />);
    expect(screen.getByRole("button", { name: "Chọn khách mẫu" })).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup", { name: "Bạn có đến dự tiệc không?" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Gửi xác nhận" })).not.toBeInTheDocument();
  });

  it("shows the selected guest's name with a 'Đổi người' action and the fields", async () => {
    const user = userEvent.setup();
    render(<RsvpForm />);
    await selectGuest(user);

    expect(screen.getByText(/Bạn đang xác nhận cho:/)).toHaveTextContent(
      "Bạn đang xác nhận cho: Nguyễn Văn An",
    );
    expect(screen.getByText("Nguyễn Văn An").tagName).toBe("STRONG");
    expect(screen.getByRole("button", { name: "Đổi người" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Bạn có đến dự tiệc không?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gửi xác nhận" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Chọn khách mẫu" })).not.toBeInTheDocument();
  });

  it("'Đổi người' returns to the lookup and resets entered values", async () => {
    const user = userEvent.setup();
    render(<RsvpForm />);
    await selectGuest(user);
    await user.click(screen.getByRole("radio", { name: "Có, mình sẽ đến" }));
    await user.type(screen.getByLabelText("Số người đi tiệc"), "4");

    await user.click(screen.getByRole("button", { name: "Đổi người" }));

    expect(screen.getByRole("button", { name: "Chọn khách mẫu" })).toBeInTheDocument();
    expect(screen.queryByText(/Bạn đang xác nhận cho:/)).not.toBeInTheDocument();

    await selectGuest(user);
    expect(screen.getByRole("radio", { name: "Có, mình sẽ đến" })).not.toBeChecked();
    expect(screen.queryByLabelText("Số người đi tiệc")).not.toBeInTheDocument();
  });

  it("blocks submit with inline errors and focuses the first invalid control", async () => {
    const user = userEvent.setup();
    render(<RsvpForm />);
    await selectGuest(user);

    await user.click(screen.getByRole("button", { name: "Gửi xác nhận" }));

    expect(mockedSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Vui lòng chọn có đi tiệc hay không")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Có, mình sẽ đến" })).toHaveFocus();
  });

  it("blocks seats greater than people with the Vietnamese message", async () => {
    const user = userEvent.setup();
    render(<RsvpForm />);
    await selectGuest(user);
    await user.click(screen.getByRole("radio", { name: "Có, mình sẽ đến" }));
    await user.type(screen.getByLabelText("Số người đi tiệc"), "2");
    await chooseBus(user, "đi", "Có");
    await user.type(screen.getByLabelText("Số ghế chiều đi"), "3");
    await chooseBus(user, "về", "Không");

    await user.click(screen.getByRole("button", { name: "Gửi xác nhận" }));

    expect(mockedSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Số ghế không được nhiều hơn số người đi tiệc")).toBeInTheDocument();
    expect(screen.getByLabelText("Số ghế chiều đi")).toHaveFocus();
  });

  it("submits the exact RsvpInput for an attending guest", async () => {
    mockedSubmit.mockResolvedValue({
      ok: true,
      data: savedGuest({ diTiec: "co", soNguoi: 3, gheXeDi: 2, gheXeVe: 0 }),
    });
    const user = userEvent.setup();
    render(<RsvpForm />);
    await selectGuest(user);
    await fillAttending(user);

    await user.click(screen.getByRole("button", { name: "Gửi xác nhận" }));

    expect(mockedSubmit).toHaveBeenCalledTimes(1);
    expect(mockedSubmit).toHaveBeenCalledWith({
      guestId: "g1",
      diTiec: "co",
      soNguoi: 3,
      xeDi: true,
      gheXeDi: 2,
      xeVe: false,
    });
  });

  it("disables the button while submitting and sends only once on double click", async () => {
    const pending = deferred<ApiResult<GuestDetail>>();
    mockedSubmit.mockReturnValue(pending.promise);
    const user = userEvent.setup();
    render(<RsvpForm />);
    await selectGuest(user);
    await user.click(screen.getByRole("radio", { name: "Không đến được" }));

    await user.dblClick(screen.getByRole("button", { name: "Gửi xác nhận" }));

    const button = submitButton();
    expect(button).toHaveTextContent("Đang gửi…");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "Đổi người" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "Không đến được" })).toBeDisabled();
    expect(mockedSubmit).toHaveBeenCalledTimes(1);

    pending.resolve({ ok: true, data: savedGuest({ diTiec: "khong" }) });
    expect(await screen.findByText("Cảm ơn bạn đã xác nhận!")).toBeInTheDocument();
    expect(mockedSubmit).toHaveBeenCalledTimes(1);
  });

  it("shows the success summary for an attending guest and moves focus to it", async () => {
    mockedSubmit.mockResolvedValue({
      ok: true,
      data: savedGuest({ diTiec: "co", soNguoi: 3, gheXeDi: 2, gheXeVe: 0 }),
    });
    const user = userEvent.setup();
    render(<RsvpForm />);
    await selectGuest(user);
    await fillAttending(user);
    await user.click(screen.getByRole("button", { name: "Gửi xác nhận" }));

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("Cảm ơn bạn đã xác nhận!");
    expect(status).toHaveTextContent("Bạn sẽ đến cùng 3 người");
    expect(status).toHaveTextContent("Xe chiều đi: 2 ghế");
    expect(status).toHaveTextContent("Không đi xe chiều về");
    expect(status).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Gửi xác nhận" })).not.toBeInTheDocument();
  });

  it("shows the success summary for a guest who is not attending", async () => {
    mockedSubmit.mockResolvedValue({ ok: true, data: savedGuest({ diTiec: "khong" }) });
    const user = userEvent.setup();
    render(<RsvpForm />);
    await selectGuest(user);
    await user.click(screen.getByRole("radio", { name: "Không đến được" }));
    await user.click(screen.getByRole("button", { name: "Gửi xác nhận" }));

    expect(mockedSubmit).toHaveBeenCalledWith({ guestId: "g1", diTiec: "khong" });
    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("Cảm ơn bạn đã xác nhận!");
    expect(status).toHaveTextContent(
      "Bạn đã báo không đến được. Cảm ơn bạn đã báo cho chúng mình.",
    );
    expect(status).not.toHaveTextContent(/người|ghế/);
  });

  it("'Sửa câu trả lời' returns to the filled form", async () => {
    mockedSubmit.mockResolvedValue({
      ok: true,
      data: savedGuest({ diTiec: "co", soNguoi: 3, gheXeDi: 2, gheXeVe: 0 }),
    });
    const user = userEvent.setup();
    render(<RsvpForm />);
    await selectGuest(user);
    await fillAttending(user);
    await user.click(screen.getByRole("button", { name: "Gửi xác nhận" }));

    await user.click(await screen.findByRole("button", { name: "Sửa câu trả lời" }));

    expect(screen.getByText(/Bạn đang xác nhận cho:/)).toHaveTextContent("Nguyễn Văn An");
    expect(screen.getByRole("radio", { name: "Có, mình sẽ đến" })).toBeChecked();
    expect(screen.getByLabelText("Số người đi tiệc")).toHaveValue(3);
    expect(screen.getByLabelText("Số ghế chiều đi")).toHaveValue(2);
    expect(screen.getByRole("button", { name: "Gửi xác nhận" })).toBeEnabled();
  });

  it("shows the error message, keeps values, and 'Thử lại' resubmits", async () => {
    mockedSubmit
      .mockResolvedValueOnce({ ok: false, code: "network", message: "Có lỗi kết nối, vui lòng thử lại" })
      .mockResolvedValueOnce({
        ok: true,
        data: savedGuest({ diTiec: "co", soNguoi: 3, gheXeDi: 2, gheXeVe: 0 }),
      });
    const user = userEvent.setup();
    render(<RsvpForm />);
    await selectGuest(user);
    await fillAttending(user);
    await user.click(screen.getByRole("button", { name: "Gửi xác nhận" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Có lỗi kết nối, vui lòng thử lại");
    expect(screen.getByRole("radio", { name: "Có, mình sẽ đến" })).toBeChecked();
    expect(screen.getByLabelText("Số người đi tiệc")).toHaveValue(3);
    expect(screen.getByLabelText("Số ghế chiều đi")).toHaveValue(2);
    expect(screen.getByRole("button", { name: "Gửi xác nhận" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Thử lại" }));

    expect(mockedSubmit).toHaveBeenCalledTimes(2);
    expect(mockedSubmit).toHaveBeenLastCalledWith({
      guestId: "g1",
      diTiec: "co",
      soNguoi: 3,
      xeDi: true,
      gheXeDi: 2,
      xeVe: false,
    });
    expect(await screen.findByText("Cảm ơn bạn đã xác nhận!")).toBeInTheDocument();
  });

  it("shows server field errors inline and focuses the first one", async () => {
    mockedSubmit.mockResolvedValue({
      ok: false,
      code: "validation",
      message: "Thông tin chưa hợp lệ",
      fields: { soNguoi: "Số người đi tiệc phải từ 1 đến 10" },
    });
    const user = userEvent.setup();
    render(<RsvpForm />);
    await selectGuest(user);
    await fillAttending(user);
    await user.click(screen.getByRole("button", { name: "Gửi xác nhận" }));

    expect(await screen.findByText("Số người đi tiệc phải từ 1 đến 10")).toBeInTheDocument();
    expect(screen.getByLabelText("Số người đi tiệc")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Số người đi tiệc")).toHaveFocus();
    expect(screen.getByRole("alert")).toHaveTextContent("Thông tin chưa hợp lệ");
    expect(screen.queryByRole("button", { name: "Thử lại" })).not.toBeInTheDocument();
  });

  it("clears a field's error once the guest changes that field", async () => {
    const user = userEvent.setup();
    render(<RsvpForm />);
    await selectGuest(user);
    await user.click(screen.getByRole("button", { name: "Gửi xác nhận" }));
    expect(screen.getByText("Vui lòng chọn có đi tiệc hay không")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Không đến được" }));

    expect(screen.queryByText("Vui lòng chọn có đi tiệc hay không")).not.toBeInTheDocument();
  });
});
