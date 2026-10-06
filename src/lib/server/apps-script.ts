import "server-only";

export type AppsScriptAction =
  | "listGuests"
  | "getGuest"
  | "getBusInfo"
  | "submitRsvp";

export type AppsScriptErrorCode = "not_found" | "unauthorized" | "upstream";

export class AppsScriptError extends Error {
  readonly code: AppsScriptErrorCode;

  constructor(code: AppsScriptErrorCode, options?: { cause?: unknown }) {
    super(`Apps Script request failed: ${code}`, options);
    this.name = "AppsScriptError";
    this.code = code;
  }
}

/** `secret` and `action` are reserved and set by the client itself. */
export type AppsScriptParams = Record<string, unknown> & {
  secret?: never;
  action?: never;
};

const TIMEOUT_MS = 10_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toErrorCode(error: unknown): AppsScriptErrorCode {
  return error === "not_found" || error === "unauthorized" ? error : "upstream";
}

export async function callAppsScript<T>(
  action: AppsScriptAction,
  params: AppsScriptParams,
  parse: (data: unknown) => T,
): Promise<T> {
  const url = process.env.APPS_SCRIPT_URL;
  const secret = process.env.APPS_SCRIPT_SECRET;
  if (!url || !secret) {
    throw new AppsScriptError("upstream");
  }

  let text: string;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ secret, action, ...params }),
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new AppsScriptError("upstream");
    }
    text = await response.text();
  } catch (error) {
    if (error instanceof AppsScriptError) {
      throw error;
    }
    throw new AppsScriptError("upstream", { cause: error });
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch (error) {
    throw new AppsScriptError("upstream", { cause: error });
  }

  if (!isRecord(body)) {
    throw new AppsScriptError("upstream");
  }
  if (body.ok === false) {
    throw new AppsScriptError(toErrorCode(body.error));
  }
  if (body.ok !== true || !("data" in body)) {
    throw new AppsScriptError("upstream");
  }

  try {
    return parse(body.data);
  } catch (error) {
    throw new AppsScriptError("upstream", { cause: error });
  }
}
