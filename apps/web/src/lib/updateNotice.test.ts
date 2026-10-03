import { describe, expect, it } from "vitest";
import { resolveUpdateNotice } from "./updateNotice.js";

describe("resolveUpdateNotice", () => {
  it("no muestra aviso sin ninguna fuente", () => {
    expect(resolveUpdateNotice({ githubHasUpdate: false, swWaiting: false })).toEqual({
      show: false,
      source: null,
    });
  });

  it("muestra el enlace de GitHub cuando solo hay release nueva", () => {
    expect(resolveUpdateNotice({ githubHasUpdate: true, swWaiting: false })).toEqual({
      show: true,
      source: "github",
    });
  });

  it("muestra recarga cuando solo hay SW en espera", () => {
    expect(resolveUpdateNotice({ githubHasUpdate: false, swWaiting: true })).toEqual({
      show: true,
      source: "sw",
    });
  });

  it("muestra un único aviso con prioridad al SW cuando hay ambas", () => {
    expect(resolveUpdateNotice({ githubHasUpdate: true, swWaiting: true })).toEqual({
      show: true,
      source: "sw",
    });
  });
});
