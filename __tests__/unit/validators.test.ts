import { validateId } from "../../app/lib/validators/common";
import { loginSchema, registerSchema } from "../../app/lib/validators/auth";
import { createBookingSchema } from "../../app/lib/validators/bookings";
import { importRunsQuerySchema, nasaCsvRowSchema } from "../../app/lib/validators/admin";

describe("Validators", () => {
  describe("Common ID Validator (cuid)", () => {
    it("should accept valid cuid formats", () => {
      const validCuid = "cm4a2d3s8000008lc5a3s9f5q"; // typical cuid structure
      expect(validateId(validCuid).success).toBe(true);
    });

    it("should reject invalid formats", () => {
      expect(validateId("bad").success).toBe(false);
      expect(validateId("not-a-cuid-just-a-long-string-thing").success).toBe(false);
      expect(validateId("123").success).toBe(false);
    });
  });

  describe("Auth Validators", () => {
    it("should validate a correct login", () => {
      const res = loginSchema.safeParse({ email: "test@example.com", password: "password123" });
      expect(res.success).toBe(true);
    });

    it("should reject invalid login data", () => {
      expect(loginSchema.safeParse({ email: "not-an-email", password: "p" }).success).toBe(false);
      expect(loginSchema.safeParse({ password: "password123" }).success).toBe(false);
    });

    it("should validate a correct registration", () => {
      const res = registerSchema.safeParse({ email: "test@example.com", password: "password123", name: "Test User" });
      expect(res.success).toBe(true);
    });

    it("should reject short passwords", () => {
      expect(registerSchema.safeParse({ email: "test@example.com", password: "123", name: "Test User" }).success).toBe(false);
    });
  });

  describe("Booking Validators", () => {
    it("should validate correct create booking payload", () => {
      const res = createBookingSchema.safeParse({
        planetId: "cm4a2d3s8000008lc5a3s9f5q",
        travelClass: "First Class"
      });
      expect(res.success).toBe(true);
    });

    it("should strip out disallowed fields", () => {
      const res = createBookingSchema.safeParse({
        planetId: "cm4a2d3s8000008lc5a3s9f5q",
        travelClass: "Economy",
        status: "APPROVED" // Should not fail, but gets stripped unless defined properly
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect((res.data as any).status).toBeUndefined(); // Assuming Zod defaults to stripping unknown properties
      }
    });
  });
});
