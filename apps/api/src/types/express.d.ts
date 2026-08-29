export {};
import type { PublicUser } from "../config/env.js";

declare global {
  namespace Express {
    interface Request {
      authUser?: PublicUser;
    }
  }
}