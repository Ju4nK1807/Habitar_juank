import type { Marcas } from "@/servicios/tipos";

/** Igual que ESCORZO_PISO en el servidor: cuánto baja en la foto 1 cm de profundidad sobre el piso. */
const ESCORZO_PISO = 0.45;

/**
 * Rectángulo del mueble sobre la foto, en las mismas unidades que W y H.
 * Es la misma cuenta que hace el servidor (server/src/lib/composicion.ts): si cambia allá, cambia aquí.
 */
export function rectanguloMueble(
  W: number,
  H: number,
  marcas: Marcas,
  anchoMuroCm: number,
  mueble: { anchoCm: number; altoCm: number; fondoCm?: number },
  alturaPisoCm: number,
  posicion: number,
) {
  const [izq, der] = marcas.x1 <= marcas.x2
    ? [{ x: marcas.x1 * W, y: marcas.y1 * H }, { x: marcas.x2 * W, y: marcas.y2 * H }]
    : [{ x: marcas.x2 * W, y: marcas.y2 * H }, { x: marcas.x1 * W, y: marcas.y1 * H }];
  const pxPorCm = Math.hypot(der.x - izq.x, der.y - izq.y) / anchoMuroCm;
  const w = mueble.anchoCm * pxPorCm;
  const h = mueble.altoCm * pxPorCm;
  const libre = der.x - izq.x - w;
  const cx = libre <= 0 ? (izq.x + der.x) / 2 : izq.x + w / 2 + libre * Math.min(1, Math.max(0, posicion));
  const t = (cx - izq.x) / Math.max(1, der.x - izq.x);
  const piso = izq.y + (der.y - izq.y) * t;
  const adelante = alturaPisoCm > 0 ? 0 : (mueble.fondoCm ?? 0) * pxPorCm * ESCORZO_PISO;
  const base = piso + adelante - alturaPisoCm * pxPorCm;
  return { izq: cx - w / 2, arriba: base - h, ancho: w, alto: h, libre: Math.max(0, libre) };
}
