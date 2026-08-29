import { existsSync } from "node:fs";
import { resolve } from "node:path";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type NextFunction, type Request, type Response, type RequestHandler } from "express";
import type { Config } from "./config/env.js";
import type { AppContext } from "./context.js";
import { AppError } from "./errors.js";
import { swaggerUiDistPath, swaggerUiHtml } from "./lib/swagger.js";
import { buildOpenApi } from "./openapi.js";
import { authRouter } from "./routes/auth.js";
import { favoritesRouter } from "./routes/favorites.js";
import { historyRouter } from "./routes/history.js";
import { playbackRouter } from "./routes/playback.js";
import { stationsRouter } from "./routes/stations.js";
import { usersRouter } from "./routes/users.js";

function errorBody(
  status: number,
  code: string,
  message: string,
  details?: Array<{ field: string; message: string }>,
) {
  return {
    error: {
      code,
      message,
      status,
      ...(details ? { details } : {}),
    },
  };
}

function corsOptions(config: Config) {
  return {
    credentials: true,
    origin(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
      if (!origin || config.corsOrigins.includes("*") || config.corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
  };
}

function serveFrontend(staticDir: string): RequestHandler {
  const absolute = resolve(staticDir);
  const indexHtml = resolve(absolute, "index.html");
  const staticMiddleware = express.static(absolute);

  return (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api") || (req.method !== "GET" && req.method !== "HEAD")) {
      return next();
    }
    staticMiddleware(req, res, (err) => {
      if (err) return next(err);
      if (req.method === "GET" && existsSync(indexHtml)) {
        return res.sendFile(indexHtml);
      }
      return next();
    });
  };
}

export function createApp(ctx: AppContext): express.Express {
  const app = express();
  app.disable("x-powered-by");

  app.use(cors(corsOptions(ctx.config)));
  app.use(express.json({ limit: "128kb" }));
  app.use(cookieParser());

  app.get("/api/v1/health", (req, res) => {
    res.json({ status: "ok", uptime: process.uptime(), timestamp: Date.now() });
  });

  app.get("/api/v1/config", (req, res) => {
    res.json({ appName: "TolochaRadio", registrationEnabled: ctx.config.registrationEnabled });
  });

  app.use("/api/v1", authRouter(ctx));
  app.use("/api/v1", usersRouter(ctx));
  app.use("/api/v1", stationsRouter(ctx));
  app.use("/api/v1", favoritesRouter(ctx));
  app.use("/api/v1", historyRouter(ctx));
  app.use("/api/v1", playbackRouter(ctx));

  app.get("/api/v1/openapi.json", (req, res) => {
    res.json(buildOpenApi());
  });
  app.use("/swagger", express.static(swaggerUiDistPath()));
  app.get("/api/v1/docs", (req, res) => {
    res.type("html").send(swaggerUiHtml());
  });

  app.use("/api/v1", (req: Request, res: Response) => {
    res.status(404).json(errorBody(404, "NOT_FOUND", "Ruta no encontrada"));
  });

  if (ctx.config.staticDir) {
    app.use(serveFrontend(ctx.config.staticDir));
  }

  app.use("/api", (req: Request, res: Response) => {
    res.status(404).json(errorBody(404, "NOT_FOUND", "Ruta no encontrada"));
  });

  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      return next(err);
    }
    let status = 500;
    let code = "INTERNAL_ERROR";
    let message = "Error interno del servidor";
    let details: Array<{ field: string; message: string }> | undefined;

    if (err instanceof AppError) {
      status = err.status;
      code = err.code;
      message = err.message;
      details = err.details;
    }
    if (status >= 500) {
      console.error(`[${new Date().toISOString()}] ${code}:`, err);
    }
    res.status(status).json(errorBody(status, code, message, details));
  });

  return app;
}