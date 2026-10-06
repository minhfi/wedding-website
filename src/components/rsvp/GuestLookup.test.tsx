import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { searchGuests } from "@/lib/api-client";
import type { ApiResult } from "@/lib/api-client";
import type { GuestSuggestion } from "@/lib/types";
import { GuestLookup } from "./GuestLookup";

vi.mock("@/lib/api-client", () => ({
  searchGuests: vi.fn(),
}));

const mockedSearch = vi.mocked(searchGuests);

const AN: GuestSuggestion = { id: "g1", ten: "Nguyễn Văn An" };
const AN_2: GuestSuggestion = { id: "g2", ten: "Nguyễn Văn An" };
const BINH: GuestSuggestion = { id: "g3", ten: "Trần Thị Bình" };

function ok(data: GuestSuggestion[]): Promise<ApiResult<GuestSuggestion[]>> {
  return Promise.resolve({ ok: true, data });
}

function setup(props: { focusOnMount?: boolean } = {}) {
  const onSelect = vi.fn();
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<GuestLookup onSelect={onSelect} {...props} />);
  return { user, onSelect };
}

async function flushDebounce() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  mockedSearch.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("GuestLookup", () => {
  it("renders a Tên/SĐT radio toggle with name mode selected by default", () => {
    setup();
    const group = screen.getByRole("radiogroup", { name: "Tìm theo" });
    expect(within(group).getByRole("radio", { name: "Tên" })).toBeChecked();
    expect(within(group).getByRole("radio", { name: "SĐT" })).not.toBeChecked();
    const input = screen.getByRole("combobox", { name: "Tìm tên của bạn" });
    expect(input).toHaveAttribute("placeholder", "Nguyễn Văn A…");
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).toHaveAttribute("name", "guest-search");
    expect(input).toHaveAttribute("autocomplete", "off");
    expect(input).toHaveAttribute("spellcheck", "false");
  });

  it("does not move focus on mount by default", () => {
    setup();
    expect(screen.getByRole("combobox")).not.toHaveFocus();
  });

  it("focuses the input on mount when focusOnMount is set", () => {
    setup({ focusOnMount: true });
    expect(screen.getByRole("combobox")).toHaveFocus();
  });

  it("only references the listbox with aria-controls while it is rendered", async () => {
    mockedSearch.mockReturnValue(ok([AN]));
    const { user } = setup();
    const input = screen.getByRole("combobox");
    expect(input).not.toHaveAttribute("aria-controls");
    await user.type(input, "Ng");
    await flushDebounce();
    const listbox = await screen.findByRole("listbox");
    expect(input).toHaveAttribute("aria-controls", listbox.id);
    await user.keyboard("{Escape}");
    expect(input).not.toHaveAttribute("aria-controls");
  });

  it("keeps the results and shows no spinner when only whitespace is added", async () => {
    mockedSearch.mockReturnValue(ok([AN]));
    const { user } = setup();
    const input = screen.getByRole("combobox");
    await user.type(input, "nguyen");
    await flushDebounce();
    await screen.findByRole("option", { name: AN.ten });

    await user.type(input, " ");
    await flushDebounce();

    expect(screen.getByRole("option", { name: AN.ten })).toBeInTheDocument();
    expect(screen.queryByText("Đang tìm…")).not.toBeInTheDocument();
    expect(mockedSearch).toHaveBeenCalledTimes(1);
  });

  it("announces the number of suggestions in the status region", async () => {
    mockedSearch.mockReturnValue(ok([AN, BINH]));
    const { user } = setup();
    await user.type(screen.getByRole("combobox"), "Ng");
    await flushDebounce();
    await screen.findByRole("listbox");
    expect(screen.getByRole("status")).toHaveTextContent(
      "2 gợi ý, dùng phím mũi tên để chọn",
    );
  });

  it("closes the list when the input loses focus and reopens it on focus", async () => {
    mockedSearch.mockReturnValue(ok([AN]));
    const { user } = setup();
    const input = screen.getByRole("combobox");
    await user.type(input, "Ng");
    await flushDebounce();
    await screen.findByRole("listbox");

    await user.tab();
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    await user.click(input);
    expect(input).toHaveAttribute("aria-expanded", "true");
  });

  it("switches to phone mode with a tel input", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("radio", { name: "SĐT" }));
    const input = screen.getByRole("combobox", { name: "Nhập số điện thoại" });
    expect(input).toHaveAttribute("inputMode", "tel");
    expect(input).toHaveAttribute("placeholder", "09xx xxx xxx");
  });

  it("debounces 300 ms and searches by name with the trimmed query", async () => {
    mockedSearch.mockReturnValue(ok([AN]));
    const { user } = setup();
    await user.type(screen.getByRole("combobox"), "  An");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(mockedSearch).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(mockedSearch).toHaveBeenCalledTimes(1);
    expect(mockedSearch).toHaveBeenCalledWith("ten", "An", expect.any(AbortSignal));
  });

  it("makes no request and shows nothing below the minimum length", async () => {
    const { user } = setup();
    await user.type(screen.getByRole("combobox"), "A");
    await flushDebounce();
    expect(mockedSearch).not.toHaveBeenCalled();
    expect(screen.queryByText("Đang tìm…")).not.toBeInTheDocument();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "SĐT" }));
    await user.type(screen.getByRole("combobox"), "09");
    await flushDebounce();
    expect(mockedSearch).not.toHaveBeenCalled();

    mockedSearch.mockReturnValue(ok([AN]));
    await user.type(screen.getByRole("combobox"), "0");
    await flushDebounce();
    expect(mockedSearch).toHaveBeenCalledWith("sdt", "090", expect.any(AbortSignal));
  });

  it("shows a searching state while the request is pending", async () => {
    mockedSearch.mockReturnValue(new Promise(() => {}));
    const { user } = setup();
    await user.type(screen.getByRole("combobox"), "An");
    await flushDebounce();
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("Đang tìm…");
  });

  it("aborts the stale request when the input changes", async () => {
    let firstSignal: AbortSignal | undefined;
    mockedSearch.mockImplementationOnce((_by, _q, signal) => {
      firstSignal = signal;
      return new Promise(() => {});
    });
    mockedSearch.mockReturnValueOnce(ok([BINH]));
    const { user } = setup();
    const input = screen.getByRole("combobox");
    await user.type(input, "An");
    await flushDebounce();
    expect(firstSignal?.aborted).toBe(false);

    await user.type(input, "h");
    expect(firstSignal?.aborted).toBe(true);
    await flushDebounce();
    expect(mockedSearch).toHaveBeenLastCalledWith("ten", "Anh", expect.any(AbortSignal));
    expect(await screen.findByRole("option", { name: BINH.ten })).toBeInTheDocument();
  });

  it("aborts the pending request on unmount", async () => {
    let signal: AbortSignal | undefined;
    mockedSearch.mockImplementation((_by, _q, s) => {
      signal = s;
      return new Promise(() => {});
    });
    const onSelect = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { unmount } = render(<GuestLookup onSelect={onSelect} />);
    await user.type(screen.getByRole("combobox"), "An");
    await flushDebounce();
    unmount();
    expect(signal?.aborted).toBe(true);
  });

  it("lists suggestions by name only, keeping duplicate names as separate options", async () => {
    mockedSearch.mockReturnValue(ok([AN, AN_2, BINH]));
    const { user } = setup();
    const input = screen.getByRole("combobox");
    await user.type(input, "Ng");
    await flushDebounce();
    const listbox = await screen.findByRole("listbox");
    const options = within(listbox).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([AN.ten, AN_2.ten, BINH.ten]);
    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(input).toHaveAttribute("aria-controls", listbox.id);
  });

  it("selects a suggestion on click and calls onSelect with id and ten", async () => {
    mockedSearch.mockReturnValue(ok([AN, AN_2]));
    const { user, onSelect } = setup();
    await user.type(screen.getByRole("combobox"), "Ng");
    await flushDebounce();
    const options = await screen.findAllByRole("option");
    await user.click(options[1]);
    expect(onSelect).toHaveBeenCalledWith({ id: "g2", ten: "Nguyễn Văn An" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("supports ArrowDown/ArrowUp/Enter keyboard selection", async () => {
    mockedSearch.mockReturnValue(ok([AN, BINH]));
    const { user, onSelect } = setup();
    const input = screen.getByRole("combobox");
    await user.type(input, "Ng");
    await flushDebounce();
    const options = await screen.findAllByRole("option");

    await user.keyboard("{ArrowDown}");
    expect(input).toHaveAttribute("aria-activedescendant", options[0].id);
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowDown}");
    expect(input).toHaveAttribute("aria-activedescendant", options[1].id);
    expect(options[0]).toHaveAttribute("aria-selected", "false");
    await user.keyboard("{ArrowDown}");
    expect(input).toHaveAttribute("aria-activedescendant", options[1].id);
    await user.keyboard("{ArrowUp}");
    expect(input).toHaveAttribute("aria-activedescendant", options[0].id);

    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith(AN);
  });

  it("closes the list on Escape", async () => {
    mockedSearch.mockReturnValue(ok([AN]));
    const { user, onSelect } = setup();
    const input = screen.getByRole("combobox");
    await user.type(input, "Ng");
    await flushDebounce();
    await screen.findByRole("listbox");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).not.toHaveAttribute("aria-activedescendant");
    await user.keyboard("{Enter}");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("shows the no-match message with a contact hint", async () => {
    mockedSearch.mockReturnValue(ok([]));
    const { user } = setup();
    await user.type(screen.getByRole("combobox"), "Zz");
    await flushDebounce();
    expect(
      await screen.findByText("Không tìm thấy tên trong danh sách khách mời"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Nếu không thấy tên, bạn nhắn cho cô dâu chú rể nhé."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("shows the error message and retries the last query with Thử lại", async () => {
    mockedSearch.mockResolvedValueOnce({
      ok: false,
      code: "network",
      message: "Có lỗi kết nối, vui lòng thử lại",
    });
    mockedSearch.mockReturnValueOnce(ok([AN]));
    const { user } = setup();
    await user.type(screen.getByRole("combobox"), "An");
    await flushDebounce();
    expect(
      await screen.findByText("Có lỗi kết nối, vui lòng thử lại"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Thử lại" }));
    await flushDebounce();
    expect(mockedSearch).toHaveBeenCalledTimes(2);
    expect(mockedSearch).toHaveBeenLastCalledWith("ten", "An", expect.any(AbortSignal));
    expect(await screen.findByRole("option", { name: AN.ten })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Thử lại" })).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveFocus();
  });

  it("ignores aborted results", async () => {
    mockedSearch.mockResolvedValue({ ok: false, code: "aborted", message: "" });
    const { user } = setup();
    await user.type(screen.getByRole("combobox"), "An");
    await flushDebounce();
    expect(screen.queryByRole("button", { name: "Thử lại" })).not.toBeInTheDocument();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("clears the input and results when switching mode", async () => {
    mockedSearch.mockReturnValue(ok([AN]));
    const { user } = setup();
    await user.type(screen.getByRole("combobox"), "An");
    await flushDebounce();
    await screen.findByRole("listbox");
    await user.click(screen.getByRole("radio", { name: "SĐT" }));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Nhập số điện thoại" })).toHaveValue("");
  });
});
