import { AppsScriptError } from "@/lib/server/apps-script";
import { getGuestDetail } from "@/lib/server/guests";

type ErrorCode = "bad_request" | "not_found" | "upstream" | "server_error";

const NO_STORE = { "Cache-Control": "no-store" };
const LOAD_FAILED_MESSAGE = "Không tải được thông tin, vui lòng thử lại";

function errorResponse(status: number, code: ErrorCode, message: string): Response {
  return Response.json({ error: { code, message } }, { status, headers: NO_STORE });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const id = (await params).id.trim();
  if (id === "") {
    return errorResponse(400, "bad_request", "Yêu cầu không hợp lệ");
  }

  try {
    const guest = await getGuestDetail(id);
    return Response.json(guest, { headers: NO_STORE });
  } catch (error) {
    if (!(error instanceof AppsScriptError)) {
      return errorResponse(500, "server_error", LOAD_FAILED_MESSAGE);
    }
    if (error.code === "not_found") {
      return errorResponse(404, "not_found", "Không tìm thấy khách mời");
    }
    return errorResponse(502, "upstream", LOAD_FAILED_MESSAGE);
  }
}
