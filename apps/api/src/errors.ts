export interface ErrorDetail {
  field: string;
  message: string;
}

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const badRequest = (code: string, message: string, details?: ErrorDetail[]) =>
  new AppError(400, code, message, details);

export const unauthorized = (code = "UNAUTHORIZED", message = "No autorizado") =>
  new AppError(401, code, message);

export const forbidden = (code = "FORBIDDEN", message = "Prohibido") =>
  new AppError(403, code, message);

export const notFound = (code = "NOT_FOUND", message = "Recurso no encontrado") =>
  new AppError(404, code, message);

export const conflict = (code = "CONFLICT", message = "Conflicto") =>
  new AppError(409, code, message);

export const validationError = (details: ErrorDetail[]) =>
  new AppError(422, "VALIDATION_ERROR", "Datos de entrada invalidos", details);

export const serviceUnavailable = (
  code = "SERVICE_UNAVAILABLE",
  message = "Servicio no disponible",
) => new AppError(503, code, message);