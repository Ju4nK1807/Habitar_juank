import { readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { randomUUID } from "node:crypto";
import { db, DIR_FOTOS, DIR_IMAGENES } from "../db.ts";
import { ErrorApi } from "../errores.ts";
import { ponerEnFoto, type Marcas } from "./composicion.ts";
import { ErrorRecorte } from "./croma.ts";
import sharp from "sharp";
import { editarFoto } from "../ia/imagenes.ts";
import { existsSync } from "node:fs";
import type { FilaEspacio } from "./vistas.ts";
import type { Contexto } from "./generacion.ts";

export const POSICION_CENTRO = 0.5;
export const MENSAJE_CUPO = "Se agotó el cupo diario de imágenes. Se renueva a las 7:00 p. m.";

type FilaPropuesta = { id: number; datos: string; imagen_url: string | null; en_espacio_url: string | null; en_espacio_pos: number | null };

// Si llegan dos pedidos iguales a la vez, comparten el mismo trabajo.
const enCurso = new Map<string, Promise<string>>();

/** El espacio debe tener foto y las marcas del ancho para poder ubicar el mueble a escala. */
export function espacioUbicable(e: FilaEspacio | undefined): e is FilaEspacio & { foto_url: string; marcas: string } {
  return !!e?.foto_url && !!e.marcas;
}

/** Ubica una propuesta en la foto del espacio y guarda el resultado. Devuelve su URL. */
export function ubicarPropuesta(p: FilaPropuesta, esp: FilaEspacio & { foto_url: string; marcas: string }, ctx: Contexto, posicion: number): Promise<string> {
  const pos = Math.round(Math.min(1, Math.max(0, posicion)) * 100) / 100;
  if (p.en_espacio_url && p.en_espacio_pos === pos) return Promise.resolve(p.en_espacio_url);
  if (!p.imagen_url) return Promise.reject(new ErrorApi(409, "sin_imagen", "Esta propuesta no tiene imagen para ubicarla en su foto"));

  const clave = `${p.id}@${pos}`;
  const previo = enCurso.get(clave);
  if (previo) return previo;

  const trabajo = (async () => {
    const d = JSON.parse(p.datos) as { anchoCm: number; altoCm: number; fondoCm: number; material: string };
    const img = await ponerEnFoto({
      foto: await readFile(join(DIR_FOTOS, basename(esp.foto_url))),
      muebleRecortado: await leerRecorte(p.imagen_url!),
      marcas: JSON.parse(esp.marcas) as Marcas,
      anchoMuroCm: esp.ancho_cm,
      mueble: { anchoCm: d.anchoCm, altoCm: d.altoCm, fondoCm: d.fondoCm },
      alturaPisoCm: esp.altura_piso_cm ?? 0,
      posicion: pos,
    });
    const archivo = randomUUID();
    await writeFile(join(DIR_IMAGENES, `${archivo}.jpg`), img.completa);
    await writeFile(join(DIR_IMAGENES, `${archivo}-recorte.jpg`), img.recorte);
    const url = `/imagenes/${archivo}.jpg`;
    db.prepare("UPDATE propuestas SET en_espacio_url = ?, en_espacio_recorte_url = ?, en_espacio_pos = ? WHERE id = ?")
      .run(url, `/imagenes/${archivo}-recorte.jpg`, pos, p.id);
    return url;
  })().finally(() => enCurso.delete(clave));
  enCurso.set(clave, trabajo);
  return trabajo;
}

const LADO_MAYOR_EDICION = 1024;

/** Medida de salida que conserva la proporción de la foto, en múltiplos de 16 (lo pide el modelo). */
function medidaEdicion(w: number, h: number) {
  const k = LADO_MAYOR_EDICION / Math.max(w, h);
  const m16 = (n: number) => Math.max(256, Math.round((n * k) / 16) * 16);
  return { ancho: m16(w), alto: m16(h) };
}

type DatosEdicion = { tipoEn?: string; colorEn?: string; ubicacionEn?: string; anchoCm: number; altoCm: number; fondoCm: number };

/**
 * Dibuja la propuesta dentro de la foto real con IA: la foto va primero y la imagen de la
 * propuesta como referencia, para que sea el mismo mueble. A diferencia del pegado a escala,
 * respeta la perspectiva, las esquinas y la luz; el tamaño es aproximado (se le dan las medidas).
 */
/** La foto del espacio lista para editar: orientada y del tamaño que pide el modelo. */
export async function fotoParaEditar(fotoUrl: string) {
  const foto = await sharp(await readFile(join(DIR_FOTOS, basename(fotoUrl)))).rotate().toBuffer();
  const { width: W = 1024, height: H = 1024 } = await sharp(foto).metadata();
  const { ancho, alto } = medidaEdicion(W, H);
  return { imagen: await sharp(foto).resize(ancho, alto, { fit: "fill" }).jpeg({ quality: 90 }).toBuffer(), ancho, alto };
}

/**
 * "Ordenar mi espacio": quita cajas, ropa y objetos sueltos de la foto y deja el cuarto igual
 * (paredes, piso, enchufes, muebles grandes). Sobre esa foto se dibujan después los muebles.
 */
export async function ordenarFoto(fotoUrl: string, señal?: AbortSignal) {
  const { imagen, ancho, alto } = await fotoParaEditar(fotoUrl);
  const prompt = "Edit this photo of a real room: tidy it up. Remove all clutter: boxes, bags, clothes, shoes and slippers, loose objects on the floor and on furniture, cables and trash. Keep the room itself exactly the same: same walls and wall color, same floor, same baseboards, same doors, windows, power outlets and switches, same camera angle, perspective and lighting. Keep the large furniture that is already there (beds, sofas, wardrobes, tables), only tidy them (for example a neatly made bed). Fill the cleared areas with the same floor and wall. Photorealistic, clean and tidy.";
  const ordenada = await sharp(await editarFoto(prompt, [imagen], ancho, alto, señal)).jpeg({ quality: 90 }).toBuffer();
  const archivo = randomUUID();
  await writeFile(join(DIR_IMAGENES, `${archivo}.jpg`), ordenada);
  return { imagen: ordenada, ancho, alto, url: `/imagenes/${archivo}.jpg` };
}

export async function dibujarEnFoto(
  p: { id: number; datos: string; imagen_url: string | null }, fotoUrl: string, ctx: Contexto, señal?: AbortSignal,
  base?: { imagen: Buffer; ancho: number; alto: number },
) {
  if (!p.imagen_url) throw new ErrorApi(409, "sin_imagen", "Esta propuesta no tiene imagen para ponerla en su foto");
  const d = JSON.parse(p.datos) as DatosEdicion;
  // Con "Ordenar mi espacio" se parte de la foto ya ordenada; si no, de la original.
  const { imagen: entrada, ancho, alto } = base ?? (await fotoParaEditar(fotoUrl));
  const referencia = await readFile(join(DIR_IMAGENES, basename(p.imagen_url)));

  const lugar = ctx.analisis?.tipoEspacio && ctx.analisis.tipoEspacio !== "otro" ? ctx.analisis.tipoEspacio : "room";
  const pieza = d.tipoEn || "piece of furniture";
  const prompt = [
    `Edit the first image, a real photo of a ${lugar === "habitación" ? "bedroom" : lugar === "sala" ? "living room" : lugar === "cocina" ? "kitchen" : lugar === "comedor" ? "dining room" : lugar === "estudio" ? "study" : "room"}.`,
    `Place the exact ${pieza} shown in the second image (same design, same ${d.colorEn ?? ""} color, same materials) ${d.ubicacionEn || "in the free space against the wall"}.`,
    `Real size: ${d.anchoCm} cm wide, ${d.altoCm} cm high, ${d.fondoCm} cm deep. Keep it to scale with the room: a baseboard is about 8 cm high, a power outlet plate about 11 cm, a door about 200 cm.`,
    "Photorealistic, as if it were really there: same camera perspective, aligned with the walls, the corners and the baseboard, standing on the floor, natural lighting from the room, soft contact shadows.",
    // Las fotos de tienda suelen traer una sala decorada: se toma solo el mueble.
    `From the second image take only the ${pieza} (with its own cushions if it has them); do not copy anything else from it: no paintings, plants, lamps, windows, walls or floor.`,
    "Keep everything else exactly as it is: walls, power outlets, switches, doors, windows and the other furniture. Same framing.",
  ].join(" ");

  const editada = await editarFoto(prompt, [entrada, referencia], ancho, alto, señal);
  const jpg = await sharp(editada).jpeg({ quality: 88 }).toBuffer();
  const archivo = randomUUID();
  await writeFile(join(DIR_IMAGENES, `${archivo}.jpg`), jpg);
  const url = `/imagenes/${archivo}.jpg`;
  // La foto editada es completa y el mueble puede quedar en cualquier parte: sirve también de "recorte".
  db.prepare("UPDATE propuestas SET en_espacio_url = ?, en_espacio_recorte_url = ?, en_espacio_pos = NULL WHERE id = ?").run(url, url, p.id);
  return url;
}

/** El mueble recortado se guarda al generar, junto a su imagen: <nombre>-mueble.png. */
async function leerRecorte(imagenUrl: string) {
  const ruta = join(DIR_IMAGENES, basename(imagenUrl).replace(/\.jpg$/, "-mueble.png"));
  // Las propuestas creadas antes del fondo croma no tienen recorte: solo vista a escala.
  if (!existsSync(ruta)) throw new ErrorRecorte("Esta propuesta no tiene el mueble recortado");
  return readFile(ruta);
}

/** Pedido desde la app ("Ponerlo en mi foto" o "Reubicar"). */
export async function verEnEspacio(propuestaId: number, dispositivo: string, posicion: number): Promise<string> {
  const f = db.prepare(
    `SELECT p.id, p.datos, p.imagen_url, p.en_espacio_url, p.en_espacio_pos, g.contexto, g.espacio_id FROM propuestas p
     JOIN generaciones g ON g.id = p.generacion_id WHERE p.id = ? AND g.dispositivo = ? AND g.estado = 'listo'`,
  ).get(propuestaId, dispositivo) as (FilaPropuesta & { contexto: string; espacio_id: number | null }) | undefined;
  if (!f) throw new ErrorApi(404, "no_encontrado", "No encontramos esa propuesta. Puede que se haya borrado");

  const esp = f.espacio_id
    ? (db.prepare("SELECT * FROM espacios WHERE id = ?").get(f.espacio_id) as FilaEspacio | undefined)
    : undefined;
  if (!esp?.foto_url) throw new ErrorApi(409, "sin_foto", "Este diseño se hizo sin foto del espacio. Use la vista a escala");
  if (!espacioUbicable(esp)) throw new ErrorApi(409, "sin_marcas", "Marque el ancho del muro en la foto para ubicar el mueble a escala");

  try {
    return await ubicarPropuesta(f, esp, JSON.parse(f.contexto) as Contexto, posicion);
  } catch (e) {
    if (e instanceof ErrorApi) throw e;
    if (e instanceof ErrorRecorte) {
      throw new ErrorApi(422, "sin_recorte", "No pudimos separar este mueble de su imagen. Use la vista a escala");
    }
    console.error(`En espacio ${f.id} falló:`, (e as Error).message);
    throw new ErrorApi(500, "sin_ubicar", "No pudimos ubicar el mueble en su foto. Intente de nuevo");
  }
}
