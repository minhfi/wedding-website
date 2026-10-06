// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { AppsScriptError, callAppsScript, type AppsScriptAction } from "./apps-script";
import { GET as searchGET } from "@/app/api/guests/search/route";
import { GET as detailGET } from "@/app/api/guests/[id]/route";
import { POST as rsvpPOST } from "@/app/api/rsvp/route";

vi.mock("next/cache", () => ({ cacheLife: vi.fn() }));

vi.mock("./apps-script", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./apps-script")>();
  return { ...actual, callAppsScript: vi.fn() };
});

const callAppsScriptMock = vi.mocked(callAppsScript);

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/PRIVACY-TEST-DEPLOYMENT/exec";
const APPS_SCRIPT_SECRET = "privacy-test-secret-value";

const GUEST_LIST = [
  { id: "K001", ten: "Nguyễn Văn An", sdt: "0901234567" },
  { id: "K002", ten: "Trần Thị Bình", sdt: "0912000111" },
  { id: "K003", ten: "Nguyễn Thị Cúc", sdt: "+84 933 444 555" },
];

const GUEST_ROW = {
  id: "K001",
  ten: "Nguyễn Văn An",
  sdt: "0901234567",
  di_tiec: "Có",
  so_nguoi: 3,
  ghe_xe_di: 2,
  ghe_xe_ve: "",
  cap_nhat_luc: "2026-11-02 20:15:03",
};

/** Formatted and digits-only forms of every fixture phone (with and without the leading 0 / 84). */
const PHONE_FORMS = [
  ...GUEST_LIST.map(({ sdt }) => sdt),
  "0901234567",
  "901234567",
  "0912000111",
  "912000111",
  "84933444555",
  "0933444555",
  "933444555",
];

const FORBIDDEN_KEYS = new Set(["sdt", "sdtNorm"]);

/** Every object key found anywhere in a parsed JSON value. */
function collectKeys(value: unknown, keys: string[] = []): string[] {
  if (Array.isArray(value)) {
    value.forEach((item) => collectKeys(item, keys));
  } else if (typeof value === "object" && value !== null) {
    for (const [key, child] of Object.entries(value)) {
      keys.push(key);
      collectKeys(child, keys);
    }
  }
  return keys;
}

async function expectNoPhoneData(response: Response): Promise<unknown> {
  const raw = await response.text();
  const body: unknown = JSON.parse(raw);

  expect(collectKeys(body).filter((key) => FORBIDDEN_KEYS.has(key))).toEqual([]);
  for (const phone of PHONE_FORMS) {
    expect(raw).not.toContain(phone);
  }
  return body;
}

async function expectNoSecrets(response: Response): Promise<void> {
  const raw = await response.text();
  expect(raw).not.toContain(APPS_SCRIPT_URL);
  expect(raw).not.toContain("PRIVACY-TEST-DEPLOYMENT");
  expect(raw).not.toContain(APPS_SCRIPT_SECRET);
}

/** Feeds fixtures through the parse function each caller passes, so the real guards and mapping run. */
function respondWith(fixtures: Partial<Record<AppsScriptAction, unknown>>): void {
  callAppsScriptMock.mockImplementation(async (action, _params, parse) => parse(fixtures[action]));
}

function failWith(error: unknown): void {
  callAppsScriptMock.mockRejectedValue(error);
}

function search(by: string, q: string): Promise<Response> {
  const params = new URLSearchParams({ by, q });
  return searchGET(new NextRequest(`http://localhost/api/guests/search?${params.toString()}`));
}

function detail(id: string): Promise<Response> {
  return detailGET(new Request(`http://localhost/api/guests/${encodeURIComponent(id)}`), {
    params: Promise.resolve({ id }),
  });
}

function submitRsvp(): Promise<Response> {
  return rsvpPOST(
    new Request("http://localhost/api/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guestId: "K001",
        diTiec: "co",
        soNguoi: 3,
        xeDi: true,
        gheXeDi: 2,
        xeVe: false,
      }),
    }),
  );
}

beforeEach(() => {
  callAppsScriptMock.mockReset();
  vi.stubEnv("APPS_SCRIPT_URL", APPS_SCRIPT_URL);
  vi.stubEnv("APPS_SCRIPT_SECRET", APPS_SCRIPT_SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("privacy: no phone numbers reach the browser (SC-003, FR-009)", () => {
  it("search by name returns suggestions without phone data", async () => {
    respondWith({ listGuests: GUEST_LIST });

    const response = await search("ten", "nguyen");

    expect(response.status).toBe(200);
    const body = await expectNoPhoneData(response);
    expect(body).toEqual({
      items: [
        { id: "K003", ten: "Nguyễn Thị Cúc" },
        { id: "K001", ten: "Nguyễn Văn An" },
      ],
    });
  });

  it("search by phone prefix returns suggestions without phone data", async () => {
    respondWith({ listGuests: GUEST_LIST });

    const response = await search("sdt", "0901");

    expect(response.status).toBe(200);
    const body = await expectNoPhoneData(response);
    expect(body).toEqual({ items: [{ id: "K001", ten: "Nguyễn Văn An" }] });
  });

  it("search by a +84 phone prefix returns suggestions without phone data", async () => {
    respondWith({ listGuests: GUEST_LIST });

    const response = await search("sdt", "+84 933");

    expect(response.status).toBe(200);
    const body = await expectNoPhoneData(response);
    expect(body).toEqual({ items: [{ id: "K003", ten: "Nguyễn Thị Cúc" }] });
  });

  it("guest detail drops sdt from the Apps Script row", async () => {
    respondWith({ getGuest: GUEST_ROW });

    const response = await detail("K001");

    expect(response.status).toBe(200);
    const body = await expectNoPhoneData(response);
    expect(body).toMatchObject({ id: "K001", ten: "Nguyễn Văn An" });
  });

  it("rsvp submit drops sdt from the saved Apps Script row", async () => {
    respondWith({ submitRsvp: GUEST_ROW });

    const response = await submitRsvp();

    expect(response.status).toBe(200);
    const body = await expectNoPhoneData(response);
    expect(body).toMatchObject({ ok: true, guest: { id: "K001", ten: "Nguyễn Văn An" } });
  });
});

describe("privacy: errors never expose the Apps Script URL or secret (FR-020)", () => {
  const leakyMessage = `request to ${APPS_SCRIPT_URL}?secret=${APPS_SCRIPT_SECRET} failed`;
  const errors: [string, () => unknown][] = [
    [
      "AppsScriptError",
      () => new AppsScriptError("upstream", { cause: new Error(leakyMessage) }),
    ],
    ["AppsScriptError unauthorized", () => new AppsScriptError("unauthorized")],
    ["plain Error", () => new Error(leakyMessage)],
  ];

  describe.each(errors)("%s", (_label, makeError) => {
    it("search response hides the URL and secret", async () => {
      failWith(makeError());

      const response = await search("ten", "nguyen");

      expect(response.status).toBeGreaterThanOrEqual(500);
      await expectNoSecrets(response);
    });

    it("detail response hides the URL and secret", async () => {
      failWith(makeError());

      const response = await detail("K001");

      expect(response.status).toBeGreaterThanOrEqual(500);
      await expectNoSecrets(response);
    });

    it("rsvp response hides the URL and secret", async () => {
      failWith(makeError());

      const response = await submitRsvp();

      expect(response.status).toBeGreaterThanOrEqual(500);
      await expectNoSecrets(response);
    });
  });
});
