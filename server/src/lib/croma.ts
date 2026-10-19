import sharp from "sharp";

/** El mueble no se pudo separar del fondo azul (no hay azul o el mueble toca el borde). */
export class ErrorRecorte extends Error {}

/**
 * Frase para el prompt: el mueble se dibuja sobre azul croma para poder recortarlo.
 * Azul y no verde: con verde, la IA teñía la madera de oliva; la madera casi no tiene azul,
 * así que el reflejo azul se detecta y se quita sin tocar su color.
 */
export const FONDO_CROMA =
  "isolated on a perfectly flat solid pure chroma key blue (#0000FF) background, the whole background is the same saturated blue, " +
  "no floor, no shadow on the background, entire piece fully visible and centered with generous margin on every side";

/**
 * Separa el mueble del fondo azul (croma), como en cine: un píxel es fondo cuando el azul
 * domina con claridad sobre el rojo y el verde. Los bordes quedan semitransparentes y se les quita
 * el reflejo azul. Devuelve el mueble recortado (PNG con transparencia) y una versión sobre
 * fondo blanco para las tarjetas.
 */
export async function separarDeCroma(imagen: Buffer) {
  const { data: rgb, info } = await sharp(imagen).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const rgba = Buffer.alloc(w * h * 4);
  let deFondo = 0;
  let x0 = w, x1 = -1, y0 = h, y1 = -1;

  for (let i = 0; i < w * h; i++) {
    const r = rgb[i * 3], g = rgb[i * 3 + 1], b = rgb[i * 3 + 2];
    // Cuánto domina el azul: 60 o menos es mueble; 120 o más, fondo; entre medio, borde suave.
    // El fondo croma ronda 200; con un umbral más bajo, muebles de tono azulado quedaban translúcidos.
    const dominio = b - Math.max(r, g);
    const alfa = Math.round(255 * Math.min(1, Math.max(0, (120 - dominio) / 60)));
    if (alfa < 128) deFondo++;
    // Quitar el reflejo azul que rebota en el mueble: el azul no puede pasar del verde ni del
    // 85 % del rojo. Madera, blancos y grises casi no cambian.
    rgba[i * 4] = r;
    rgba[i * 4 + 1] = g;
    rgba[i * 4 + 2] = Math.min(b, Math.max(g, r * 0.85) + 2);
    rgba[i * 4 + 3] = alfa;
    if (alfa >= 128) {
      const x = i % w, y = (i - x) / w;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }

  // Comprobaciones: debe haber fondo azul de sobra y el mueble no puede tocar el borde (estaría cortado).
  const margen = Math.round(Math.min(w, h) * 0.01);
  if (deFondo < w * h * 0.25) throw new ErrorRecorte("La imagen no tiene fondo azul");
  if (x1 < 0 || x0 <= margen || y0 <= margen || x1 >= w - 1 - margen || y1 >= h - 1 - margen) {
    throw new ErrorRecorte("El mueble toca el borde de la imagen");
  }

  // Recortar un píxel del contorno: ahí queda un filo con mezcla del azul del fondo.
  const alfaOriginal = Buffer.alloc(w * h);
  for (let i = 0; i < w * h; i++) alfaOriginal[i] = rgba[i * 4 + 3];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      rgba[i * 4 + 3] = Math.min(alfaOriginal[i], alfaOriginal[i - 1], alfaOriginal[i + 1], alfaOriginal[i - w], alfaOriginal[i + w]);
    }
  }

  const completo = await sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
  // En sharp, extract en la misma cadena se aplica antes que otras operaciones: va en otro paso.
  const mueble = await sharp(completo).extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }).png().toBuffer();
  const tarjeta = await sharp(completo).flatten({ background: "#FFFFFF" }).jpeg({ quality: 90 }).toBuffer();
  return { mueble, tarjeta };
}
