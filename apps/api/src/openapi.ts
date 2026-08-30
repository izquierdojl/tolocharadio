const errorSchema = {
  type: "object",
  properties: {
    error: {
      type: "object",
      required: ["code", "message", "status"],
      properties: {
        code: { type: "string", example: "NOT_FOUND" },
        message: { type: "string", example: "Recurso no encontrado" },
        status: { type: "integer", example: 404 },
        details: {
          type: "array",
          items: { $ref: "#/components/schemas/ErrorDetail" },
        },
      },
    },
  },
  required: ["error"],
} as const;

const stationSchema = {
  type: "object",
  properties: {
    id: { type: "string", description: "UUID de la emisora en radio-browser.info" },
    name: { type: "string" },
    url: { type: "string", description: "URL resuelta del stream (solo se sirve via proxy de playback)" },
    homepage: { type: ["string", "null"] },
    favicon: { type: ["string", "null"] },
    country: { type: ["string", "null"] },
    countryCode: { type: ["string", "null"] },
    language: { type: ["string", "null"] },
    tags: { type: "array", items: { type: "string" } },
    codec: { type: ["string", "null"] },
    bitrate: { type: ["integer", "null"] },
    isSsl: { type: "boolean" },
    lastCheckOk: { type: ["boolean", "null"] },
    votes: { type: ["integer", "null"] },
    clickCount: { type: ["integer", "null"] },
    isCustom: { type: "boolean", description: "true si es una emisora personalizada del usuario (sin imagen propia)" },
  },
  required: ["id", "name", "url", "isCustom"],
} as const;

const userSchema = {
  type: "object",
  properties: {
    id: { type: "integer" },
    email: { type: "string", format: "email" },
    name: { type: ["string", "null"] },
    theme: { type: "string", enum: ["light", "dark"], description: "Preferencia de tema de la interfaz" },
    createdAt: { type: "integer", description: "Marca de tiempo en milisegundos" },
  },
  required: ["id", "email", "name", "theme", "createdAt"],
} as const;

const authResponseSchema = {
  type: "object",
  properties: {
    user: { $ref: "#/components/schemas/User" },
    accessToken: { type: "string" },
    refreshToken: { type: "string" },
  },
  required: ["user", "accessToken", "refreshToken"],
} as const;

const favoriteSchema = {
  type: "object",
  properties: {
    station: { $ref: "#/components/schemas/Station" },
    addedAt: { type: "integer" },
  },
  required: ["station", "addedAt"],
} as const;

const historyEntrySchema = {
  type: "object",
  properties: {
    station: { $ref: "#/components/schemas/Station" },
    playedAt: { type: "integer" },
  },
  required: ["station", "playedAt"],
} as const;

const playableSchema = {
  type: "object",
  required: ["id", "playable"],
  properties: {
    id: { type: "string" },
    playable: { type: "boolean" },
    reason: { type: "string" },
  },
} as const;

const errorResponses = {
  "400": { description: "Peticion mal formada", content: { "application/json": { schema: errorSchema } } },
  "401": { description: "No autorizado / token invalido", content: { "application/json": { schema: errorSchema } } },
  "403": { description: "Prohibido", content: { "application/json": { schema: errorSchema } } },
  "404": { description: "Recurso no encontrado", content: { "application/json": { schema: errorSchema } } },
  "409": { description: "Conflicto", content: { "application/json": { schema: errorSchema } } },
  "422": { description: "Datos invalidos", content: { "application/json": { schema: errorSchema } } },
  "503": { description: "Servicio no disponible", content: { "application/json": { schema: errorSchema } } },
} as const;

const requireAuth = { security: [{ bearerAuth: [] }] };
const bearer = {
  bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
};

export function buildOpenApi(): Record<string, unknown> {
  return {
    openapi: "3.1.0",
    info: {
      title: "TolochaRadio API",
      version: "0.1.0",
      description:
        "API interna de TolochaRadio: autenticacion JWT, catalogo de emisoras, favoritos, historial y proxy de streaming.",
    },
    servers: [{ url: "/api/v1" }],
    security: [{ bearerAuth: [] }],
    paths: {
      "/health": {
        get: {
          tags: ["Sistema"],
          summary: "Healthcheck",
          security: [],
          responses: { "200": { description: "Servicio operativo" } },
        },
      },
      "/config": {
        get: {
          tags: ["Sistema"],
          summary: "Configuracion publica de la aplicacion",
          security: [],
          responses: {
            "200": {
              description: "Configuracion",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["appName", "registrationEnabled"],
                    properties: {
                      appName: { type: "string" },
                      registrationEnabled: { type: "boolean" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Registrar cuenta",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string", minLength: 8, maxLength: 72 },
                    name: { type: "string", maxLength: 80 },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Cuenta creada",
              content: { "application/json": { schema: authResponseSchema } },
              headers: { "Set-Cookie": { schema: { type: "string" } } },
            },
            ...pick(errorResponses, ["403", "409", "422"]),
          },
        },
      },
      "/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Iniciar sesion",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Sesion iniciada",
              content: { "application/json": { schema: authResponseSchema } },
              headers: { "Set-Cookie": { schema: { type: "string" } } },
            },
            "401": errorResponses["401"],
          },
        },
      },
      "/auth/refresh": {
        post: {
          tags: ["Auth"],
          summary: "Renovar tokens mediante refresh (cookie httpOnly o body)",
          security: [],
          requestBody: {
            content: {
              "application/json": {
                schema: { type: "object", properties: { refreshToken: { type: "string" } } },
              },
            },
          },
          responses: {
            "200": {
              description: "Nuevo par de tokens",
              content: { "application/json": { schema: authResponseSchema } },
            },
            "401": errorResponses["401"],
          },
        },
      },
      "/auth/logout": {
        post: {
          tags: ["Auth"],
          summary: "Cerrar sesion (revoca el refresh)",
          security: [],
          requestBody: {
            content: {
              "application/json": {
                schema: { type: "object", properties: { refreshToken: { type: "string" } } },
              },
            },
          },
          responses: {
            "200": { description: "Sesion cerrada", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } },
          },
        },
      },
      "/auth/forgot-password": {
        post: {
          tags: ["Auth"],
          summary: "Solicitar recuperacion de contrasena (devuelve token de un solo uso)",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { type: "object", required: ["email"], properties: { email: { type: "string", format: "email" } } },
              },
            },
          },
          responses: {
            "200": {
              description: "Token de recuperacion",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      resetToken: { type: ["string", "null"], description: "Token de un solo uso (null si el email no existe, para no revelar cuentas)" },
                    },
                    required: ["resetToken"],
                  },
                },
              },
            },
          },
        },
      },
      "/auth/reset-password": {
        post: {
          tags: ["Auth"],
          summary: "Restablecer contrasena con token de recuperacion",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["token", "newPassword"],
                  properties: {
                    token: { type: "string" },
                    newPassword: { type: "string", minLength: 8, maxLength: 72 },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Contrasena restablecida", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } },
            "400": errorResponses["400"],
            "422": errorResponses["422"],
          },
        },
      },
      "/users/me": {
        get: {
          tags: ["Usuarios"],
          summary: "Perfil del usuario autenticado",
          ...requireAuth,
          responses: {
            "200": { description: "Perfil", content: { "application/json": { schema: { type: "object", properties: { user: { $ref: "#/components/schemas/User" } }, required: ["user"] } } } },
            "401": errorResponses["401"],
          },
        },
        patch: {
          tags: ["Usuarios"],
          summary: "Actualizar perfil (nombre y/o tema)",
          ...requireAuth,
          requestBody: {
            required: true,
            content: { "application/json": { schema: { type: "object", properties: { name: { type: "string", maxLength: 80 }, theme: { type: "string", enum: ["light", "dark"] } } } } },
          },
          responses: {
            "200": { description: "Perfil actualizado", content: { "application/json": { schema: { type: "object", properties: { user: { $ref: "#/components/schemas/User" } }, required: ["user"] } } } },
            ...pick(errorResponses, ["401", "422"]),
          },
        },
      },
      "/users/me/password": {
        patch: {
          tags: ["Usuarios"],
          summary: "Cambiar contrasena (revoca refresh tokens previos)",
          ...requireAuth,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["currentPassword", "newPassword"],
                  properties: { currentPassword: { type: "string" }, newPassword: { type: "string", minLength: 8, maxLength: 72 } },
                },
              },
            },
          },
          responses: {
            "200": { description: "Contrasena actualizada", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } },
            ...pick(errorResponses, ["401", "422"]),
          },
        },
      },
      "/stations/countries": {
        get: {
          tags: ["Emisoras"],
          summary: "Paises disponibles en el catalogo",
          security: [],
          responses: {
            "200": {
              description: "Paises ordenados alfabeticamente",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["items"],
                    properties: { items: { type: "array", items: { type: "string" } } },
                  },
                },
              },
            },
            "503": errorResponses["503"],
          },
        },
      },
      "/stations/languages": {
        get: {
          tags: ["Emisoras"],
          summary: "Idiomas disponibles en el catalogo",
          security: [],
          responses: {
            "200": {
              description: "Idiomas ordenados alfabeticamente",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["items"],
                    properties: { items: { type: "array", items: { type: "string" } } },
                  },
                },
              },
            },
            "503": errorResponses["503"],
          },
        },
      },
      "/stations/tags": {
        get: {
          tags: ["Emisoras"],
          summary: "Generos (tags) disponibles en el catalogo",
          security: [],
          responses: {
            "200": {
              description: "Generos ordenados alfabeticamente",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["items"],
                    properties: { items: { type: "array", items: { type: "string" } } },
                  },
                },
              },
            },
            "503": errorResponses["503"],
          },
        },
      },
      "/stations": {
        get: {
          tags: ["Emisoras"],
          summary: "Buscar y listar emisoras del catalogo",
          security: [],
          parameters: [
            { name: "name", in: "query", required: false, schema: { type: "string" }, description: "Texto a buscar en el nombre" },
            { name: "country", in: "query", required: false, schema: { type: "string" }, description: "Pais" },
            { name: "language", in: "query", required: false, schema: { type: "string" }, description: "Idioma" },
            { name: "tag", in: "query", required: false, schema: { type: "string" }, description: "Etiqueta o genero de la emisora" },
            { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 100, default: 24 } },
            { name: "offset", in: "query", required: false, schema: { type: "integer", minimum: 0, default: 0 } },
            { name: "unique", in: "query", required: false, schema: { type: "boolean", default: false }, description: "Excluir emisoras duplicadas por nombre" },
          ],
          responses: {
            "200": {
              description: "Pagina de emisoras",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["items", "pagination"],
                    properties: {
                      items: { type: "array", items: { $ref: "#/components/schemas/Station" } },
                      pagination: {
                        type: "object",
                        required: ["offset", "limit", "hasMore"],
                        properties: { offset: { type: "integer" }, limit: { type: "integer" }, hasMore: { type: "boolean" } },
                      },
                    },
                  },
                },
              },
            },
            "503": errorResponses["503"],
          },
        },
      },
      "/stations/{id}": {
        get: {
          tags: ["Emisoras"],
          summary: "Detalle de una emisora por UUID",
          security: [],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": { description: "Emisora", content: { "application/json": { schema: stationSchema } } },
            "404": errorResponses["404"],
            "503": errorResponses["503"],
          },
        },
      },
      "/favorites": {
        get: {
          tags: ["Favoritos"],
          summary: "Listar favoritos del usuario",
          ...requireAuth,
          responses: {
            "200": { description: "Favoritos", content: { "application/json": { schema: { type: "object", properties: { items: { type: "array", items: { $ref: "#/components/schemas/Favorite" } } }, required: ["items"] } } } },
            "401": errorResponses["401"],
          },
        },
        post: {
          tags: ["Favoritos"],
          summary: "Anadir favorito",
          ...requireAuth,
          requestBody: {
            required: true,
            content: { "application/json": { schema: { type: "object", required: ["stationId"], properties: { stationId: { type: "string" } } } } },
          },
          responses: {
            "201": { description: "Favorito anadido", content: { "application/json": { schema: { type: "object", properties: { favorite: { $ref: "#/components/schemas/Favorite" } }, required: ["favorite"] } } } },
            ...pick(errorResponses, ["401", "404", "409", "503"]),
          },
        },
      },
      "/favorites/{stationId}": {
        delete: {
          tags: ["Favoritos"],
          summary: "Eliminar favorito (exito si no existia)",
          ...requireAuth,
          parameters: [{ name: "stationId", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": { description: "Eliminado", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } },
            "401": errorResponses["401"],
          },
        },
      },
      "/favorites/order": {
        put: {
          tags: ["Favoritos"],
          summary: "Establecer el orden personalizado de los favoritos",
          ...requireAuth,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["stationIds"],
                  properties: {
                    stationIds: { type: "array", minItems: 1, items: { type: "string" }, description: "Permutacion exacta de los stationId favoritos de la cuenta, en el orden deseado" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Orden guardado", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } },
            ...pick(errorResponses, ["401", "409", "422"]),
          },
        },
      },
      "/history": {
        get: {
          tags: ["Historial"],
          summary: "Listar historial de reproduccion",
          ...requireAuth,
          responses: {
            "200": { description: "Historial", content: { "application/json": { schema: { type: "object", properties: { items: { type: "array", items: { $ref: "#/components/schemas/HistoryEntry" } } }, required: ["items"] } } } },
            "401": errorResponses["401"],
          },
        },
        delete: {
          tags: ["Historial"],
          summary: "Limpiar historial",
          ...requireAuth,
          responses: {
            "200": { description: "Historial limpio", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } },
            "401": errorResponses["401"],
          },
        },
      },
      "/custom-stations": {
        get: {
          tags: ["Emisoras personalizadas"],
          summary: "Listar mis emisoras personalizadas",
          ...requireAuth,
          responses: {
            "200": {
              description: "Mis emisoras personalizadas",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["items"],
                    properties: { items: { type: "array", items: { $ref: "#/components/schemas/Station" } } },
                  },
                },
              },
            },
            "401": errorResponses["401"],
          },
        },
        post: {
          tags: ["Emisoras personalizadas"],
          summary: "Crear una emisora personalizada (nombre + URL)",
          ...requireAuth,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "url"],
                  properties: {
                    name: { type: "string", minLength: 1, maxLength: 256 },
                    url: { type: "string", description: "URL de stream HTTP(S) valida" },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Emisora creada",
              content: { "application/json": { schema: { type: "object", properties: { station: { $ref: "#/components/schemas/Station" } }, required: ["station"] } } },
            },
            ...pick(errorResponses, ["401", "422"]),
          },
        },
      },
      "/custom-stations/{id}": {
        delete: {
          tags: ["Emisoras personalizadas"],
          summary: "Eliminar una emisora personalizada (limpiando favoritos/historial; exito si no existia)",
          ...requireAuth,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": { description: "Eliminado", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } },
            "401": errorResponses["401"],
          },
        },
      },
      "/playback/{stationId}": {
        get: {
          tags: ["Reproduccion"],
          summary: "Proxy de stream de una emisora",
          ...requireAuth,
          parameters: [{ name: "stationId", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": { description: "Stream de audio (audio/mpeg, audio/aac, ...)" },
            "401": errorResponses["401"],
            "404": errorResponses["404"],
            "503": errorResponses["503"],
          },
        },
      },
      "/playback/{stationId}/status": {
        get: {
          tags: ["Reproduccion"],
          summary: "Comprobar disponibilidad del stream",
          ...requireAuth,
          parameters: [{ name: "stationId", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": {
              description: "Estado de disponibilidad",
              content: {
                "application/json": {
                  schema: playableSchema,
                },
              },
            },
            "401": errorResponses["401"],
            "404": errorResponses["404"],
          },
        },
      },
    },
    components: {
      securitySchemes: bearer,
      schemas: {
        Error: errorSchema,
        ErrorDetail: { type: "object", required: ["field", "message"], properties: { field: { type: "string" }, message: { type: "string" } } },
        Station: stationSchema,
        User: userSchema,
        AuthResponse: authResponseSchema,
        Favorite: favoriteSchema,
        HistoryEntry: historyEntrySchema,
      },
    },
  };
}

function pick<T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: readonly K[]): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const key of keys) {
    out[key] = obj[key];
  }
  return out;
}