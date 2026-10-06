import type { NextRequest } from "next/server";
import { AppsScriptError } from "@/lib/server/apps-script";
import { searchGuests, type GuestSearchBy } from "@/lib/server/guests";
import type { GuestSuggestion } from "@/lib/types";

type ErrorCode = "bad_request" | "upstream" | "server_error";

interface SearchResponse {
  items: GuestSuggestion[];
}

const NO_STORE = { "Cache-Control": "no-store" } as const;

function jsonError(status: number, code: ErrorCode, message: string): Response {
  return Response.json({ error: { code, message } }, { status, headers: NO_STORE });
}

function isSearchBy(value: string | null): value is GuestSearchBy {
  return value === "ten" || value === "sdt";
}

/**
 * Guest autocomplete. A missing `q` is treated as an empty query (→ `{ items: [] }`,
 * since `searchGuests` returns [] below the minimum length). Reading `searchParams`
 * makes this handler run at request time under Cache Components.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = request.nextUrl;
  const by = searchParams.get("by");
  if (!isSearchBy(by)) {
    return jsonError(400, "bad_request", "Yêu cầu tìm kiếm không hợp lệ");
  }
  const q = searchParams.get("q") ?? "";

  try {
    const results = await searchGuests(by, q);
    // Re-map explicitly so only `id` and `ten` can ever reach the browser.
    const body: SearchResponse = { items: results.map(({ id, ten }) => ({ id, ten })) };
    return Response.json(body, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof AppsScriptError) {
      return jsonError(502, "upstream", "Không tải được danh sách khách mời, vui lòng thử lại");
    }
    return jsonError(500, "server_error", "Đã có lỗi xảy ra, vui lòng thử lại");
  }
}
