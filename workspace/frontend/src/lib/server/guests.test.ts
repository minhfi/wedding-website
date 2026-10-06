// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cacheLife } from "next/cache";
import { AppsScriptError, callAppsScript, type AppsScriptAction } from "./apps-script";
import {
  getGuestDetail,
  getGuestIndex,
  mapSheetGuest,
  parseSheetGuestRow,
  searchGuests,
  toSheetRsvp,
  type SheetGuestRow,
} from "./guests";

vi.mock("next/cache", () => ({ cacheLife: vi.fn() }));

vi.mock("./apps-script", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./apps-script")>();
  return { ...actual, callAppsScript: vi.fn() };
});

const callAppsScriptMock = vi.mocked(callAppsScript);

/** Feeds fixture data through the parse function the module passes, so its guards run. */
function respondWith(fixtures: Partial<Record<AppsScriptAction, unknown>>): void {
  callAppsScriptMock.mockImplementation(async (action, _params, parse) =>
    parse(fixtures[action]),
  );
}

const GUEST_LIST = [
  { id: "K003", ten: "Trần Thị Bình", sdt: "+84 912 345 678" },
  { id: "K001", ten: "Nguyễn Văn An", sdt: "0901 234 567" },
  { id: "K002", ten: "Đặng Văn Đức", sdt: "" },
  { id: "", ten: "Không có id", sdt: "0909000000" },
  { id: "K004", ten: "", sdt: "0909111111" },
  { id: "K005", ten: "Nguyễn Thị Ánh", sdt: "0901999888" },
];

function sheetRow(overrides: Partial<SheetGuestRow> = {}): SheetGuestRow {
  return {
    id: "K001",
    ten: "Nguyễn Văn An",
    di_tiec: "",
    so_nguoi: "",
    ghe_xe_di: "",
    ghe_xe_ve: "",
    cap_nhat_luc: "",
    ...overrides,
  };
}

beforeEach(() => {
  callAppsScriptMock.mockReset();
  vi.mocked(cacheLife).mockClear();
});

describe("getGuestIndex", () => {
  it("builds index entries from listGuests, skipping rows without id or ten", async () => {
    respondWith({ listGuests: GUEST_LIST });

    const index = await getGuestIndex();

    expect(callAppsScriptMock).toHaveBeenCalledWith("listGuests", {}, expect.any(Function));
    expect(index).toEqual([
      { id: "K003", ten: "Trần Thị Bình", tenNorm: "tran thi binh", sdtNorm: "0912345678" },
      { id: "K001", ten: "Nguyễn Văn An", tenNorm: "nguyen van an", sdtNorm: "0901234567" },
      { id: "K002", ten: "Đặng Văn Đức", tenNorm: "dang van duc", sdtNorm: null },
      { id: "K005", ten: "Nguyễn Thị Ánh", tenNorm: "nguyen thi anh", sdtNorm: "0901999888" },
    ]);
  });

  it("sets the 'minutes' cache life", async () => {
    respondWith({ listGuests: [] });

    await getGuestIndex();

    expect(cacheLife).toHaveBeenCalledWith("minutes");
  });

  it("rejects with upstream-style parse failure when listGuests data is malformed", async () => {
    respondWith({ listGuests: [{ id: "K001", ten: 42, sdt: "" }] });

    await expect(getGuestIndex()).rejects.toThrow();
  });

  it("rejects when listGuests data is not an array", async () => {
    respondWith({ listGuests: { id: "K001" } });

    await expect(getGuestIndex()).rejects.toThrow();
  });

  it("propagates AppsScriptError", async () => {
    callAppsScriptMock.mockRejectedValue(new AppsScriptError("upstream"));

    await expect(getGuestIndex()).rejects.toBeInstanceOf(AppsScriptError);
  });
});

describe("searchGuests", () => {
  beforeEach(() => {
    respondWith({ listGuests: GUEST_LIST });
  });

  it("rethrows a non-AppsScriptError from the cached index as AppsScriptError upstream", async () => {
    // Errors crossing a 'use cache' boundary lose their class, so the route can't match them.
    callAppsScriptMock.mockRejectedValue(new Error("Apps Script request failed: upstream"));
    await expect(searchGuests("ten", "an")).rejects.toMatchObject({
      name: "AppsScriptError",
      code: "upstream",
    });
    await expect(searchGuests("ten", "an")).rejects.toBeInstanceOf(AppsScriptError);
  });

  it("returns [] for a name query shorter than 2 characters", async () => {
    expect(await searchGuests("ten", "n")).toEqual([]);
    expect(await searchGuests("ten", "  ")).toEqual([]);
  });

  it("returns [] for a phone query with fewer than 3 digits", async () => {
    expect(await searchGuests("sdt", "09")).toEqual([]);
    expect(await searchGuests("sdt", "0a9")).toEqual([]);
  });

  it("does not call Apps Script below the minimum length", async () => {
    await searchGuests("ten", "a");
    await searchGuests("sdt", "1");

    expect(callAppsScriptMock).not.toHaveBeenCalled();
  });

  it("matches names ignoring diacritics and case, sorted by ten", async () => {
    const result = await searchGuests("ten", "NGUYEN");

    expect(result).toEqual([
      { id: "K005", ten: "Nguyễn Thị Ánh" },
      { id: "K001", ten: "Nguyễn Văn An" },
    ]);
  });

  it("matches đ as d", async () => {
    expect(await searchGuests("ten", "duc")).toEqual([{ id: "K002", ten: "Đặng Văn Đức" }]);
  });

  it("matches phone by normalized prefix, including +84", async () => {
    expect(await searchGuests("sdt", "0901")).toEqual([
      { id: "K005", ten: "Nguyễn Thị Ánh" },
      { id: "K001", ten: "Nguyễn Văn An" },
    ]);
    expect(await searchGuests("sdt", "+84 912")).toEqual([{ id: "K003", ten: "Trần Thị Bình" }]);
  });

  it("returns objects with exactly the keys id and ten", async () => {
    const result = await searchGuests("sdt", "0901");

    expect(result.length).toBeGreaterThan(0);
    for (const item of result) {
      expect(Object.keys(item).sort()).toEqual(["id", "ten"]);
    }
  });

  it("returns [] when nothing matches", async () => {
    expect(await searchGuests("ten", "xyz")).toEqual([]);
  });

  it("returns at most 8 suggestions", async () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      id: `G${String(i).padStart(2, "0")}`,
      ten: `Khách ${String.fromCharCode(76 - i)}`,
      sdt: "",
    }));
    respondWith({ listGuests: many });

    const result = await searchGuests("ten", "khach");

    expect(result).toHaveLength(8);
    expect(result[0]).toEqual({ id: "G11", ten: "Khách A" });
    expect(result[7]).toEqual({ id: "G04", ten: "Khách H" });
  });
});

describe("parseSheetGuestRow", () => {
  it("accepts a valid row with numbers or empty strings", () => {
    const row = sheetRow({ di_tiec: "Có", so_nguoi: 3, ghe_xe_di: 2, ghe_xe_ve: "" });

    expect(parseSheetGuestRow(row)).toEqual(row);
  });

  it("throws on missing fields or wrong types", () => {
    expect(() => parseSheetGuestRow(null)).toThrow();
    expect(() => parseSheetGuestRow([])).toThrow();
    expect(() => parseSheetGuestRow({ id: "K001", ten: "An" })).toThrow();
    expect(() => parseSheetGuestRow({ ...sheetRow(), so_nguoi: "3" })).toThrow();
    expect(() => parseSheetGuestRow({ ...sheetRow(), cap_nhat_luc: 5 })).toThrow();
  });

  it("drops unknown extra fields such as sdt", () => {
    const parsed = parseSheetGuestRow({ ...sheetRow(), sdt: "0901234567" });

    expect(parsed).not.toHaveProperty("sdt");
  });
});

describe("mapSheetGuest", () => {
  it("maps an unanswered row to rsvp null", () => {
    expect(mapSheetGuest(sheetRow())).toEqual({
      id: "K001",
      ten: "Nguyễn Văn An",
      rsvp: null,
      capNhatLuc: null,
    });
  });

  it("maps 'Có' with counts and empty seats as 0", () => {
    const detail = mapSheetGuest(
      sheetRow({
        di_tiec: "Có",
        so_nguoi: 3,
        ghe_xe_di: 2,
        ghe_xe_ve: "",
        cap_nhat_luc: "2026-11-02 20:15:03",
      }),
    );

    expect(detail).toEqual({
      id: "K001",
      ten: "Nguyễn Văn An",
      rsvp: { diTiec: "co", soNguoi: 3, gheXeDi: 2, gheXeVe: 0 },
      capNhatLuc: "2026-11-02 20:15:03",
    });
  });

  it("maps 'Không' to diTiec khong", () => {
    const detail = mapSheetGuest(
      sheetRow({ di_tiec: "Không", cap_nhat_luc: "2026-11-02 20:15:03" }),
    );

    expect(detail.rsvp).toEqual({ diTiec: "khong" });
  });

  it("maps unexpected di_tiec values to rsvp null", () => {
    expect(mapSheetGuest(sheetRow({ di_tiec: "Maybe" })).rsvp).toBeNull();
  });

  it("treats 'Có' with missing or invalid so_nguoi as not answered", () => {
    expect(mapSheetGuest(sheetRow({ di_tiec: "Có", so_nguoi: "" })).rsvp).toBeNull();
    expect(mapSheetGuest(sheetRow({ di_tiec: "Có", so_nguoi: 0 })).rsvp).toBeNull();
    expect(mapSheetGuest(sheetRow({ di_tiec: "Có", so_nguoi: 2.5 })).rsvp).toBeNull();
    expect(mapSheetGuest(sheetRow({ di_tiec: "Có", so_nguoi: 11 })).rsvp).toBeNull();
  });

  it("treats 'Có' with invalid seat counts as not answered", () => {
    expect(
      mapSheetGuest(sheetRow({ di_tiec: "Có", so_nguoi: 2, ghe_xe_di: -1 })).rsvp,
    ).toBeNull();
  });
});

describe("toSheetRsvp", () => {
  it("leaves all counts empty when not attending", () => {
    expect(toSheetRsvp({ diTiec: "khong" })).toEqual({
      di_tiec: "Không",
      so_nguoi: "",
      ghe_xe_di: "",
      ghe_xe_ve: "",
    });
  });

  it("writes counts when attending, with 0 seats for a direction without bus", () => {
    expect(toSheetRsvp({ diTiec: "co", soNguoi: 3, gheXeDi: 2, gheXeVe: 0 })).toEqual({
      di_tiec: "Có",
      so_nguoi: 3,
      ghe_xe_di: 2,
      ghe_xe_ve: 0,
    });
  });
});

describe("getGuestDetail", () => {
  it("calls getGuest with the id and maps the row", async () => {
    respondWith({ getGuest: sheetRow({ di_tiec: "Không", cap_nhat_luc: "2026-11-02 20:15:03" }) });

    const detail = await getGuestDetail("K001");

    expect(callAppsScriptMock).toHaveBeenCalledWith(
      "getGuest",
      { id: "K001" },
      expect.any(Function),
    );
    expect(detail).toEqual({
      id: "K001",
      ten: "Nguyễn Văn An",
      rsvp: { diTiec: "khong" },
      capNhatLuc: "2026-11-02 20:15:03",
    });
  });

  it("propagates AppsScriptError codes", async () => {
    callAppsScriptMock.mockRejectedValue(new AppsScriptError("not_found"));

    await expect(getGuestDetail("K999")).rejects.toMatchObject({ code: "not_found" });
  });

  it("rejects when the row is malformed", async () => {
    respondWith({ getGuest: { id: "K001" } });

    await expect(getGuestDetail("K001")).rejects.toThrow();
  });
});
