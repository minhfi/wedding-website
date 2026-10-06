import { AppsScriptError, callAppsScript } from "@/lib/server/apps-script";
import { mapSheetGuest, parseSheetGuestRow, toSheetRsvp } from "@/lib/server/guests";
import { validateRsvp, type RsvpErrors } from "@/lib/rsvp-validation";

type ErrorCode = "bad_request" | "invalid" | "not_found" | "upstream" | "server_error";

const MESSAGES: Record<ErrorCode, string> = {
  bad_request: "Yêu cầu không hợp lệ",
  invalid: "Thông tin xác nhận chưa hợp lệ",
  not_found: "Không tìm thấy khách mời",
  upstream: "Không lưu được xác nhận, vui lòng thử lại",
  server_error: "Đã có lỗi xảy ra, vui lòng thử lại",
};

const NO_STORE = { "Cache-Control": "no-store" };

function errorResponse(status: number, code: ErrorCode, fields?: RsvpErrors): Response {
  return Response.json(
    { error: { code, message: MESSAGES[code], ...(fields ? { fields } : {}) } },
    { status, headers: NO_STORE },
  );
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "bad_request");
  }

  const result = validateRsvp(body);
  if (!result.ok) {
    return errorResponse(400, "invalid", result.errors);
  }

  const { guestId, rsvp } = result.value;
  try {
    const row = await callAppsScript(
      "submitRsvp",
      { id: guestId, ...toSheetRsvp(rsvp) },
      parseSheetGuestRow,
    );
    return Response.json({ ok: true, guest: mapSheetGuest(row) }, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof AppsScriptError) {
      // `unauthorized` means a server misconfiguration; report it as a generic upstream failure.
      return error.code === "not_found"
        ? errorResponse(404, "not_found")
        : errorResponse(502, "upstream");
    }
    return errorResponse(500, "server_error");
  }
}
