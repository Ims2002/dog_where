import type { CustodyStatus, Species } from "./constants";

const NOUN: Record<Species, string> = { dog: "Perro", cat: "Gato", other: "Animal" };

/** Titular del cartel: "Perro encontrado en Xàbia" / "Gato suelto por Dénia". */
export function postHeadline(p: {
  species: Species;
  custody: { status: CustodyStatus };
  locality: string;
}) {
  const noun = NOUN[p.species];
  if (p.custody.status === "not_caught") return `${noun} suelto por ${p.locality}`;
  return `${noun} encontrado en ${p.locality}`;
}
