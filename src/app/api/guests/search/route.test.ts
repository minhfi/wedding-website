// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { AppsScriptError } from "@/lib/server/apps-script";
import { searchGuests } from "@/lib/server/guests";
import { GET } from "./route";

vi.mock("@/lib/server/guests", () => ({ searchGuests: vi.fn() }));

const searchGuestsMock = vi.mocked(searchGuests);

function request(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/guests/search${query}`);
}

async function call(query: string): Promise<{ status: number; body: unknown; raw: string; response: Response }> {
  const response = await GET(request(query));
  const raw = await response.text();
  return { status: response.status, body: JSON.parse(raw), raw, response };
}

describe("GET /api/guests/search", () => {
  beforeEach(() => {
    searchGuestsMock.mockReset();
  });

  it("returns 200 with items for a name search", async () => {
    searchGuestsMock.mockResolvedValue([{ id: "K001", ten: "Nguyễn Văn An" }]);

    const { status, body, response } = await call("?by=ten&q=an");

    expect(status).toBe(200);
    expect(body).toEqual({ items: [{ id: "K001", ten: "Nguyễn Văn An" }] });
    expect(searchGuestsMock).toHaveBeenCalledWith("ten", "an");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("passes a phone search through", async () => {
    searchGuestsMock.mockResolvedValue([]);

    const { status, body } = await call("?by=sdt&q=0901");

    expect(status).toBe(200);
    expect(body).toEqual({ items: [] });
    expect(searchGuestsMock).toHaveBeenCalledWith("sdt", "0901");
  });

  it("treats a missing q as an empty query", async () => {
    searchGuestsMock.mockResolvedValue([]);

    const { status, body } = await call("?by=ten");

    expect(status).toBe(200);
    expect(body).toEqual({ items: [] });
    expect(searchGuestsMock).toHaveBeenCalledWith("ten", "");
  });

  it("never returns sdt even if the search result carries it", async () => {
    const leaky = [{ id: "K002", ten: "Trần Bình", sdt: "0901234567" }];
    searchGuestsMock.mockResolvedValue(leaky);

    const { status, body, raw } = await call("?by=sdt&q=0901");

    expect(status).toBe(200);
    expect(body).toEqual({ items: [{ id: "K002", ten: "Trần Bình" }] });
    expect(raw).not.toContain("sdt");
    expect(raw).not.toContain("0901234567");
  });

  it.each([
    ["missing by", "?q=an"],
    ["empty by", "?by=&q=an"],
    ["invalid by", "?by=email&q=an"],
  ])("returns 400 bad_request for %s", async (_label, query) => {
    const { status, body, raw, response } = await call(query);

    expect(status).toBe(400);
    expect(body).toEqual({
      error: { code: "bad_request", message: "Yêu cầu tìm kiếm không hợp lệ" },
    });
    expect(raw).not.toContain("sdt");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(searchGuestsMock).not.toHaveBeenCalled();
  });

  it("returns 502 upstream when Apps Script fails", async () => {
    searchGuestsMock.mockRejectedValue(new AppsScriptError("upstream"));

    const { status, body, raw } = await call("?by=ten&q=an");

    expect(status).toBe(502);
    expect(body).toEqual({
      error: {
        code: "upstream",
        message: "Không tải được danh sách khách mời, vui lòng thử lại",
      },
    });
    expect(raw).not.toContain("sdt");
  });

  it("maps any AppsScriptError code to 502 upstream", async () => {
    searchGuestsMock.mockRejectedValue(new AppsScriptError("unauthorized"));

    const { status, body } = await call("?by=ten&q=an");

    expect(status).toBe(502);
    expect(body).toMatchObject({ error: { code: "upstream" } });
  });

  it("returns 500 server_error without leaking details on unexpected errors", async () => {
    searchGuestsMock.mockRejectedValue(new Error("secret internal detail sdt=0901"));

    const { status, body, raw } = await call("?by=ten&q=an");

    expect(status).toBe(500);
    expect(body).toEqual({
      error: { code: "server_error", message: "Đã có lỗi xảy ra, vui lòng thử lại" },
    });
    expect(raw).not.toContain("secret internal detail");
    expect(raw).not.toContain("sdt");
  });
});
