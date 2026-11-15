import { describe, expect, it } from "vitest";
import { defaultEntryPath, defaultViewPath } from "./defaultView.js";

describe("defaultViewPath", () => {
  it("mapea las vistas de radio a sus rutas canónicas", () => {
    expect(defaultViewPath("explorar")).toBe("/explorar");
    expect(defaultViewPath("favoritos")).toBe("/favoritos");
    expect(defaultViewPath("historial")).toBe("/historial");
  });

  it("cae en explorar para valores desconocidos", () => {
    expect(defaultViewPath(null)).toBe("/explorar");
    expect(defaultViewPath("otra")).toBe("/explorar");
  });
});

describe("defaultEntryPath", () => {
  it("lleva a podcasts cuando la sección inicial es podcasts", () => {
    expect(defaultEntryPath({ defaultSection: "podcasts", defaultView: "favoritos" })).toBe(
      "/podcasts",
    );
  });

  it("respeta la vista de radio cuando la sección inicial es radio", () => {
    expect(defaultEntryPath({ defaultSection: "radio", defaultView: "historial" })).toBe(
      "/historial",
    );
    expect(defaultEntryPath({ defaultView: "favoritos" })).toBe("/favoritos");
  });
});
