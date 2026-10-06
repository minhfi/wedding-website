import { describe, expect, it } from "vitest";
import { validateRsvp } from "./rsvp-validation";

const attending = {
  guestId: "K001",
  diTiec: "co",
  soNguoi: 3,
  xeDi: true,
  gheXeDi: 2,
  xeVe: false,
};

function errorsOf(input: unknown) {
  const result = validateRsvp(input);
  if (result.ok) {
    throw new Error("expected validation to fail");
  }
  return result.errors;
}

describe("validateRsvp", () => {
  describe("non-object input", () => {
    it.each([null, undefined, "K001", 42, [], [attending]])(
      "rejects %j",
      (input) => {
        const errors = errorsOf(input);
        expect(errors.guestId).toBeDefined();
        expect(errors.diTiec).toBe("Vui lòng chọn có đi tiệc hay không");
      },
    );
  });

  describe("guestId", () => {
    it.each([undefined, "", "   ", 1, null])("rejects %j", (guestId) => {
      expect(errorsOf({ ...attending, guestId }).guestId).toBe(
        "Vui lòng chọn tên khách mời",
      );
    });
  });

  describe("diTiec", () => {
    it.each([undefined, "", "Có", "yes", true, null])(
      "rejects %j",
      (diTiec) => {
        expect(errorsOf({ ...attending, diTiec }).diTiec).toBe(
          "Vui lòng chọn có đi tiệc hay không",
        );
      },
    );
  });

  describe("not attending", () => {
    it("outputs only diTiec khong", () => {
      expect(validateRsvp({ guestId: "K001", diTiec: "khong" })).toEqual({
        ok: true,
        value: { guestId: "K001", rsvp: { diTiec: "khong" } },
      });
    });

    it("treats undefined fields as absent", () => {
      expect(
        validateRsvp({
          guestId: "K001",
          diTiec: "khong",
          soNguoi: undefined,
          xeDi: undefined,
        }).ok,
      ).toBe(true);
    });

    it.each([
      ["soNguoi", 2],
      ["xeDi", false],
      ["gheXeDi", 0],
      ["xeVe", true],
      ["gheXeVe", 1],
      ["soNguoi", null],
    ])("rejects extra field %s=%j", (field, value) => {
      const errors = errorsOf({ guestId: "K001", diTiec: "khong", [field]: value });
      expect(Object.keys(errors)).toEqual([field]);
    });
  });

  describe("attending: soNguoi", () => {
    it.each([1, 10])("accepts boundary %d", (soNguoi) => {
      expect(
        validateRsvp({ ...attending, soNguoi, xeDi: false, gheXeDi: undefined })
          .ok,
      ).toBe(true);
    });

    it.each([0, 11, 2.5, -1, "3", undefined, null, Number.NaN])(
      "rejects %j",
      (soNguoi) => {
        expect(errorsOf({ ...attending, soNguoi }).soNguoi).toBe(
          "Số người đi tiệc phải từ 1 đến 10",
        );
      },
    );
  });

  describe("attending: bus", () => {
    it("outputs seats, with 0 for a direction without bus", () => {
      expect(validateRsvp(attending)).toEqual({
        ok: true,
        value: {
          guestId: "K001",
          rsvp: { diTiec: "co", soNguoi: 3, gheXeDi: 2, gheXeVe: 0 },
        },
      });
    });

    it("does not output extra input keys", () => {
      const result = validateRsvp({ ...attending, sdt: "0901234567" });
      expect(result).toEqual({
        ok: true,
        value: {
          guestId: "K001",
          rsvp: { diTiec: "co", soNguoi: 3, gheXeDi: 2, gheXeVe: 0 },
        },
      });
    });

    it.each(["xeDi", "xeVe"] as const)("requires %s as a boolean", (field) => {
      for (const value of [undefined, "true", 1, null]) {
        expect(errorsOf({ ...attending, [field]: value })[field]).toBe(
          "Vui lòng chọn có đi xe hay không",
        );
      }
    });

    it("accepts seats equal to people at the 10 boundary", () => {
      expect(
        validateRsvp({
          ...attending,
          soNguoi: 10,
          gheXeDi: 10,
          xeVe: true,
          gheXeVe: 1,
        }),
      ).toEqual({
        ok: true,
        value: {
          guestId: "K001",
          rsvp: { diTiec: "co", soNguoi: 10, gheXeDi: 10, gheXeVe: 1 },
        },
      });
    });

    it.each([0, 11, 2.5, "2", undefined, null])(
      "rejects outbound seats %j",
      (gheXeDi) => {
        expect(errorsOf({ ...attending, gheXeDi }).gheXeDi).toBe(
          "Số ghế phải từ 1 đến 10",
        );
      },
    );

    it("rejects return seats out of range", () => {
      expect(
        errorsOf({ ...attending, xeVe: true, gheXeVe: 0 }).gheXeVe,
      ).toBe("Số ghế phải từ 1 đến 10");
    });

    it("rejects seats greater than people", () => {
      const errors = errorsOf({
        ...attending,
        soNguoi: 2,
        gheXeDi: 3,
        xeVe: true,
        gheXeVe: 3,
      });
      expect(errors).toEqual({
        gheXeDi: "Số ghế không được nhiều hơn số người đi tiệc",
        gheXeVe: "Số ghế không được nhiều hơn số người đi tiệc",
      });
    });

    it("only reports soNguoi when people are invalid and seats are in range", () => {
      expect(errorsOf({ ...attending, soNguoi: 0, gheXeDi: 5 })).toEqual({
        soNguoi: "Số người đi tiệc phải từ 1 đến 10",
      });
    });

    it.each([0, 2])("rejects seats %j when the bus is not taken", (gheXeVe) => {
      expect(errorsOf({ ...attending, xeVe: false, gheXeVe }).gheXeVe).toBe(
        "Không cần nhập số ghế khi không đi xe",
      );
    });

    it("collects several errors at once", () => {
      expect(
        Object.keys(errorsOf({ guestId: "", diTiec: "co", soNguoi: 11 })).sort(),
      ).toEqual(["guestId", "soNguoi", "xeDi", "xeVe"]);
    });
  });
});
