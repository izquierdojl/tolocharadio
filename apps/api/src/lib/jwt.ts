import { SignJWT, jwtVerify } from "jose";
import type { Config } from "../config/env.js";

export interface AccessTokenPayload {
  userId: number;
}

export class JwtService {
  private readonly key: Uint8Array;
  private readonly config: Config;

  constructor(config: Config) {
    this.config = config;
    this.key = new TextEncoder().encode(config.jwtAccessSecret);
  }

  async signAccessToken(userId: number): Promise<string> {
    return new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(String(userId))
      .setIssuer("tolocharadio")
      .setIssuedAt()
      .setExpirationTime(this.config.jwtAccessTtl)
      .sign(this.key);
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    const { payload } = await jwtVerify(token, this.key, { issuer: "tolocharadio" });
    const sub = payload.sub;
    if (!sub) {
      throw new Error("Token sin subject");
    }
    const userId = Number(sub);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error("Subject invalido");
    }
    return { userId };
  }
}