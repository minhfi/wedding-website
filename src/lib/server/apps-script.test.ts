// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppsScriptError, callAppsScript } from "./apps-script";

const SCRIPT_URL = "https://script.google.com/macros/s/test/exec";
const SECRET = "s3cr3t-value";

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), { status: 200, ...init });
}

function parseString(data: unknown): string {
  if (typeof data !== "string") {
    throw new Error("not a string");
  }
  return data;
}

async function captureError(promise: Promise<unknown>): Promise<AppsScriptError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof AppsScriptError) {
      return error;
    }
    throw error;
  }
  throw new Error("expected promise to reject");
}

beforeEach(() => {
  vi.stubEnv("APPS_SCRIPT_URL", SCRIPT_URL);
  vi.stubEnv("APPS_SCRIPT_SECRET", SECRET);
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  fetchMock.mockReset();
});

describe("callAppsScript", () => {
  it("posts the secret, action and params as a text/plain JSON body", async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
    fetchMock.mockResolvedValue(jsonResponse({ ok: true, data: "hello" }));

    await callAppsScript("getGuest", { id: "K001" }, parseString);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(SCRIPT_URL);
    expect(init?.method).toBe("POST");
    expect(init?.redirect).toBe("follow");
    expect(init?.cache).toBe("no-store");
    expect(new Headers(init?.headers).get("Content-Type")).toBe(
      "text/plain;charset=utf-8",
    );
    expect(typeof init?.body).toBe("string");
    expect(JSON.parse(String(init?.body))).toEqual({
      secret: SECRET,
      action: "getGuest",
      id: "K001",
    });
    expect(timeoutSpy).toHaveBeenCalledWith(10_000);
    expect(init?.signal).toBe(timeoutSpy.mock.results[0].value);
  });

  it("returns the parsed data on ok:true", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ ok: true, data: [{ id: "K001", ten: "An", sdt: "" }] }),
    );
    const parse = vi.fn((data: unknown) => (Array.isArray(data) ? data.length : -1));

    await expect(callAppsScript("listGuests", {}, parse)).resolves.toBe(1);
    expect(parse).toHaveBeenCalledWith([{ id: "K001", ten: "An", sdt: "" }]);
  });

  it.each([
    ["not_found", "not_found"],
    ["unauthorized", "unauthorized"],
    ["boom", "upstream"],
    [undefined, "upstream"],
  ])("maps ok:false error %j to code %s", async (error, code) => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: false, error }));

    const thrown = await captureError(callAppsScript("getGuest", { id: "X" }, parseString));
    expect(thrown.code).toBe(code);
  });

  it("throws upstream on a non-OK HTTP status", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true, data: "x" }, { status: 500 }));

    const thrown = await captureError(callAppsScript("getBusInfo", {}, parseString));
    expect(thrown.code).toBe("upstream");
  });

  it("throws upstream on a non-JSON body", async () => {
    fetchMock.mockResolvedValue(new Response("<html>Sign in</html>", { status: 200 }));

    const thrown = await captureError(callAppsScript("getBusInfo", {}, parseString));
    expect(thrown.code).toBe("upstream");
  });

  it.each([null, "ok", [1], { data: "x" }, { ok: "true", data: "x" }])(
    "throws upstream on a malformed envelope %j",
    async (body) => {
      fetchMock.mockResolvedValue(jsonResponse(body));

      const thrown = await captureError(callAppsScript("getBusInfo", {}, parseString));
      expect(thrown.code).toBe("upstream");
    },
  );

  it("throws upstream on a network error", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    const thrown = await captureError(callAppsScript("listGuests", {}, parseString));
    expect(thrown.code).toBe("upstream");
  });

  it("throws upstream on timeout or abort", async () => {
    fetchMock.mockRejectedValue(new DOMException("timed out", "TimeoutError"));
    const timeout = await captureError(callAppsScript("listGuests", {}, parseString));
    expect(timeout.code).toBe("upstream");

    fetchMock.mockRejectedValue(new DOMException("aborted", "AbortError"));
    const abort = await captureError(callAppsScript("listGuests", {}, parseString));
    expect(abort.code).toBe("upstream");
  });

  it("throws upstream when the parse function rejects the data", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true, data: 42 }));

    const thrown = await captureError(callAppsScript("getBusInfo", {}, parseString));
    expect(thrown.code).toBe("upstream");
  });

  it.each(["APPS_SCRIPT_URL", "APPS_SCRIPT_SECRET"])(
    "throws upstream without calling fetch when %s is missing",
    async (name) => {
      vi.stubEnv(name, "");

      const thrown = await captureError(callAppsScript("listGuests", {}, parseString));
      expect(thrown.code).toBe("upstream");
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("never exposes or logs the secret", async () => {
    const consoleSpies = (["log", "info", "warn", "error", "debug"] as const).map(
      (method) => vi.spyOn(console, method).mockImplementation(() => undefined),
    );
    fetchMock.mockResolvedValue(jsonResponse({ ok: false, error: "unauthorized" }));

    const thrown = await captureError(callAppsScript("listGuests", {}, parseString));

    expect(thrown.message).not.toContain(SECRET);
    expect(JSON.stringify(thrown)).not.toContain(SECRET);
    for (const spy of consoleSpies) {
      expect(spy).not.toHaveBeenCalled();
    }
  });
});

describe("AppsScriptError", () => {
  it("is an Error with a code", () => {
    const error = new AppsScriptError("not_found");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("AppsScriptError");
    expect(error.code).toBe("not_found");
  });
});
