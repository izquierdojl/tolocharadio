import { beforeEach, describe, expect, it } from "vitest";
import type { TestServer } from "./helpers.js";
import { request, setupServer } from "./helpers.js";

let server: TestServer;

beforeEach(() => {
  server = setupServer();
});

async function registerUser(email = "sugg@example.com") {
  const res = await request(server.app)
    .post("/api/v1/auth/register")
    .send({ email, password: "Password1" })
    .expect(201);
  return res.body.accessToken as string;
}

describe("suggestions", () => {
  it("requiere autenticacion", async () => {
    await request(server.app).get("/api/v1/suggestions").expect(401);
    await request(server.app).post("/api/v1/suggestions").send({ genre: "jazz" }).expect(401);
    await request(server.app).delete("/api/v1/suggestions/1").expect(401);
  });

  it("devuelve lista vacia al principio", async () => {
    const token = await registerUser();
    const res = await request(server.app)
      .get("/api/v1/suggestions")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.items).toEqual([]);
  });

  it("crea y lista sugerencias en orden de creacion", async () => {
    const token = await registerUser();
    const first = await request(server.app)
      .post("/api/v1/suggestions")
      .set("Authorization", `Bearer ${token}`)
      .send({ genre: "jazz" })
      .expect(201);
    expect(first.body.suggestion.genre).toBe("jazz");
    expect(first.body.suggestion.id).toEqual(expect.any(Number));

    const second = await request(server.app)
      .post("/api/v1/suggestions")
      .set("Authorization", `Bearer ${token}`)
      .send({ genre: "clasica" })
      .expect(201);

    const list = await request(server.app)
      .get("/api/v1/suggestions")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(list.body.items.map((s: { genre: string }) => s.genre)).toEqual(["jazz", "clasica"]);
    expect(list.body.items[0].id).toBe(first.body.suggestion.id);
    expect(list.body.items[1].id).toBe(second.body.suggestion.id);
  });

  it("rechaza genero duplicado con 409", async () => {
    const token = await registerUser();
    await request(server.app)
      .post("/api/v1/suggestions")
      .set("Authorization", `Bearer ${token}`)
      .send({ genre: "jazz" })
      .expect(201);
    const dup = await request(server.app)
      .post("/api/v1/suggestions")
      .set("Authorization", `Bearer ${token}`)
      .send({ genre: "jazz" })
      .expect(409);
    expect(dup.body.error.code).toBe("SUGGESTION_ALREADY_EXISTS");
  });

  it("rechaza genero vacio o de solo espacios con 422", async () => {
    const token = await registerUser();
    const res = await request(server.app)
      .post("/api/v1/suggestions")
      .set("Authorization", `Bearer ${token}`)
      .send({ genre: "   " })
      .expect(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("elimina una sugerencia y devuelve exito", async () => {
    const token = await registerUser();
    const created = await request(server.app)
      .post("/api/v1/suggestions")
      .set("Authorization", `Bearer ${token}`)
      .send({ genre: "folk" })
      .expect(201);
    const del = await request(server.app)
      .delete(`/api/v1/suggestions/${created.body.suggestion.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(del.body).toEqual({ ok: true });

    const list = await request(server.app)
      .get("/api/v1/suggestions")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(list.body.items).toHaveLength(0);
  });

  it("eliminar una sugerencia inexistente devuelve exito", async () => {
    const token = await registerUser();
    const del = await request(server.app)
      .delete("/api/v1/suggestions/999999")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(del.body).toEqual({ ok: true });
  });

  it("rechaza un id invalido en el borrado con 400", async () => {
    const token = await registerUser();
    await request(server.app)
      .delete("/api/v1/suggestions/abc")
      .set("Authorization", `Bearer ${token}`)
      .expect(400);
  });

  it("aisla las sugerencias entre cuentas", async () => {
    const tokenA = await registerUser("a@example.com");
    const tokenB = await registerUser("b@example.com");
    const created = await request(server.app)
      .post("/api/v1/suggestions")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ genre: "rock" })
      .expect(201);

    const listB = await request(server.app)
      .get("/api/v1/suggestions")
      .set("Authorization", `Bearer ${tokenB}`)
      .expect(200);
    expect(listB.body.items).toHaveLength(0);

    const delB = await request(server.app)
      .delete(`/api/v1/suggestions/${created.body.suggestion.id}`)
      .set("Authorization", `Bearer ${tokenB}`)
      .expect(200);
    expect(delB.body).toEqual({ ok: true });

    const listA = await request(server.app)
      .get("/api/v1/suggestions")
      .set("Authorization", `Bearer ${tokenA}`)
      .expect(200);
    expect(listA.body.items).toHaveLength(1);
    expect(listA.body.items[0].genre).toBe("rock");
  });
});