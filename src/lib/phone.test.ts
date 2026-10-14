import { describe, expect, it } from "vitest";

import { maskPhone, normalizeSpanishPhone } from "./phone";

describe("normalizeSpanishPhone", () => {
  it("acepta móviles con prefijo y espacios", () => {
    expect(normalizeSpanishPhone("+34 612 34 56 78")).toBe("612345678");
    expect(normalizeSpanishPhone("0034-612-345-678")).toBe("612345678");
  });

  it("rechaza números que no son españoles", () => {
    expect(normalizeSpanishPhone("12345")).toBeNull();
    expect(normalizeSpanishPhone("512345678")).toBeNull();
  });
});

describe("maskPhone", () => {
  it("deja visibles solo los 3 últimos dígitos", () => {
    expect(maskPhone("612345678")).toBe("••• ••• 678");
  });
});
