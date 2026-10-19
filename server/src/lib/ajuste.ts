import { MARGEN_INSTALACION_CM } from "../catalogos.ts";

export type Medidas = { anchoCm: number; altoCm: number; fondoCm: number };
export type Limites = { anchoMaxCm: number | null; altoMaxCm: number | null; fondoMaxCm?: number | null };
export type Ajuste = "cabe" | "ajustado" | "no_cabe" | "sin_medidas";

const NOMBRES = { ancho: "ancho", alto: "alto", fondo: "fondo" } as const;

/**
 * Compara las medidas del mueble con el espacio disponible.
 * diferenciaCm es la holgura de la dimensión más justa: positiva sobra, negativa falta.
 */
export function calcularAjuste(m: Medidas, l: Limites) {
  if (l.anchoMaxCm === null || l.altoMaxCm === null) {
    return { ajuste: "sin_medidas" as Ajuste, diferenciaCm: 0, dimensionCritica: "ancho" as const, etiquetaAjuste: "Sin medidas del espacio" };
  }
  const holguras: { dim: keyof typeof NOMBRES; cm: number }[] = [
    { dim: "ancho", cm: l.anchoMaxCm - m.anchoCm },
    { dim: "alto", cm: l.altoMaxCm - m.altoCm },
  ];
  if (l.fondoMaxCm) holguras.push({ dim: "fondo", cm: l.fondoMaxCm - m.fondoCm });

  const critica = holguras.reduce((a, b) => (b.cm < a.cm ? b : a));
  const cm = Math.round(critica.cm * 10) / 10;
  const ajuste: Ajuste = cm < 0 ? "no_cabe" : cm < MARGEN_INSTALACION_CM ? "ajustado" : "cabe";

  const etiquetaAjuste =
    ajuste === "no_cabe" ? `No cabe · excede ${fmt(-cm)} cm de ${NOMBRES[critica.dim]}`
    : ajuste === "ajustado" ? `Al límite · ${fmt(cm)} cm libres de ${NOMBRES[critica.dim]}`
    : `Cabe · ${fmt(cm)} cm libres`;

  return { ajuste, diferenciaCm: cm, dimensionCritica: critica.dim, etiquetaAjuste };
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","));
