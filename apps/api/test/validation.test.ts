import { describe, expect, it } from "vitest";
import { validateEmail, validateName, validatePassword } from "../src/lib/password.js";

describe("validateEmail", () => {
  it("acepta emails validos", () => {
    expect(validateEmail("user@example.com")).toBeNull();
    expect(validateEmail("a.b+tag@sub.example.co.uk")).toBeNull();
  });

  it("rechaza emails invalidos", () => {
    expect(validateEmail("nope")).not.toBeNull();
    expect(validateEmail("a@b")).not.toBeNull();
    expect(validateEmail("")).not.toBeNull();
  });
});

describe("validatePassword", () => {
  it("acepta contrasenas con 8+ caracteres, letras y numeros", () => {
    expect(validatePassword("Password1")).toBeNull();
    expect(validatePassword("h3ll0-world-12345")).toBeNull();
  });

  it("rechaza contrasenas debiles", () => {
    expect(validatePassword("short1")).not.toBeNull();
    expect(validatePassword("onlyletters")).not.toBeNull();
    expect(validatePassword("12345678")).not.toBeNull();
    expect(validatePassword("a".repeat(73) + "1")).not.toBeNull();
  });
});

describe("validateName", () => {
  it("acepta nombres razonables", () => {
    expect(validateName("Ana García")).toBeNull();
    expect(validateName("  Maria  ")).toBeNull();
  });

  it("rechaza nombres invalidos", () => {
    expect(validateName("")).not.toBeNull();
    expect(validateName(" ".repeat(5))).not.toBeNull();
    expect(validateName("x".repeat(81))).not.toBeNull();
  });
});