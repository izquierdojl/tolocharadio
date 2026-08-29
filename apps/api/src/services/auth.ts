import { eq } from "drizzle-orm";
import type { Config, PublicUser } from "../config/env.js";
import type { DB } from "../db/client.js";
import { passwordResetTokens, refreshTokens, users } from "../db/schema.js";
import { badRequest, conflict, forbidden, unauthorized, validationError } from "../errors.js";
import type { JwtService } from "../lib/jwt.js";
import {
  hashPassword,
  normalizeEmail,
  validateEmail,
  validateName,
  validatePassword,
  verifyPassword,
} from "../lib/password.js";
import { generateToken, hashToken } from "../lib/token.js";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export interface AuthDeps {
  config: Config;
  db: DB;
  jwt: JwtService;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

type UserRow = typeof users.$inferSelect;

let dummyHashPromise: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  dummyHashPromise ??= hashPassword("tolocha-timing-dummy-1234");
  return dummyHashPromise;
}

function toPublicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  };
}

export class AuthService {
  private readonly deps: AuthDeps;

  constructor(deps: AuthDeps) {
    this.deps = deps;
  }

  private get config(): Config {
    return this.deps.config;
  }

  private async issueTokens(user: UserRow): Promise<Tokens> {
    const accessToken = await this.deps.jwt.signAccessToken(user.id);
    const refreshToken = generateToken();
    const now = Date.now();
    await this.deps.db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: now + this.config.jwtRefreshTtlMs,
      createdAt: now,
    });
    return { accessToken, refreshToken };
  }

  async register(input: { email: string; password: string; name?: string }) {
    const { config, db } = this.deps;
    if (!config.registrationEnabled) {
      throw forbidden("REGISTRATION_DISABLED", "El registro esta deshabilitado");
    }

    const emailIssue = validateEmail(input.email);
    if (emailIssue) throw validationError([emailIssue]);
    const passwordIssue = validatePassword(input.password);
    if (passwordIssue) throw validationError([passwordIssue]);

    const nameIssue = input.name !== undefined ? validateName(input.name) : null;
    if (nameIssue) throw validationError([nameIssue]);

    const email = normalizeEmail(input.email);
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing.length > 0) {
      throw conflict("EMAIL_ALREADY_REGISTERED", "Ya existe una cuenta con este email");
    }

    const passwordHash = await hashPassword(input.password);
    const now = Date.now();
    const [user] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        name: input.name?.trim() || null,
        createdAt: now,
      })
      .returning();
    if (!user) throw new Error("No se pudo crear el usuario");

    const tokens = await this.issueTokens(user);
    return { user: toPublicUser(user), ...tokens };
  }

  async login(input: { email: string; password: string }) {
    const { db } = this.deps;
    const email = normalizeEmail(input.email);
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    const hashToCheck = user ? user.passwordHash : await getDummyHash();
    const passwordOk = await verifyPassword(input.password, hashToCheck);
    if (!user || !passwordOk) {
      throw unauthorized("INVALID_CREDENTIALS", "Email o contrasena incorrectos");
    }

    const tokens = await this.issueTokens(user);
    return { user: toPublicUser(user), ...tokens };
  }

  async refresh(refreshToken: string | undefined) {
    const { db } = this.deps;
    if (!refreshToken) {
      throw unauthorized("INVALID_REFRESH_TOKEN", "Token de refresco invalido o expirado");
    }
    const hash = hashToken(refreshToken);
    const [row] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, hash))
      .limit(1);

    const now = Date.now();
    if (!row || row.expiresAt <= now) {
      if (row) {
        await db.delete(refreshTokens).where(eq(refreshTokens.id, row.id));
      }
      throw unauthorized("INVALID_REFRESH_TOKEN", "Token de refresco invalido o expirado");
    }

    const [user] = await db.select().from(users).where(eq(users.id, row.userId)).limit(1);
    if (!user) {
      throw unauthorized("INVALID_REFRESH_TOKEN", "Token de refresco invalido o expirado");
    }

    await db.delete(refreshTokens).where(eq(refreshTokens.id, row.id));

    const tokens = await this.issueTokens(user);
    return { user: toPublicUser(user), ...tokens };
  }

  async logout(refreshToken: string | undefined) {
    const { db } = this.deps;
    if (refreshToken) {
      await db
        .delete(refreshTokens)
        .where(eq(refreshTokens.tokenHash, hashToken(refreshToken)));
    }
    return { ok: true };
  }

  async changeName(userId: number, input: { name: string }) {
    const nameIssue = validateName(input.name);
    if (nameIssue) throw validationError([nameIssue]);
    const { db } = this.deps;
    const [user] = await db
      .update(users)
      .set({ name: input.name.trim() })
      .where(eq(users.id, userId))
      .returning();
    if (!user) throw unauthorized();
    return toPublicUser(user);
  }

  async changePassword(userId: number, input: { currentPassword: string; newPassword: string }) {
    const passwordIssue = validatePassword(input.newPassword);
    if (passwordIssue) throw validationError([passwordIssue]);

    const { db } = this.deps;
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw unauthorized();

    const ok = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!ok) {
      throw unauthorized("WRONG_CURRENT_PASSWORD", "La contrasena actual no es correcta");
    }

    const passwordHash = await hashPassword(input.newPassword);
    await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
    return { ok: true };
  }

  async publicUser(userId: number): Promise<PublicUser | null> {
    const { db } = this.deps;
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    return user ? toPublicUser(user) : null;
  }

  async forgotPassword(input: { email: string }) {
    const { db } = this.deps;
    const email = normalizeEmail(input.email);
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);

    const resetToken = generateToken();
    if (user) {
      const now = Date.now();
      await db.insert(passwordResetTokens).values({
        userId: user.id,
        tokenHash: hashToken(resetToken),
        expiresAt: now + RESET_TOKEN_TTL_MS,
        createdAt: now,
      });
    }
    return { resetToken: user ? resetToken : null };
  }

  async resetPassword(input: { token: string; newPassword: string }) {
    const passwordIssue = validatePassword(input.newPassword);
    if (passwordIssue) throw validationError([passwordIssue]);

    const { db } = this.deps;
    const hash = hashToken(input.token);
    const [row] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, hash))
      .limit(1);

    const now = Date.now();
    if (!row || row.usedAt !== null || row.expiresAt <= now) {
      throw badRequest("INVALID_RESET_TOKEN", "El enlace de recuperacion no es valido o ha caducado");
    }

    const passwordHash = await hashPassword(input.newPassword);
    await db.update(users).set({ passwordHash }).where(eq(users.id, row.userId));
    await db.update(passwordResetTokens).set({ usedAt: now }).where(eq(passwordResetTokens.id, row.id));
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, row.userId));
    return { ok: true };
  }
}