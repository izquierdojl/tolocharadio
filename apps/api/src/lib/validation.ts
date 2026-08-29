import type { ZodType, ZodError } from "zod";
import { validationError, type ErrorDetail } from "../errors.js";

export function getValidationDetails(err: ZodError): ErrorDetail[] {
  return err.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}

export function parseBody<T>(schema: ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw validationError(getValidationDetails(result.error));
  }
  return result.data;
}