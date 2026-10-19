import sharp from "sharp";

/**
 * Dos puntos que la persona marcó en su foto: los extremos del ancho que midió, a la altura
 * del piso. Coordenadas normalizadas (0 a 1) sobre la foto ya orientada.
 */
export type Marcas = { x1: number; y1: number; x2: number; y2: number };

type Entrada = {
  foto: Buffer;
  /** El mueble recortado de su imagen (PNG con transparencia, ver lib/croma.ts). */
  muebleRecortado: Buffer;
  marcas: Marcas;
  anchoMuroCm: number;
  mueble: { anchoCm: number; altoCm: number; fondoCm?: number };
  alturaPisoCm: number;
  /** Centro horizontal del mueble entre las marcas: 0 = marca izquierda, 1 = marca derecha. */
  posicion: number;
};

const LADO_MAYOR_SALIDA = 1600;

/**
 * Escorzo del piso: cuánto baja en la foto 1 cm de profundidad sobre el piso, comparado con 1 cm
 * de ancho sobre el muro. Con una foto tomada de pie y de frente (cámara a ~1,5 m, a ~2–3 m del
 * muro) ronda 0,45. Es una aproximación: sirve para que las patas delanteras pisen el piso delante
 * del zócalo en vez de quedar sobre la línea del muro (lo que hacía ver el mueble flotando).
 */
export const ESCORZO_PISO = 0.45;

/** Dónde queda el mueble en la foto (en px de la foto orientada), según las marcas y las medidas. */
export function rectanguloMueble(W: number, H: number, e: Pick<Entrada, "marcas" | "anchoMuroCm" | "mueble" | "alturaPisoCm" | "posicion">) {
  const [izq, der] = e.marcas.x1 <= e.marcas.x2
    ? [{ x: e.marcas.x1 * W, y: e.marcas.y1 * H }, { x: e.marcas.x2 * W, y: e.marcas.y2 * H }]
    : [{ x: e.marcas.x2 * W, y: e.marcas.y2 * H }, { x: e.marcas.x1 * W, y: e.marcas.y1 * H }];
  const pxPorCm = Math.hypot(der.x - izq.x, der.y - izq.y) / e.anchoMuroCm;
  const w = e.mueble.anchoCm * pxPorCm;
  const h = e.mueble.altoCm * pxPorCm;
  // Si es más ancho que el muro, se centra y sobresale por ambos lados (como en la vista a escala).
  const libre = der.x - izq.x - w;
  const cx = libre <= 0 ? (izq.x + der.x) / 2 : izq.x + w / 2 + libre * Math.min(1, Math.max(0, e.posicion));
  const t = (cx - izq.x) / Math.max(1, der.x - izq.x);
  const piso = izq.y + (der.y - izq.y) * t;
  // Apoyado en el piso, el frente del mueble queda delante del muro: su base se ve más abajo.
  const adelante = e.alturaPisoCm > 0 ? 0 : (e.mueble.fondoCm ?? 0) * pxPorCm * ESCORZO_PISO;
  const base = piso + adelante - e.alturaPisoCm * pxPorCm;
  return { izq: cx - w / 2, arriba: base - h, ancho: w, alto: h, pxPorCm };
}

/**
 * Pone el mueble en la foto real sin IA: el mueble ya recortado (fondo croma) se escala a sus
 * medidas reales con las marcas del muro, se apoya en el piso, se ajusta a la luz de la foto y se
 * le agrega una sombra de contacto. La foto queda intacta alrededor.
 *
 * Antes se pedía a la IA que lo dibujara dentro de la foto, pero no respetaba tamaño ni posición
 * y redibujaba el entorno (barras corridas, enchufes inventados). Así siempre cuadra.
 */
export async function ponerEnFoto(e: Entrada): Promise<{ completa: Buffer; recorte: Buffer }> {
  const foto = await sharp(e.foto).rotate().toBuffer(); // aplica la orientación EXIF
  const { width: W = 0, height: H = 0 } = await sharp(foto).metadata();
  const r = rectanguloMueble(W, H, e);
  const png = e.muebleRecortado;
  const { width: mw = 1, height: mh = 1 } = await sharp(png).metadata();

  // Escala: las imágenes son de frente, así que el ancho del recorte es el ancho real del frente
  // (el alto incluye un poco de la tapa, vista desde arriba). Si la proporción no cuadra con las
  // medidas (imágenes viejas en tres cuartos), se escala por el alto.
  let ancho = Math.max(8, Math.round(r.ancho));
  let alto = Math.max(8, Math.round(mh * (ancho / mw)));
  if (Math.abs(alto / r.alto - 1) > 0.35) {
    alto = Math.max(8, Math.round(r.alto));
    ancho = Math.max(8, Math.round(mw * (alto / mh)));
  }
  const izq = Math.round(r.izq + r.ancho / 2 - ancho / 2);
  const arriba = Math.round(r.arriba + r.alto - alto);

  // Luz: se acerca el brillo y el tono del mueble a los de la pared donde va.
  const zona = {
    left: Math.max(0, izq),
    top: Math.max(0, arriba),
    width: Math.max(1, Math.min(W, izq + ancho) - Math.max(0, izq)),
    height: Math.max(1, Math.min(H, arriba + alto) - Math.max(0, arriba)),
  };
  const st = await sharp(foto).extract(zona).stats();
  const media = [st.channels[0].mean, st.channels[1].mean, st.channels[2].mean];
  const lumFoto = (media[0] + media[1] + media[2]) / 3;
  // El mueble viene con luz de estudio (pared de referencia ~235): se acerca a la luz de la foto.
  const factor = Math.min(1.05, Math.max(0.6, Math.sqrt(lumFoto / 235)));
  const tinte = media.map((m) => factor * (0.85 + (0.15 * m) / Math.max(1, lumFoto)));
  const escalado = await sharp(png).resize(ancho, alto, { fit: "fill" }).png().toBuffer();
  const mueble = await sharp(escalado).linear([tinte[0], tinte[1], tinte[2], 1], [0, 0, 0, 0]).png().toBuffer();

  // Sombra de contacto: elipse oscura y difusa en la base.
  const sh = Math.max(6, Math.round(alto * 0.05));
  const lienzo = { w: ancho + sh * 8, h: sh * 6 };
  const sombra = await sharp(Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${lienzo.w}" height="${lienzo.h}"><ellipse cx="${lienzo.w / 2}" cy="${lienzo.h / 2}" rx="${ancho * 0.52}" ry="${sh}" fill="black" fill-opacity="0.42"/></svg>`,
  )).blur(sh * 0.9).png().toBuffer();

  const capas = await Promise.all([
    capaDentro(sombra, lienzo.w, lienzo.h, Math.round(izq + ancho / 2 - lienzo.w / 2), Math.round(arriba + alto - lienzo.h / 2), W, H),
    capaDentro(mueble, ancho, alto, izq, arriba, W, H),
  ]);
  const compuesta = await sharp(foto)
    .composite(capas.filter((c): c is NonNullable<typeof c> => !!c))
    .jpeg({ quality: 90 })
    .toBuffer();

  const escala = LADO_MAYOR_SALIDA / Math.max(W, H);
  const completa = escala < 1
    ? await sharp(compuesta).resize(Math.round(W * escala), Math.round(H * escala)).jpeg({ quality: 86 }).toBuffer()
    : compuesta;

  // Recorte centrado en el mueble para tarjetas y detalle: cuadrado si cabe; si el mueble es más
  // alto que el ancho de la foto, vertical, para que se vea entero (la app lo muestra sin cortar).
  const rh = Math.min(H, Math.round(Math.max(alto * 1.25, ancho * 1.8)));
  const rw = Math.min(W, Math.max(Math.round(ancho * 1.8), rh));
  const cl = Math.round(Math.min(W - rw, Math.max(0, izq + ancho / 2 - rw / 2)));
  const ct = Math.round(Math.min(H - rh, Math.max(0, arriba + alto / 2 - rh / 2)));
  const recorte = await sharp(compuesta).extract({ left: cl, top: ct, width: rw, height: rh })
    .resize(768, 768, { fit: "inside" }).jpeg({ quality: 86 }).toBuffer();
  return { completa, recorte };
}

/** Recorta una capa para que quepa dentro de la foto (sharp no admite capas que se salgan). */
async function capaDentro(img: Buffer, w: number, h: number, x: number, y: number, W: number, H: number) {
  const left = Math.max(0, -x);
  const top = Math.max(0, -y);
  const width = Math.min(w - left, W - Math.max(0, x));
  const height = Math.min(h - top, H - Math.max(0, y));
  if (width <= 0 || height <= 0) return null;
  const input = left || top || width < w || height < h ? await sharp(img).extract({ left, top, width, height }).png().toBuffer() : img;
  return { input, left: Math.max(0, x), top: Math.max(0, y) };
}
