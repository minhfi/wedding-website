/**
 * Wedding RSVP — Google Sheet gateway (Apps Script Web App).
 * Contract: specs/001-wedding-rsvp/contracts/apps-script.md
 *
 * Deploy (quickstart §2):
 *   1. Open the Sheet → Extensions → Apps Script; paste this file as Code.gs (V8 runtime).
 *   2. Project Settings → Script Properties → add SECRET = a long random string
 *      (same value as APPS_SCRIPT_SECRET on the Next.js server).
 *   3. Deploy → New deployment → Web app; Execute as: Me; Who has access: Anyone.
 *      Copy the URL into APPS_SCRIPT_URL. After editing this file, use
 *      Deploy → Manage deployments → Edit → New version (the URL stays the same).
 *   4. Keep the Sheet time zone at Asia/Ho_Chi_Minh (File → Settings) so date/time cells
 *      are read back correctly.
 *
 * Tabs (row 1 = headers, located by name): Khach, LichSu, CauHinh (khoa | gia_tri).
 */

const TZ = 'Asia/Ho_Chi_Minh';
const DATETIME_FORMAT = 'yyyy-MM-dd HH:mm:ss';
const DI_TIEC_VALUES = ['Có', 'Không'];
const NUMBER_FIELDS = ['so_nguoi', 'ghe_xe_di', 'ghe_xe_ve'];
const BUS_KEYS = ['xe_di_diem_don', 'xe_di_gio', 'xe_ve_diem_don', 'xe_ve_gio'];
const GUEST_FIELDS = ['id', 'ten', 'di_tiec', 'so_nguoi', 'ghe_xe_di', 'ghe_xe_ve', 'cap_nhat_luc'];

/** Error with a contract error code; anything else becomes server_error. */
class ApiError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

function doPost(e) {
  try {
    const body = parseBody(e);
    checkSecret(body.secret);
    return respond({ ok: true, data: dispatch(body) });
  } catch (err) {
    const code = err instanceof ApiError ? err.code : 'server_error';
    return respond({ ok: false, error: code });
  }
}

function dispatch(body) {
  switch (body.action) {
    case 'listGuests':
      return listGuests();
    case 'getGuest':
      return getGuest(body);
    case 'getBusInfo':
      return getBusInfo();
    case 'submitRsvp':
      return submitRsvp(body);
    default:
      throw new ApiError('unknown_action');
  }
}

// ---------- actions ----------

function listGuests() {
  const t = readTable('Khach', ['id', 'ten', 'sdt']);
  return t.rows
    .filter((row) => str(row[t.col.id]) !== '')
    .map((row) => ({
      id: str(row[t.col.id]),
      ten: str(row[t.col.ten]),
      sdt: phone(row[t.col.sdt]),
    }));
}

function getGuest(body) {
  const id = requireId(body.id);
  const t = readTable('Khach', GUEST_FIELDS);
  const index = findRowIndex(t, id);
  if (index < 0) throw new ApiError('not_found');
  return toGuest(t, t.rows[index]);
}

function getBusInfo() {
  const t = readTable('CauHinh', ['khoa', 'gia_tri']);
  const tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
  const info = {};
  BUS_KEYS.forEach((key) => (info[key] = ''));
  t.rows.forEach((row) => {
    const key = str(row[t.col.khoa]);
    if (!BUS_KEYS.includes(key)) return;
    const value = row[t.col.gia_tri];
    info[key] = isDate(value) ? Utilities.formatDate(value, tz, 'HH:mm') : str(value);
  });
  return info;
}

function submitRsvp(body) {
  const id = requireId(body.id);
  if (!DI_TIEC_VALUES.includes(body.di_tiec)) throw new ApiError('bad_request');
  NUMBER_FIELDS.forEach((f) => {
    if (!isNumberOrEmpty(body[f])) throw new ApiError('bad_request');
  });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const t = readTable('Khach', GUEST_FIELDS);
    const log = readTable('LichSu', ['thoi_gian', 'id', 'di_tiec', 'so_nguoi', 'ghe_xe_di', 'ghe_xe_ve']);
    const index = findRowIndex(t, id);
    if (index < 0) throw new ApiError('not_found');

    const now = Utilities.formatDate(new Date(), TZ, DATETIME_FORMAT);
    const values = {
      di_tiec: body.di_tiec,
      so_nguoi: body.so_nguoi,
      ghe_xe_di: body.ghe_xe_di,
      ghe_xe_ve: body.ghe_xe_ve,
      cap_nhat_luc: now,
    };
    writeCells(t, index + 2, values); // +1 header row, +1 for 1-based rows

    appendByHeader(log, {
      thoi_gian: now,
      id,
      di_tiec: body.di_tiec,
      so_nguoi: body.so_nguoi,
      ghe_xe_di: body.ghe_xe_di,
      ghe_xe_ve: body.ghe_xe_ve,
    });
    SpreadsheetApp.flush();

    const row = t.rows[index].slice();
    Object.keys(values).forEach((name) => (row[t.col[name]] = values[name]));
    return toGuest(t, row);
  } finally {
    lock.releaseLock();
  }
}

// ---------- sheet helpers ----------

/** Reads a tab; `col` maps each required header name to its 0-based column index. */
function readTable(name, required) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error('missing tab ' + name);
  const values = sheet.getDataRange().getValues();
  const headers = (values[0] || []).map(str);
  const col = {};
  required.forEach((h) => {
    const i = headers.indexOf(h);
    if (i < 0) throw new Error('missing header ' + name + '.' + h);
    col[h] = i;
  });
  return { sheet, col, width: headers.length, rows: values.slice(1) };
}

function findRowIndex(t, id) {
  return t.rows.findIndex((row) => str(row[t.col.id]) === id);
}

/** Writes named values into one row: a single setValues when the columns are contiguous. */
function writeCells(t, rowNumber, values) {
  const cols = Object.keys(values)
    .map((name) => ({ c: t.col[name] + 1, v: values[name] }))
    .sort((a, b) => a.c - b.c);
  const contiguous = cols.every((x, i) => x.c === cols[0].c + i);
  if (contiguous) {
    t.sheet.getRange(rowNumber, cols[0].c, 1, cols.length).setValues([cols.map((x) => x.v)]);
  } else {
    cols.forEach((x) => t.sheet.getRange(rowNumber, x.c).setValue(x.v));
  }
}

function appendByHeader(t, values) {
  const row = new Array(t.width).fill('');
  Object.keys(values).forEach((name) => (row[t.col[name]] = values[name]));
  t.sheet.appendRow(row);
}

function toGuest(t, row) {
  return {
    id: str(row[t.col.id]),
    ten: str(row[t.col.ten]),
    di_tiec: str(row[t.col.di_tiec]),
    so_nguoi: num(row[t.col.so_nguoi]),
    ghe_xe_di: num(row[t.col.ghe_xe_di]),
    ghe_xe_ve: num(row[t.col.ghe_xe_ve]),
    cap_nhat_luc: dateTime(row[t.col.cap_nhat_luc]),
  };
}

// ---------- value helpers ----------

function parseBody(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body && typeof body === 'object' && !Array.isArray(body)) return body;
  } catch (err) {
    // fall through
  }
  throw new ApiError('bad_request');
}

function checkSecret(secret) {
  const expected = PropertiesService.getScriptProperties().getProperty('SECRET');
  if (!expected || typeof secret !== 'string' || secret !== expected) {
    throw new ApiError('unauthorized');
  }
}

function requireId(value) {
  const id = typeof value === 'string' || typeof value === 'number' ? str(value) : '';
  if (id === '') throw new ApiError('bad_request');
  return id;
}

function isNumberOrEmpty(value) {
  return value === '' || (typeof value === 'number' && isFinite(value));
}

function str(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

/** Empty → "", numeric → number, anything else → trimmed string. */
function num(value) {
  if (typeof value === 'number') return value;
  const s = str(value);
  return s !== '' && isFinite(Number(s)) ? Number(s) : s;
}

/** Dates from the Sheets service can fail `instanceof Date` (different realm), so duck-type them. */
function isDate(value) {
  return Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime());
}

function dateTime(value) {
  return isDate(value) ? Utilities.formatDate(value, TZ, DATETIME_FORMAT) : str(value);
}

/** Phone as string; restores a leading 0 the Sheet dropped from a 9-digit number. */
function phone(value) {
  const s = str(value);
  return /^\d{9}$/.test(s) ? '0' + s : s;
}

function respond(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
