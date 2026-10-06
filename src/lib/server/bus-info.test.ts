// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cacheLife } from "next/cache";
import { AppsScriptError, callAppsScript } from "./apps-script";
import { getBusInfo } from "./bus-info";

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
}));

vi.mock("./apps-script", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./apps-script")>();
  return { ...actual, callAppsScript: vi.fn() };
});

const callAppsScriptMock = vi.mocked(callAppsScript);
const cacheLifeMock = vi.mocked(cacheLife);

/** Simulates the Apps Script client: runs the helper's parser on raw `data`. */
function respondWith(data: unknown): void {
  callAppsScriptMock.mockImplementation(async (_action, _params, parse) =>
    parse(data),
  );
}

beforeEach(() => {
  callAppsScriptMock.mockReset();
  cacheLifeMock.mockReset();
});

describe("getBusInfo", () => {
  it("calls getBusInfo action and maps both directions", async () => {
    respondWith({
      xe_di_diem_don: "Công ty",
      xe_di_gio: "11:30",
      xe_ve_diem_don: "Nhà hàng A",
      xe_ve_gio: "17:30",
    });

    const result = await getBusInfo();

    expect(callAppsScriptMock).toHaveBeenCalledWith(
      "getBusInfo",
      {},
      expect.any(Function),
    );
    expect(result).toEqual({
      status: "ok",
      info: {
        di: { diemDon: "Công ty", gio: "11:30" },
        ve: { diemDon: "Nhà hàng A", gio: "17:30" },
      },
    });
  });

  it("sets the cache lifetime to exactly stale 60 / revalidate 240 / expire 3600", async () => {
    respondWith({
      xe_di_diem_don: "Công ty",
      xe_di_gio: "11:30",
      xe_ve_diem_don: "Nhà hàng A",
      xe_ve_gio: "17:30",
    });

    await getBusInfo();

    expect(cacheLifeMock).toHaveBeenCalledTimes(1);
    expect(cacheLifeMock).toHaveBeenCalledWith({
      stale: 60,
      revalidate: 240,
      expire: 3600,
    });
  });

  it("trims values", async () => {
    respondWith({
      xe_di_diem_don: "  Công ty ",
      xe_di_gio: " 11:30\n",
      xe_ve_diem_don: "\tNhà hàng A",
      xe_ve_gio: "17:30  ",
    });

    expect(await getBusInfo()).toEqual({
      status: "ok",
      info: {
        di: { diemDon: "Công ty", gio: "11:30" },
        ve: { diemDon: "Nhà hàng A", gio: "17:30" },
      },
    });
  });

  it("returns null for a direction with an empty pickup point", async () => {
    respondWith({
      xe_di_diem_don: "",
      xe_di_gio: "11:30",
      xe_ve_diem_don: "Nhà hàng A",
      xe_ve_gio: "17:30",
    });

    expect(await getBusInfo()).toEqual({
      status: "ok",
      info: { di: null, ve: { diemDon: "Nhà hàng A", gio: "17:30" } },
    });
  });

  it("returns null for a direction with a whitespace-only time", async () => {
    respondWith({
      xe_di_diem_don: "Công ty",
      xe_di_gio: "11:30",
      xe_ve_diem_don: "Nhà hàng A",
      xe_ve_gio: "   ",
    });

    expect(await getBusInfo()).toEqual({
      status: "ok",
      info: { di: { diemDon: "Công ty", gio: "11:30" }, ve: null },
    });
  });

  it("treats missing keys as empty", async () => {
    respondWith({ xe_ve_diem_don: "Nhà hàng A", xe_ve_gio: "17:30" });

    expect(await getBusInfo()).toEqual({
      status: "ok",
      info: { di: null, ve: { diemDon: "Nhà hàng A", gio: "17:30" } },
    });
  });

  it("returns both directions null when all values are empty", async () => {
    respondWith({});

    expect(await getBusInfo()).toEqual({
      status: "ok",
      info: { di: null, ve: null },
    });
  });

  it("rejects non-object data in the parser", async () => {
    let parseError: unknown;
    callAppsScriptMock.mockImplementation(async (_action, _params, parse) => {
      try {
        return parse(["not", "an", "object"]);
      } catch (error) {
        parseError = error;
        throw new AppsScriptError("upstream", { cause: error });
      }
    });

    expect(await getBusInfo()).toEqual({ status: "unavailable" });
    expect(parseError).toBeInstanceOf(Error);
  });

  it("rejects non-string values in the parser", async () => {
    let parseError: unknown;
    callAppsScriptMock.mockImplementation(async (_action, _params, parse) => {
      try {
        return parse({ xe_di_diem_don: 42 });
      } catch (error) {
        parseError = error;
        throw new AppsScriptError("upstream", { cause: error });
      }
    });

    expect(await getBusInfo()).toEqual({ status: "unavailable" });
    expect(parseError).toBeInstanceOf(Error);
  });

  it("returns unavailable on AppsScriptError", async () => {
    callAppsScriptMock.mockRejectedValue(new AppsScriptError("upstream"));

    expect(await getBusInfo()).toEqual({ status: "unavailable" });
  });

  it("returns unavailable on any other error", async () => {
    callAppsScriptMock.mockRejectedValue(new TypeError("boom"));

    expect(await getBusInfo()).toEqual({ status: "unavailable" });
  });

  it("does not keep a failure: the next call retries and succeeds", async () => {
    callAppsScriptMock.mockRejectedValueOnce(new AppsScriptError("upstream"));
    expect(await getBusInfo()).toEqual({ status: "unavailable" });

    respondWith({
      xe_di_diem_don: "Công ty",
      xe_di_gio: "11:30",
      xe_ve_diem_don: "",
      xe_ve_gio: "",
    });
    expect(await getBusInfo()).toEqual({
      status: "ok",
      info: { di: { diemDon: "Công ty", gio: "11:30" }, ve: null },
    });
    expect(callAppsScriptMock).toHaveBeenCalledTimes(2);
  });
});
