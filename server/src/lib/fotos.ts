import { readFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { DIR_FOTOS } from "../db.ts";
import { ErrorApi } from "../errores.ts";
import type { Parte } from "../ia/gemini.ts";

const MIME: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".heic": "image/heic" };

/** Convierte una fotoUrl propia ("/fotos/abc.jpg") en una parte de imagen para Gemini. */
export async function fotoComoParte(fotoUrl: string): Promise<Parte> {
  if (!fotoUrl.startsWith("/fotos/")) throw new ErrorApi(400, "foto_invalida", "La foto no es válida. Súbala de nuevo");
  const nombre = basename(fotoUrl);
  const mimeType = MIME[extname(nombre).toLowerCase()];
  if (!mimeType) throw new ErrorApi(400, "foto_invalida", "Ese formato de foto no se puede usar. Use JPG o PNG");
  try {
    const data = (await readFile(join(DIR_FOTOS, nombre))).toString("base64");
    return { inlineData: { mimeType, data } };
  } catch {
    throw new ErrorApi(404, "foto_no_encontrada", "No encontramos esa foto. Súbala de nuevo");
  }
}
