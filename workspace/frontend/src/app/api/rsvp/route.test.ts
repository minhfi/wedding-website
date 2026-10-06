// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppsScriptError, callAppsScript } from "@/lib/server/apps-script";
import { POST } from "./route";

vi.mock("@/lib/server/apps-script", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/apps-script")>();
  return { ...actual, callAppsScript: vi.fn() };
});

const callAppsScriptMock = vi.mocked(callAppsScript);

const SAVED_ROW = {
  id: "K001",
  ten: "Nguyễn Văn An",
  sdt: "0901234567",
  di_tiec: "Có",
  so_nguoi: 3,
  ghe_xe_di: 2,
  ghe_xe_ve: "",
  cap_nhat_luc: "2026-11-02 20:15:03",
};

/** Feeds the row through the parse function the route passes, so its guard runs. */
function respondWith(row: unknown): void {
  callAppsScriptMock.mockImplementation(async (_action, _params, parse) => parse(row));
}

function postRequest(body: string): Request {
  return new Request("http://localhost/api/rsvp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

function postJson(value: unknown): Request {
  return postRequest(JSON.stringify(value));
}

const VALID_ATTENDING = {
  guestId: "K001",
  diTiec: "co",
  soNguoi: 3,
  xeDi: true,
  gheXeDi: 2,
  xeVe: false,
};

beforeEach(() => {
  callAppsScriptMock.mockReset();
});

describe("POST /api/rsvp", () => {
  it("submits an attending RSVP and returns the saved guest", async () => {
    respondWith(SAVED_ROW);

    const response = await POST(postJson(VALID_ATTENDING));

    expect(callAppsScriptMock).toHaveBeenCalledTimes(1);
    expect(callAppsScriptMock).toHaveBeenCalledWith(
      "submitRsvp",
      { id: "K001", di_tiec: "Có", so_nguoi: 3, ghe_xe_di: 2, ghe_xe_ve: 0 },
      expect.any(Function),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const text = await response.text();
    expect(text).not.toContain("sdt");
    expect(JSON.parse(text)).toEqual({
      ok: true,
      guest: {
        id: "K001",
        ten: "Nguyễn Văn An",
        rsvp: { diTiec: "co", soNguoi: 3, gheXeDi: 2, gheXeVe: 0 },
        capNhatLuc: "2026-11-02 20:15:03",
      },
    });
  });

  it("submits a not-attending RSVP with empty counts", async () => {
    respondWith({ ...SAVED_ROW, di_tiec: "Không", so_nguoi: "", ghe_xe_di: "" });

    const response = await POST(postJson({ guestId: "K001", diTiec: "khong" }));

    expect(callAppsScriptMock).toHaveBeenCalledWith(
      "submitRsvp",
      { id: "K001", di_tiec: "Không", so_nguoi: "", ghe_xe_di: "", ghe_xe_ve: "" },
      expect.any(Function),
    );
    expect(response.status).toBe(200);
    const body: unknown = await response.json();
    expect(body).toMatchObject({ ok: true, guest: { rsvp: { diTiec: "khong" } } });
  });

  it("rejects an invalid body with 400 invalid and field errors, without calling Apps Script", async () => {
    const response = await POST(
      postJson({ guestId: "K001", diTiec: "co", soNguoi: 2, xeDi: true, gheXeDi: 5, xeVe: false }),
    );

    expect(callAppsScriptMock).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({
      error: {
        code: "invalid",
        message: "Thông tin xác nhận chưa hợp lệ",
        fields: { gheXeDi: "Số ghế không được nhiều hơn số người đi tiệc" },
      },
    });
  });

  it("rejects a non-object JSON body with 400 invalid", async () => {
    const response = await POST(postJson(null));

    expect(callAppsScriptMock).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    const body: unknown = await response.json();
    expect(body).toMatchObject({ error: { code: "invalid", fields: { guestId: expect.any(String) } } });
  });

  it("rejects malformed JSON with 400 bad_request", async () => {
    const response = await POST(postRequest("{not json"));

    expect(callAppsScriptMock).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body: unknown = await response.json();
    expect(body).toMatchObject({ error: { code: "bad_request", message: expect.any(String) } });
  });

  it("returns 404 not_found for an unknown guest id", async () => {
    callAppsScriptMock.mockRejectedValue(new AppsScriptError("not_found"));

    const response = await POST(postJson(VALID_ATTENDING));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "not_found", message: "Không tìm thấy khách mời" },
    });
  });

  it.each(["upstream", "unauthorized"] as const)(
    "returns 502 upstream when Apps Script fails with %s",
    async (code) => {
      callAppsScriptMock.mockRejectedValue(new AppsScriptError(code));

      const response = await POST(postJson(VALID_ATTENDING));

      expect(response.status).toBe(502);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(await response.json()).toEqual({
        error: { code: "upstream", message: "Không lưu được xác nhận, vui lòng thử lại" },
      });
    },
  );

  it("returns 502 upstream when the saved row has an unexpected shape", async () => {
    callAppsScriptMock.mockImplementation(async (_action, _params, parse) => {
      try {
        return parse({ id: "K001" });
      } catch (error) {
        throw new AppsScriptError("upstream", { cause: error });
      }
    });

    const response = await POST(postJson(VALID_ATTENDING));

    expect(response.status).toBe(502);
  });

  it("returns 500 server_error for unexpected errors", async () => {
    callAppsScriptMock.mockRejectedValue(new Error("boom"));

    const response = await POST(postJson(VALID_ATTENDING));

    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).not.toContain("boom");
    expect(JSON.parse(text)).toMatchObject({ error: { code: "server_error" } });
  });
});
