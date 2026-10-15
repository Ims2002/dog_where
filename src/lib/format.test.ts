import { describe, expect, it } from "vitest";

import { contactHref, formatKm, timeAgo, toDateTimeLocalValue } from "./format";

describe("contactHref", () => {
  it("detecta teléfonos y emails", () => {
    expect(contactHref("612 34 56 78")).toBe("tel:612345678");
    expect(contactHref("+34 612345678")).toBe("tel:+34612345678");
    expect(contactHref("ana@example.com")).toBe("mailto:ana@example.com");
    expect(contactHref("Pregunta en el bar de la plaza")).toBeNull();
  });
});

describe("timeAgo", () => {
  const now = new Date("2026-10-15T12:00:00Z");
  it("formatea en español", () => {
    expect(timeAgo("2026-10-15T11:59:30Z", now)).toBe("ahora mismo");
    expect(timeAgo("2026-10-15T09:00:00Z", now)).toBe("hace 3 horas");
    expect(timeAgo("2026-10-14T12:00:00Z", now)).toBe("ayer");
  });
});

describe("formatKm", () => {
  it("usa coma decimal", () => {
    expect(formatKm(2.345)).toBe("2,3 km");
    expect(formatKm(23.4)).toBe("23 km");
  });
});

describe("toDateTimeLocalValue", () => {
  it("usa la hora de Madrid", () => {
    expect(toDateTimeLocalValue(new Date("2026-10-15T08:30:00Z"))).toBe("2026-10-15T10:30");
  });
});
