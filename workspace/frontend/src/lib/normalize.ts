const COMBINING_MARKS = /[̀-ͯ]/g;
const NON_DIGITS = /\D/g;
const WHITESPACE = /\s+/g;

/** Lowercase, strip Vietnamese diacritics (incl. đ/Đ), collapse and trim spaces. */
export function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(/đ/g, "d")
    .replace(WHITESPACE, " ")
    .trim();
}

/** Keep digits only and map a leading "84" country code to "0"; null when no digits. */
export function normalizePhone(value: string): string | null {
  const digits = value.replace(NON_DIGITS, "");
  if (digits === "") {
    return null;
  }
  return digits.startsWith("84") ? `0${digits.slice(2)}` : digits;
}

/** True when the already-normalized entry contains the normalized query. */
export function matchesName(entryNorm: string, query: string): boolean {
  const queryNorm = normalizeName(query);
  if (queryNorm === "") {
    return false;
  }
  return entryNorm.includes(queryNorm);
}

/** True when the already-normalized entry starts with the normalized query digits. */
export function matchesPhone(entryNorm: string | null, query: string): boolean {
  if (entryNorm === null) {
    return false;
  }
  const queryNorm = normalizePhone(query);
  if (queryNorm === null) {
    return false;
  }
  return entryNorm.startsWith(queryNorm);
}
