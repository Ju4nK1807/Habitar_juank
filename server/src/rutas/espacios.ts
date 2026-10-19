import { Router, type Request } from "express";
import { db } from "../db.ts";
import { LIMITES } from "../catalogos.ts";
import { ErrorApi, noEncontrado } from "../errores.ts";
import { espacio, type FilaEspacio } from "../lib/vistas.ts";
import { id, numero, texto } from "../lib/validar.ts";
import { dispositivo } from "./dispositivo.ts";

export const espacios = Router();

function leer(req: Request) {
  const b = req.body ?? {};
  return {
    nombre: texto(b.nombre, "el nombre del espacio", 40)!,
    ancho: numero(b.anchoCm, "El ancho", LIMITES.anchoCm)!,
    alto: numero(b.altoCm, "El alto", LIMITES.altoCm)!,
    fondo: numero(b.fondoCm, "El fondo", LIMITES.fondoCm, true),
    piso: numero(b.alturaPisoCm, "La altura desde el piso", [0, 250], true),
    foto: texto(b.fotoUrl, "la foto", 200, true),
    analisis: b.analisis ? JSON.stringify(b.analisis) : null,
    marcas: leerMarcas(b.marcas),
    origen: b.medidasOrigen === "ia" ? "ia" : "persona",
  };
}

/** Dos puntos normalizados (0 a 1) sobre la foto: los extremos del ancho medido, a nivel del piso. */
function leerMarcas(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  const m = v as Record<string, unknown>;
  const ok = ["x1", "y1", "x2", "y2"].every((k) => typeof m[k] === "number" && (m[k] as number) >= 0 && (m[k] as number) <= 1);
  if (!ok || Math.abs((m.x2 as number) - (m.x1 as number)) < 0.05) {
    throw new ErrorApi(400, "dato_invalido", "Las marcas del muro no son válidas. Márquelas de nuevo");
  }
  return JSON.stringify({ x1: m.x1, y1: m.y1, x2: m.x2, y2: m.y2 });
}

export function buscarEspacio(espacioId: number, disp: string) {
  const f = db.prepare("SELECT * FROM espacios WHERE id = ? AND dispositivo = ?").get(espacioId, disp) as FilaEspacio | undefined;
  if (!f) throw noEncontrado("ese espacio");
  return f;
}

espacios.get("/espacios", (_req, res) => {
  const filas = db.prepare("SELECT * FROM espacios WHERE dispositivo = ? ORDER BY actualizado DESC").all(dispositivo(res)) as FilaEspacio[];
  res.json(filas.map(espacio));
});

espacios.get("/espacios/:id", (req, res) => {
  res.json(espacio(buscarEspacio(id(req.params.id), dispositivo(res))));
});

espacios.post("/espacios", (req, res) => {
  const e = leer(req);
  const r = db.prepare(
    "INSERT INTO espacios (dispositivo, nombre, ancho_cm, alto_cm, fondo_cm, altura_piso_cm, foto_url, analisis, marcas, medidas_origen) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(dispositivo(res), e.nombre, e.ancho, e.alto, e.fondo, e.piso, e.foto, e.analisis, e.marcas, e.origen);
  res.status(201).json(espacio(buscarEspacio(Number(r.lastInsertRowid), dispositivo(res))));
});

espacios.put("/espacios/:id", (req, res) => {
  const espacioId = id(req.params.id);
  const antes = buscarEspacio(espacioId, dispositivo(res));
  const e = leer(req);
  db.prepare(
    "UPDATE espacios SET nombre = ?, ancho_cm = ?, alto_cm = ?, fondo_cm = ?, altura_piso_cm = ?, foto_url = ?, analisis = ?, marcas = ?, medidas_origen = ?, actualizado = datetime('now') WHERE id = ?",
  ).run(e.nombre, e.ancho, e.alto, e.fondo, e.piso, e.foto, e.analisis, e.marcas, e.origen, espacioId);
  // Con otra foto o marcas, las visualizaciones anteriores ya no corresponden.
  if (antes.foto_url !== e.foto || antes.marcas !== e.marcas || antes.ancho_cm !== e.ancho) db.prepare(
    "UPDATE propuestas SET en_espacio_url = NULL, en_espacio_recorte_url = NULL, en_espacio_pos = NULL WHERE generacion_id IN (SELECT id FROM generaciones WHERE espacio_id = ?)",
  ).run(espacioId);
  res.json(espacio(buscarEspacio(espacioId, dispositivo(res))));
});

espacios.delete("/espacios/:id", (req, res) => {
  const espacioId = id(req.params.id);
  buscarEspacio(espacioId, dispositivo(res));
  db.prepare("DELETE FROM espacios WHERE id = ?").run(espacioId);
  res.status(204).end();
});
