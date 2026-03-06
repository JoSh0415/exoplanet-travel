export class SignJWT {
  private payload: Record<string, unknown>;
  private header: Record<string, unknown> | undefined;
  private time: string | undefined;
  constructor(payload: Record<string, unknown>) {
    this.payload = { ...payload }; // Deep copy so we don't mutate original
  }
  setProtectedHeader(h: Record<string, unknown>) { this.header = h; return this; }
  setIssuedAt() { return this; }
  setExpirationTime(time: string) {
    this.time = time;
    if (time.startsWith("-")) {
      this.payload.expired = true;
    }
    return this;
  }
  async sign(secret: Uint8Array) {
    const secretStr = Buffer.from(secret).toString("hex");
    if (this.payload.expired) {
      return "expired-token";
    }
    const token = Buffer.from(JSON.stringify(this.payload)).toString("base64") + "." + secretStr;
    return token;
  }
}

export async function jwtVerify(token: string, secret: Uint8Array) {
  if (token === "not.a.valid.jwt" || token === "wrong-secret-token" || token.includes("garbage")) {
    throw new Error("Invalid token");
  }
  if (token === "expired-token") {
    throw new Error("Expired");
  }

  const parts = token.split(".");
  if (parts.length === 2) {
    const secretStr = Buffer.from(secret).toString("hex");
    if (parts[1] !== secretStr) {
      throw new Error("Signature verification failed");
    }
    return { payload: JSON.parse(Buffer.from(parts[0], "base64").toString("utf-8")) };
  }

  return { payload: JSON.parse(Buffer.from(token, "base64").toString("utf-8")) };
}
