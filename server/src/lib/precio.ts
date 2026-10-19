import { DESPERDICIO, HERRAJES, MANO_DE_OBRA, material } from "../catalogos.ts";

export type Pieza = { pieza: string; cantidad: number; anchoCm: number; altoCm: number };

/** Precio en COP a partir del despiece real. Redondeado a la decena de mil. */
export function calcularPrecio(materialId: string, despiece: Pieza[], puertas: number, cajones: number) {
  const mat = material(materialId);
  if (!mat) throw new Error(`Material desconocido: ${materialId}`);

  const areaM2 = despiece.reduce((s, p) => s + (p.cantidad * p.anchoCm * p.altoCm) / 10_000, 0);
  const tableros = areaM2 * DESPERDICIO * mat.precioM2;
  const herrajes = puertas * HERRAJES.porPuerta + cajones * HERRAJES.porCajon;
  const manoDeObra = MANO_DE_OBRA.base + tableros * MANO_DE_OBRA.porcentaje;
  const total = Math.round((tableros + herrajes + manoDeObra) / 10_000) * 10_000;

  const piezas = despiece.reduce((s, p) => s + p.cantidad, 0);
  const fabricacionDias = Math.max(3, Math.round((4 + piezas * 0.35) * mat.factorDias));

  return { cop: total, areaM2: Math.round(areaM2 * 100) / 100, fabricacionDias };
}
