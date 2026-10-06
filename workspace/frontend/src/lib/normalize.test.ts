import { describe, expect, it } from "vitest";
import {
  matchesName,
  matchesPhone,
  normalizeName,
  normalizePhone,
} from "./normalize";

describe("normalizeName", () => {
  it("lowercases, strips diacritics and collapses spaces", () => {
    expect(normalizeName("NGUYỄN  Văn An")).toBe("nguyen van an");
  });

  it("strips all Vietnamese tone and vowel marks", () => {
    expect(normalizeName("Trần Thị Mỹ Ngân")).toBe("tran thi my ngan");
  });

  it("maps đ and Đ to d", () => {
    expect(normalizeName("Ứng Đức")).toBe("ung duc");
    expect(normalizeName("đào")).toBe("dao");
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalizeName("  Nguyễn Văn An \t")).toBe("nguyen van an");
  });

  it("treats differently cased and accented forms as equal", () => {
    const expected = "nguyen van an";
    expect(normalizeName("nguyen van an")).toBe(expected);
    expect(normalizeName("NGUYỄN VĂN AN")).toBe(expected);
    expect(normalizeName("Nguyễn Văn An")).toBe(expected);
  });

  it("returns an empty string for blank input", () => {
    expect(normalizeName("")).toBe("");
    expect(normalizeName("   ")).toBe("");
  });
});

describe("normalizePhone", () => {
  it("removes formatting and converts leading +84 to 0", () => {
    expect(normalizePhone("+84 901-234.567")).toBe("0901234567");
  });

  it("removes spaces", () => {
    expect(normalizePhone("0901 234 567")).toBe("0901234567");
  });

  it("converts leading 84 to 0", () => {
    expect(normalizePhone("84901234567")).toBe("0901234567");
  });

  it("keeps a number already starting with 0", () => {
    expect(normalizePhone("0901234567")).toBe("0901234567");
  });

  it("returns null for empty input", () => {
    expect(normalizePhone("")).toBeNull();
  });

  it("returns null when there are no digits", () => {
    expect(normalizePhone("abc - . +")).toBeNull();
  });
});

describe("matchesName", () => {
  const entry = normalizeName("Nguyễn Văn An");

  it("matches when the normalized entry contains the normalized query", () => {
    expect(matchesName(entry, "nguyen van")).toBe(true);
    expect(matchesName(entry, "VĂN AN")).toBe(true);
    expect(matchesName(entry, "  văn   an ")).toBe(true);
  });

  it("does not match an unrelated query", () => {
    expect(matchesName(entry, "tran")).toBe(false);
  });

  it("returns false for an empty or blank query", () => {
    expect(matchesName(entry, "")).toBe(false);
    expect(matchesName(entry, "   ")).toBe(false);
  });
});

describe("matchesPhone", () => {
  const entry = normalizePhone("0901234567");

  it("matches when the entry starts with the normalized query digits", () => {
    expect(matchesPhone(entry, "0901")).toBe(true);
    expect(matchesPhone(entry, "090 123")).toBe(true);
  });

  it("matches a +84 query against a 0-prefixed entry", () => {
    expect(matchesPhone(entry, "+84 901")).toBe(true);
    expect(matchesPhone(entry, "+84 901 234 567")).toBe(true);
  });

  it("does not match digits that are not a prefix", () => {
    expect(matchesPhone(entry, "234")).toBe(false);
  });

  it("returns false for a null entry", () => {
    expect(matchesPhone(null, "0901")).toBe(false);
  });

  it("returns false for an empty query or one without digits", () => {
    expect(matchesPhone(entry, "")).toBe(false);
    expect(matchesPhone(entry, "abc")).toBe(false);
  });
});
