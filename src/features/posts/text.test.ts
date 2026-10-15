import { describe, expect, it } from "vitest";

import { postHeadline } from "./text";

describe("postHeadline", () => {
  it("cambia según la custodia", () => {
    expect(
      postHeadline({ species: "dog", custody: { status: "with_finder" }, locality: "Xàbia" }),
    ).toBe("Perro encontrado en Xàbia");
    expect(
      postHeadline({ species: "cat", custody: { status: "not_caught" }, locality: "Dénia" }),
    ).toBe("Gato suelto por Dénia");
  });
});
