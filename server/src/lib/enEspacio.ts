import { readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { randomUUID } from "node:crypto";
import { db, DIR_FOTOS, DIR_IMAGENES } from "../db.ts";
import { ErrorApi } from "../errores.ts";
import { ponerEnFoto, type Marcas } from "./composicion.ts";
import { ErrorRecorte } from "./croma.ts";
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
