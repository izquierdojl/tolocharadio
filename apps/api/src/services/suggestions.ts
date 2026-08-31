import { and, asc, eq } from "drizzle-orm";
import type { DB } from "../db/client.js";
import { suggestions } from "../db/schema.js";
import { conflict, validationError } from "../errors.js";
import { sanitizeText } from "./normalize.js";

const MAX_GENRE_LENGTH = 120;

export interface Suggestion {
  id: number;
  genre: string;
}

export class SuggestionsService {
  constructor(private readonly db: DB) {}

  async list(userId: number): Promise<Suggestion[]> {
    const rows = await this.db
      .select({ id: suggestions.id, genre: suggestions.genre })
      .from(suggestions)
      .where(eq(suggestions.userId, userId))
      .orderBy(asc(suggestions.createdAt));
    return rows;
  }

  async add(userId: number, genre: string): Promise<Suggestion> {
    const sanitized = sanitizeText(genre, MAX_GENRE_LENGTH);
    if (!sanitized) {
      throw validationError([{ field: "genre", message: "El genero de la sugerencia no puede estar vacio" }]);
    }

    const existing = await this.db
      .select({ id: suggestions.id })
      .from(suggestions)
      .where(and(eq(suggestions.userId, userId), eq(suggestions.genre, sanitized)))
      .limit(1);
    if (existing.length > 0) {
      throw conflict("SUGGESTION_ALREADY_EXISTS", "Ese genero ya esta en tus sugerencias");
    }

    const now = Date.now();
    const inserted = await this.db
      .insert(suggestions)
      .values({ userId, genre: sanitized, createdAt: now })
      .returning({ id: suggestions.id, genre: suggestions.genre });
    return inserted[0]!;
  }

  async delete(userId: number, id: number): Promise<{ ok: true }> {
    await this.db.delete(suggestions).where(and(eq(suggestions.userId, userId), eq(suggestions.id, id)));
    return { ok: true };
  }
}