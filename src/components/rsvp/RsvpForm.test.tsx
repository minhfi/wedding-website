import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getGuest, submitRsvp } from "@/lib/api-client";
import type { ApiResult } from "@/lib/api-client";
import type { GuestDetail, GuestSuggestion } from "@/lib/types";
import { RsvpForm, formatConfirmedAt } from "./RsvpForm";

vi.mock("@/lib/api-client", () => ({
  searchGuests: vi.fn(),
  getGuest: vi.fn(),
  submitRsvp: vi.fn(),
}));

const AN: GuestSuggestion = { id: "g1", ten: "Nguyễn Văn An" };

vi.mock("./GuestLookup", () => ({
  GuestLookup: ({
    onSelect,
    focusOnMount,
  }: {
    onSelect: (guest: GuestSuggestion) => void;
    focusOnMount?: boolean;
  }) => (
    <button
      type="button"
      data-focus-on-mount={String(Boolean(focusOnMount))}
      onClick={() => onSelect({ id: "g1", ten: "Nguyễn Văn An" })}
    >
      Chọn khách mẫu
    </button>
  ),
}));

const mockedSubmit = vi.mocked(submitRsvp);
const mockedGetGuest = vi.mocked(getGuest);

function savedGuest(
  rsvp: GuestDetail["rsvp"],
  capNhatLuc: string | null = "2026-11-02 20:15:03",
): GuestDetail {
  return { id: AN.id, ten: AN.ten, rsvp, capNhatLuc };
}

const NOT_ANSWERED: GuestDetail = { id: AN.id, ten: AN.ten, rsvp: null, capNhatLuc: null };

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function clickSelect(user: ReturnType<typeof userEvent.setup>) {
  return user.click(screen.getByRole("button", { name: "Chọn khách mẫu" }));
}

/** Selects the guest and waits until the guest's details have loaded. */
async function selectGuest(user: ReturnType<typeof userEvent.setup>) {
  await clickSelect(user);
  await screen.findByRole("button", { name: "Gửi xác nhận" });
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
  const group = screen.getByRole("group", { name: new RegExp(`Đi xe khách chiều ${direction}`) });
  await user.click(within(group).getByRole("radio", { name: choice }));
}

function submitButton() {
  return screen.getByRole("button", { name: /Gửi xác nhận|Đang gửi…/ });
}

beforeEach(() => {
  mockedSubmit.mockReset();
  mockedGetGuest.mockReset();
  mockedGetGuest.mockResolvedValue({ ok: true, data: NOT_ANSWERED });
});

describe("RsvpForm", () => {
  it("starts with the guest lookup and no RSVP fields", () => {
    render(<RsvpForm />);
    expect(screen.getByRole("button", { name: "Chọn khách mẫu" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Bạn có đến dự tiệc không?" })).not.toBeInTheDocument();
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
    expect(screen.getByRole("group", { name: "Bạn có đến dự tiệc không?" })).toBeInTheDocument();
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

    const heading = await screen.findByRole("heading", { name: "Cảm ơn bạn đã xác nhận!" });
    const summary = heading.parentElement;
    expect(summary).toHaveTextContent("Số người đi tiệc: 3");
    expect(summary).toHaveTextContent("Xe chiều đi: 2 ghế");
    expect(summary).toHaveTextContent("Không đi xe chiều về");
    expect(summary).toHaveAttribute("tabindex", "-1");
    expect(summary).toHaveFocus();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
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
    const heading = await screen.findByRole("heading", { name: "Cảm ơn bạn đã xác nhận!" });
    const summary = heading.parentElement;
    expect(summary).toHaveTextContent(
      "Bạn đã báo không đến được. Cảm ơn bạn đã báo cho chúng mình.",
    );
    expect(summary).not.toHaveTextContent(/người|ghế/);
    expect(summary).toHaveFocus();
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
    expect(screen.getByRole("radio", { name: "Có, mình sẽ đến" })).toHaveFocus();
  });

  it("focuses the chosen attendance answer after 'Sửa câu trả lời'", async () => {
    mockedSubmit.mockResolvedValue({ ok: true, data: savedGuest({ diTiec: "khong" }) });
    const user = userEvent.setup();
    render(<RsvpForm />);
    await selectGuest(user);
    await user.click(screen.getByRole("radio", { name: "Không đến được" }));
    await user.click(screen.getByRole("button", { name: "Gửi xác nhận" }));

    await user.click(await screen.findByRole("button", { name: "Sửa câu trả lời" }));

    expect(screen.getByRole("radio", { name: "Không đến được" })).toHaveFocus();
  });

  it("focuses the guest header after picking a guest and keeps it once loaded", async () => {
    const pending = deferred<ApiResult<GuestDetail>>();
    mockedGetGuest.mockReturnValue(pending.promise);
    const user = userEvent.setup();
    render(<RsvpForm />);
    await clickSelect(user);

    const header = screen.getByText(/Bạn đang xác nhận cho:/);
    expect(header).toHaveAttribute("tabindex", "-1");
    expect(header).toHaveFocus();

    pending.resolve({ ok: true, data: NOT_ANSWERED });
    await screen.findByRole("button", { name: "Gửi xác nhận" });
    expect(screen.getByText(/Bạn đang xác nhận cho:/)).toHaveFocus();
  });

  it("asks the lookup to focus its input only after 'Đổi người'", async () => {
    const user = userEvent.setup();
    render(<RsvpForm />);
    expect(screen.getByRole("button", { name: "Chọn khách mẫu" })).toHaveAttribute(
      "data-focus-on-mount",
      "false",
    );
    await selectGuest(user);
    await user.click(screen.getByRole("button", { name: "Đổi người" }));
    expect(screen.getByRole("button", { name: "Chọn khách mẫu" })).toHaveAttribute(
      "data-focus-on-mount",
      "true",
    );
  });

  it("keeps the alert region mounted and only swaps its content on a submit error", async () => {
    mockedSubmit.mockResolvedValue({
      ok: false,
      code: "network",
      message: "Có lỗi kết nối, vui lòng thử lại",
    });
    const user = userEvent.setup();
    render(<RsvpForm />);
    await selectGuest(user);
    const alert = screen.getByRole("alert");
    expect(alert).toBeEmptyDOMElement();

    await user.click(screen.getByRole("radio", { name: "Không đến được" }));
    await user.click(screen.getByRole("button", { name: "Gửi xác nhận" }));

    expect(await screen.findByText("Có lỗi kết nối, vui lòng thử lại")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBe(alert);
    expect(alert).toHaveTextContent("Có lỗi kết nối, vui lòng thử lại");
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

    expect(await screen.findByText("Có lỗi kết nối, vui lòng thử lại")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Có lỗi kết nối, vui lòng thử lại");
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

describe("RsvpForm pre-fill", () => {
  it("loads the selected guest with a loading state and hides the fields meanwhile", async () => {
    const pending = deferred<ApiResult<GuestDetail>>();
    mockedGetGuest.mockReturnValue(pending.promise);
    const user = userEvent.setup();
    render(<RsvpForm />);
    await clickSelect(user);

    expect(mockedGetGuest).toHaveBeenCalledWith("g1");
    expect(screen.getByRole("status")).toHaveTextContent("Đang tải thông tin…");
    expect(screen.getByText(/Bạn đang xác nhận cho:/)).toHaveTextContent("Nguyễn Văn An");
    expect(screen.queryByRole("group", { name: "Bạn có đến dự tiệc không?" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Gửi xác nhận/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đổi người" })).toBeEnabled();

    pending.resolve({ ok: true, data: NOT_ANSWERED });
    expect(await screen.findByRole("button", { name: "Gửi xác nhận" })).toBeInTheDocument();
    expect(screen.queryByText("Đang tải thông tin…")).not.toBeInTheDocument();
  });

  it("shows an empty form with no note when the guest has not answered yet", async () => {
    const user = userEvent.setup();
    render(<RsvpForm />);
    await selectGuest(user);

    expect(screen.getByRole("radio", { name: "Có, mình sẽ đến" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Không đến được" })).not.toBeChecked();
    expect(screen.queryByText(/Bạn đã xác nhận/)).not.toBeInTheDocument();
  });

  it("pre-fills an attending answer and shows when it was confirmed", async () => {
    mockedGetGuest.mockResolvedValue({
      ok: true,
      data: savedGuest({ diTiec: "co", soNguoi: 3, gheXeDi: 2, gheXeVe: 0 }),
    });
    const user = userEvent.setup();
    render(<RsvpForm />);
    await selectGuest(user);

    expect(
      screen.getByText("Bạn đã xác nhận lúc 20:15 ngày 02/11/2026, có thể sửa lại bên dưới"),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Có, mình sẽ đến" })).toBeChecked();
    expect(screen.getByLabelText("Số người đi tiệc")).toHaveValue(3);
    const xeDi = screen.getByRole("group", { name: /Đi xe khách chiều đi/ });
    expect(within(xeDi).getByRole("radio", { name: "Có" })).toBeChecked();
    expect(screen.getByLabelText("Số ghế chiều đi")).toHaveValue(2);
    const xeVe = screen.getByRole("group", { name: /Đi xe khách chiều về/ });
    expect(within(xeVe).getByRole("radio", { name: "Không" })).toBeChecked();
    expect(screen.queryByLabelText("Số ghế chiều về")).not.toBeInTheDocument();
  });

  it("pre-fills a not-attending answer, and lets the guest change it and submit", async () => {
    mockedGetGuest.mockResolvedValue({ ok: true, data: savedGuest({ diTiec: "khong" }) });
    mockedSubmit.mockResolvedValue({
      ok: true,
      data: savedGuest({ diTiec: "co", soNguoi: 3, gheXeDi: 2, gheXeVe: 0 }),
    });
    const user = userEvent.setup();
    render(<RsvpForm />);
    await selectGuest(user);

    expect(screen.getByRole("radio", { name: "Không đến được" })).toBeChecked();
    expect(screen.queryByLabelText("Số người đi tiệc")).not.toBeInTheDocument();

    await fillAttending(user);
    await user.click(screen.getByRole("button", { name: "Gửi xác nhận" }));

    expect(mockedSubmit).toHaveBeenCalledWith({
      guestId: "g1",
      diTiec: "co",
      soNguoi: 3,
      xeDi: true,
      gheXeDi: 2,
      xeVe: false,
    });
  });

  it("uses a generic note when the answer has no confirmation time", async () => {
    mockedGetGuest.mockResolvedValue({ ok: true, data: savedGuest({ diTiec: "khong" }, null) });
    const user = userEvent.setup();
    render(<RsvpForm />);
    await selectGuest(user);

    expect(
      screen.getByText("Bạn đã xác nhận trước đó, có thể sửa lại bên dưới"),
    ).toBeInTheDocument();
  });

  it("shows a load error with 'Thử lại' that calls getGuest again", async () => {
    const first = deferred<ApiResult<GuestDetail>>();
    mockedGetGuest
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce({ ok: true, data: savedGuest({ diTiec: "khong" }) });
    const user = userEvent.setup();
    render(<RsvpForm />);
    await clickSelect(user);
    const alert = screen.getByRole("alert");
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Đang tải thông tin…");
    expect(alert).toBeEmptyDOMElement();

    first.resolve({ ok: false, code: "network", message: "Có lỗi kết nối, vui lòng thử lại" });

    expect(await screen.findByText("Có lỗi kết nối, vui lòng thử lại")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBe(alert);
    expect(alert).toHaveTextContent("Có lỗi kết nối, vui lòng thử lại");
    expect(screen.getByRole("status")).toBe(status);
    expect(status).toBeEmptyDOMElement();
    expect(screen.queryByRole("group", { name: "Bạn có đến dự tiệc không?" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đổi người" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Thử lại" }));

    expect(mockedGetGuest).toHaveBeenCalledTimes(2);
    expect(await screen.findByRole("radio", { name: "Không đến được" })).toBeChecked();
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
  });

  it("'Đổi người' works while loading and after a load error", async () => {
    const pending = deferred<ApiResult<GuestDetail>>();
    mockedGetGuest.mockReturnValueOnce(pending.promise).mockResolvedValueOnce({
      ok: false,
      code: "network",
      message: "Có lỗi kết nối, vui lòng thử lại",
    });
    const user = userEvent.setup();
    render(<RsvpForm />);

    await clickSelect(user);
    await user.click(screen.getByRole("button", { name: "Đổi người" }));
    expect(screen.getByRole("button", { name: "Chọn khách mẫu" })).toBeInTheDocument();

    await clickSelect(user);
    await screen.findByText("Có lỗi kết nối, vui lòng thử lại");
    await user.click(screen.getByRole("button", { name: "Đổi người" }));
    expect(screen.getByRole("button", { name: "Chọn khách mẫu" })).toBeInTheDocument();
  });

  it("ignores a stale response after the guest was changed", async () => {
    const stale = deferred<ApiResult<GuestDetail>>();
    mockedGetGuest
      .mockReturnValueOnce(stale.promise)
      .mockResolvedValueOnce({ ok: true, data: NOT_ANSWERED });
    const user = userEvent.setup();
    render(<RsvpForm />);

    await clickSelect(user);
    await user.click(screen.getByRole("button", { name: "Đổi người" }));
    await selectGuest(user);

    stale.resolve({ ok: true, data: savedGuest({ diTiec: "khong" }) });
    await stale.promise;

    expect(screen.getByRole("radio", { name: "Không đến được" })).not.toBeChecked();
    expect(screen.queryByText(/Bạn đã xác nhận/)).not.toBeInTheDocument();
  });

  it("after a submit, 'Sửa câu trả lời' shows the saved values and the new confirmation time", async () => {
    mockedGetGuest.mockResolvedValue({
      ok: true,
      data: savedGuest({ diTiec: "khong" }, "2026-11-01 08:00:00"),
    });
    mockedSubmit.mockResolvedValue({
      ok: true,
      data: savedGuest({ diTiec: "co", soNguoi: 4, gheXeDi: 0, gheXeVe: 3 }, "2026-11-02 20:15:03"),
    });
    const user = userEvent.setup();
    render(<RsvpForm />);
    await selectGuest(user);
    expect(screen.getByText(/08:00 ngày 01\/11\/2026/)).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Có, mình sẽ đến" }));
    await user.type(screen.getByLabelText("Số người đi tiệc"), "4");
    await chooseBus(user, "đi", "Không");
    await chooseBus(user, "về", "Có");
    await user.type(screen.getByLabelText("Số ghế chiều về"), "3");
    await user.click(screen.getByRole("button", { name: "Gửi xác nhận" }));

    await user.click(await screen.findByRole("button", { name: "Sửa câu trả lời" }));

    expect(
      screen.getByText("Bạn đã xác nhận lúc 20:15 ngày 02/11/2026, có thể sửa lại bên dưới"),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Có, mình sẽ đến" })).toBeChecked();
    expect(screen.getByLabelText("Số người đi tiệc")).toHaveValue(4);
    const xeDi = screen.getByRole("group", { name: /Đi xe khách chiều đi/ });
    expect(within(xeDi).getByRole("radio", { name: "Không" })).toBeChecked();
    expect(screen.getByLabelText("Số ghế chiều về")).toHaveValue(3);
    expect(mockedGetGuest).toHaveBeenCalledTimes(1);
  });
});

describe("formatConfirmedAt", () => {
  it("formats the Sheet timestamp as 'HH:mm ngày dd/MM/yyyy'", () => {
    expect(formatConfirmedAt("2026-11-02 20:15:03")).toBe("20:15 ngày 02/11/2026");
    expect(formatConfirmedAt(" 2027-01-05 08:04:59 ")).toBe("08:04 ngày 05/01/2027");
  });

  it("returns the value unchanged when it does not match the pattern", () => {
    expect(formatConfirmedAt("2026-11-02T20:15:03Z")).toBe("2026-11-02T20:15:03Z");
    expect(formatConfirmedAt("hôm qua")).toBe("hôm qua");
    expect(formatConfirmedAt("")).toBe("");
  });

  it("shows an unrecognised confirmation time raw in the note", async () => {
    mockedGetGuest.mockResolvedValue({ ok: true, data: savedGuest({ diTiec: "khong" }, "02/11/2026") });
    const user = userEvent.setup();
    render(<RsvpForm />);
    await selectGuest(user);
    expect(
      screen.getByText("Bạn đã xác nhận lúc 02/11/2026, có thể sửa lại bên dưới"),
    ).toBeInTheDocument();
  });
});
