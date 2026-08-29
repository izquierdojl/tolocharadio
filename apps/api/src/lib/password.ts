import bcrypt from "bcryptjs";
import type { ErrorDetail } from "../errors.js";

const BCRYPT_ROUNDS = 10;

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function validatePassword(password: unknown): ErrorDetail | null {
  if (typeof password !== "string") {
    return { field: "password", message: "La contrasena debe ser un texto" };
  }
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    return {
      field: "password",
      message: `La contrasena debe tener entre ${PASSWORD_MIN} y ${PASSWORD_MAX} caracteres`,
    };
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return {
      field: "password",
      message: "La contrasena debe incluir al menos una letra y un numero",
    };
  }
  return null;
}

export function validateName(name: unknown): ErrorDetail | null {
  if (typeof name !== "string" || name.trim().length === 0) {
    return { field: "name", message: "El nombre no puede estar vacio" };
  }
  if (name.length > 80) {
    return { field: "name", message: "El nombre es demasiado largo (max. 80 caracteres)" };
  }
  return null;
}

export function validateEmail(email: unknown): ErrorDetail | null {
  if (typeof email !== "string" || email.length > 254) {
    return { field: "email", message: "Email invalido" };
  }
  const trimmed = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { field: "email", message: "Email invalido" };
  }
  return null;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}