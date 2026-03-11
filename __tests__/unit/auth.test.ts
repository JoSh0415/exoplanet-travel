import { hashPassword, verifyPassword, SessionPayload } from "../../app/lib/auth";
import { createToken, verifyToken } from "../../app/lib/auth";
import { SignJWT } from "jose";
import type { JWTPayload } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

describe("Auth Utilities", () => {
  describe("Password Hashing", () => {
    it("should hash a password and verify it correctly", async () => {
      const password = "my-secure-password";
      const hash = await hashPassword(password);
      
      expect(hash).not.toBe(password);
      
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it("should fail verification for incorrect password", async () => {
      const password = "my-secure-password";
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword("wrong-password", hash);
      expect(isValid).toBe(false);
    });
  });

  describe("JWT Tokens", () => {
    const mockPayload: SessionPayload = {
      userId: "user-123",
      email: "test@example.com",
      name: "Test User",
      role: "USER",
    };

    it("should create and verify a valid token", async () => {
      const token = await createToken(mockPayload);
      expect(typeof token).toBe("string");

      const decoded = await verifyToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(mockPayload.userId);
      expect(decoded?.email).toBe(mockPayload.email);
      expect(decoded?.role).toBe(mockPayload.role);
    });

    it("should return null for malformed tokens", async () => {
      const malformed = await verifyToken("not.a.valid.jwt");
      expect(malformed).toBeNull();
    });

    it("should return null for tokens signed with a different secret", async () => {
      const wrongSecret = new TextEncoder().encode("wrong-secret-key");
      const badToken = await new SignJWT(mockPayload as unknown as JWTPayload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(wrongSecret);

      const decoded = await verifyToken(badToken);
      expect(decoded).toBeNull();
    });

    it("should return null for expired tokens", async () => {
      // Create a token that explicitly expired in the past
      const expiredToken = await new SignJWT(mockPayload as unknown as JWTPayload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("-1h") // Expired 1 hour ago
        .sign(JWT_SECRET);

      const decoded = await verifyToken(expiredToken);
      expect(decoded).toBeNull();
    });
  });
});
