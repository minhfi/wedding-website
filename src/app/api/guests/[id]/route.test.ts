// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppsScriptError, callAppsScript } from "@/lib/server/apps-script";
import { GET } from "./route";

vi.mock("@/lib/server/apps-script", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/apps-script")>();
  return { ...actual, callAppsScript: vi.fn() };
});

const callAppsScriptMock = vi.mocked(callAppsScript);

/**
 * Feeds the fixture through the parse function getGuestDetail passes, so the real guard runs.
 * Like the real client, a guard failure surfaces as AppsScriptError("upstream").
 */
function respondWith(data: unknown): void {
  callAppsScriptMock.mockImplementation(async (_action, _params, parse) => {
    try {
      return parse(data);
    } catch (error) {
      throw new AppsScriptError("upstream", { cause: error });
    }
  });
}

function failWith(error: unknown): void {
  callAppsScriptMock.mockRejectedValue(error);
}

async function callGet(id: string): Promise<Response> {
  const request = new Request(`http://localhost/api/guests/${encodeURIComponent(id)}`);
  return GET(request, { params: Promise.resolve({ id }) });
}

const SHEET_ROW = {
  id: "K001",
  ten: "Nguyễn Văn An",
  sdt: "0901 234 567",
  di_tiec: "Có",
  so_nguoi: 3,
  ghe_xe_di: 2,
  ghe_xe_ve: "",
  cap_nhat_luc: "2026-11-02 20:15:03",
};

describe("GET /api/guests/[id]", () => {
  beforeEach(() => {
    callAppsScriptMock.mockReset();
  });

  it("returns 200 with the mapped GuestDetail and no sdt", async () => {
    respondWith(SHEET_ROW);

    const response = await callGet("K001");
    const body: unknown = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      id: "K001",
      ten: "Nguyễn Văn An",
      rsvp: { diTiec: "co", soNguoi: 3, gheXeDi: 2, gheXeVe: 0 },
      capNhatLuc: "2026-11-02 20:15:03",
    });
    expect(body).not.toHaveProperty("sdt");
    expect(JSON.stringify(body)).not.toContain("0901");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(callAppsScriptMock).toHaveBeenCalledWith(
      "getGuest",
      { id: "K001" },
      expect.any(Function),
    );
  });

  it("returns rsvp null and capNhatLuc null for an unanswered guest", async () => {
    respondWith({ ...SHEET_ROW, di_tiec: "", so_nguoi: "", ghe_xe_di: "", cap_nhat_luc: "" });

    const response = await callGet("K001");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      id: "K001",
      ten: "Nguyễn Văn An",
      rsvp: null,
      capNhatLuc: null,
    });
  });

  it("trims the id before looking it up", async () => {
    respondWith(SHEET_ROW);

    await callGet("  K001 ");

    expect(callAppsScriptMock).toHaveBeenCalledWith(
      "getGuest",
      { id: "K001" },
      expect.any(Function),
    );
  });

  it.each(["", "   "])("returns 400 bad_request for an empty id %j", async (id) => {
    const response = await callGet(id);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "bad_request", message: expect.any(String) },
    });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(callAppsScriptMock).not.toHaveBeenCalled();
  });

  it("returns 404 not_found when the guest does not exist", async () => {
    failWith(new AppsScriptError("not_found"));

    const response = await callGet("K999");

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "not_found", message: "Không tìm thấy khách mời" },
    });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns 502 upstream when Apps Script fails", async () => {
    failWith(new AppsScriptError("upstream"));

    const response = await callGet("K001");

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: { code: "upstream", message: "Không tải được thông tin, vui lòng thử lại" },
    });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns 502 upstream when the row fails the real guard", async () => {
    respondWith({ ...SHEET_ROW, so_nguoi: "ba" });

    const response = await callGet("K001");

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: { code: "upstream", message: "Không tải được thông tin, vui lòng thử lại" },
    });
  });

  it("maps unauthorized to 502 upstream", async () => {
    failWith(new AppsScriptError("unauthorized"));

    const response = await callGet("K001");

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: { code: "upstream", message: "Không tải được thông tin, vui lòng thử lại" },
    });
  });

  it("returns 500 server_error for unexpected errors", async () => {
    failWith(new Error("boom"));

    const response = await callGet("K001");

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: { code: "server_error", message: "Không tải được thông tin, vui lòng thử lại" },
    });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
