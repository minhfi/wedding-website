import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getGuest, searchGuests, submitRsvp } from "./api-client";
import type { RsvpInput } from "./rsvp-validation";

const FALLBACK = "Có lỗi kết nối, vui lòng thử lại";

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function lastCall() {
  const call = fetchMock.mock.calls.at(-1);
  if (!call) {
    throw new Error("fetch was not called");
  }
  const [input, init] = call;
  return { url: String(input), init };
}

const guestBody = {
  id: "K001",
  ten: "Nguyễn Văn An",
  rsvp: { diTiec: "co", soNguoi: 3, gheXeDi: 2, gheXeVe: 0 },
  capNhatLuc: "2026-11-02 20:15:03",
};

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("searchGuests", () => {
  it("requests the search route with encoded query params and the signal", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ items: [] }));
    const controller = new AbortController();

    await searchGuests("ten", "Văn An&x", controller.signal);

    const { url, init } = lastCall();
    const expected = new URLSearchParams({ by: "ten", q: "Văn An&x" });
    expect(url).toBe(`/api/guests/search?${expected.toString()}`);
    expect(init?.signal).toBe(controller.signal);
  });

  it("returns suggestions mapped to exactly { id, ten }", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        items: [
          { id: "K001", ten: "Nguyễn Văn An", sdt: "0901234567" },
          { id: "K002", ten: "Trần Thị Bình" },
        ],
      }),
    );

    const result = await searchGuests("sdt", "090");

    expect(result).toEqual({
      ok: true,
      data: [
        { id: "K001", ten: "Nguyễn Văn An" },
        { id: "K002", ten: "Trần Thị Bình" },
      ],
    });
    if (result.ok) {
      expect(Object.keys(result.data[0])).toEqual(["id", "ten"]);
    }
  });

  it("returns an empty list for no matches", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ items: [] }));
    expect(await searchGuests("ten", "zz")).toEqual({ ok: true, data: [] });
  });

  it.each([
    { items: [{ id: 1, ten: "A" }] },
    { items: [{ id: "K001" }] },
    { items: "nope" },
    { items: [null] },
    {},
    [],
  ])("rejects malformed success body %j", async (body) => {
    fetchMock.mockResolvedValue(jsonResponse(body));
    expect(await searchGuests("ten", "an")).toEqual({
      ok: false,
      code: "unknown",
      message: FALLBACK,
    });
  });

  it("maps an error body to its code and message", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: { code: "upstream", message: "Hệ thống đang bận" } }, 502),
    );
    expect(await searchGuests("ten", "an")).toEqual({
      ok: false,
      code: "upstream",
      message: "Hệ thống đang bận",
    });
  });

  it("returns code aborted when the request is aborted", async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation(() => {
      controller.abort();
      return Promise.reject(new DOMException("The operation was aborted.", "AbortError"));
    });

    expect(await searchGuests("ten", "an", controller.signal)).toEqual({
      ok: false,
      code: "aborted",
      message: "",
    });
  });

  it("returns code network when fetch rejects", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    expect(await searchGuests("ten", "an")).toEqual({
      ok: false,
      code: "network",
      message: FALLBACK,
    });
  });
});

describe("getGuest", () => {
  it("requests the guest route with an encoded id", async () => {
    fetchMock.mockResolvedValue(jsonResponse(guestBody));
    await getGuest("K 01/x");
    expect(lastCall().url).toBe("/api/guests/K%2001%2Fx");
  });

  it("parses an attending guest", async () => {
    fetchMock.mockResolvedValue(jsonResponse(guestBody));
    expect(await getGuest("K001")).toEqual({ ok: true, data: guestBody });
  });

  it("parses a non-attending guest", async () => {
    const body = { ...guestBody, rsvp: { diTiec: "khong" } };
    fetchMock.mockResolvedValue(jsonResponse(body));
    expect(await getGuest("K001")).toEqual({ ok: true, data: body });
  });

  it("parses a guest without an RSVP", async () => {
    const body = { id: "K001", ten: "Nguyễn Văn An", rsvp: null, capNhatLuc: null };
    fetchMock.mockResolvedValue(jsonResponse(body));
    expect(await getGuest("K001")).toEqual({ ok: true, data: body });
  });

  it("drops unknown keys from the guest and rsvp", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        ...guestBody,
        sdt: "0901234567",
        rsvp: { ...guestBody.rsvp, extra: true },
      }),
    );
    expect(await getGuest("K001")).toEqual({ ok: true, data: guestBody });
  });

  it.each([
    { ...guestBody, id: 1 },
    { ...guestBody, ten: undefined },
    { ...guestBody, capNhatLuc: 123 },
    { ...guestBody, capNhatLuc: undefined },
    { ...guestBody, rsvp: undefined },
    { ...guestBody, rsvp: { diTiec: "maybe" } },
    { ...guestBody, rsvp: { diTiec: "co", soNguoi: "3", gheXeDi: 2, gheXeVe: 0 } },
    { ...guestBody, rsvp: { diTiec: "co", soNguoi: 3, gheXeDi: 2 } },
    { ...guestBody, rsvp: { diTiec: "co", soNguoi: 3, gheXeDi: 1.5, gheXeVe: 0 } },
    { ...guestBody, rsvp: { diTiec: "co", soNguoi: 3, gheXeDi: -1, gheXeVe: 0 } },
    null,
  ])("rejects malformed guest %j", async (body) => {
    fetchMock.mockResolvedValue(jsonResponse(body));
    expect(await getGuest("K001")).toEqual({
      ok: false,
      code: "unknown",
      message: FALLBACK,
    });
  });

  it("maps a not_found error", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: { code: "not_found", message: "Không tìm thấy khách mời" } }, 404),
    );
    expect(await getGuest("K999")).toEqual({
      ok: false,
      code: "not_found",
      message: "Không tìm thấy khách mời",
    });
  });

  it("maps a non-JSON error body to unknown", async () => {
    fetchMock.mockResolvedValue(new Response("<html>oops</html>", { status: 500 }));
    expect(await getGuest("K001")).toEqual({
      ok: false,
      code: "unknown",
      message: FALLBACK,
    });
  });

  it("maps a wrongly shaped error body to unknown", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: { code: 5 } }, 500));
    expect(await getGuest("K001")).toEqual({
      ok: false,
      code: "unknown",
      message: FALLBACK,
    });
  });

  it("returns code network when fetch rejects", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    expect(await getGuest("K001")).toEqual({
      ok: false,
      code: "network",
      message: FALLBACK,
    });
  });
});

describe("submitRsvp", () => {
  const payload: RsvpInput = {
    guestId: "K001",
    diTiec: "co",
    soNguoi: 3,
    xeDi: true,
    gheXeDi: 2,
    xeVe: false,
  };

  it("posts the payload as JSON", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true, guest: guestBody }));

    await submitRsvp(payload);

    const { url, init } = lastCall();
    expect(url).toBe("/api/rsvp");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("Content-Type")).toBe("application/json");
    expect(typeof init?.body === "string" ? JSON.parse(init.body) : null).toEqual(payload);
  });

  it("returns the saved guest", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true, guest: guestBody }));
    expect(await submitRsvp(payload)).toEqual({ ok: true, data: guestBody });
  });

  it.each([
    { ok: true },
    { ok: false, guest: guestBody },
    { guest: guestBody },
    { ok: true, guest: { ...guestBody, rsvp: "co" } },
  ])("rejects malformed success body %j", async (body) => {
    fetchMock.mockResolvedValue(jsonResponse(body));
    expect(await submitRsvp(payload)).toEqual({
      ok: false,
      code: "unknown",
      message: FALLBACK,
    });
  });

  it("maps invalid errors and keeps only string values for known fields", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: "invalid",
            message: "Vui lòng kiểm tra lại thông tin",
            fields: {
              soNguoi: "Số người đi tiệc phải từ 1 đến 10",
              gheXeDi: 3,
              hacker: "x",
            },
          },
        },
        400,
      ),
    );

    expect(await submitRsvp(payload)).toEqual({
      ok: false,
      code: "invalid",
      message: "Vui lòng kiểm tra lại thông tin",
      fields: { soNguoi: "Số người đi tiệc phải từ 1 đến 10" },
    });
  });

  it("ignores non-object fields", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: { code: "invalid", message: "Sai", fields: "bad" } }, 400),
    );
    expect(await submitRsvp(payload)).toEqual({
      ok: false,
      code: "invalid",
      message: "Sai",
    });
  });

  it("returns code network when fetch rejects", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    expect(await submitRsvp(payload)).toEqual({
      ok: false,
      code: "network",
      message: FALLBACK,
    });
  });
});
