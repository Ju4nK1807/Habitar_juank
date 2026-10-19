import { Router } from "express";
import { db } from "../db.ts";
import { ErrorApi, noEncontrado } from "../errores.ts";
import { obtenerTrm, precioConUsd } from "../lib/trm.ts";
import { iso, propuesta, type FilaPropuesta } from "../lib/vistas.ts";
import { id, texto } from "../lib/validar.ts";
import { dispositivo } from "./dispositivo.ts";
import { buscarEspacio } from "./espacios.ts";

export const proyectos = Router();

type FilaProyecto = { id: number; nombre: string; espacio_id: number | null; creado: string; espacio_nombre: string | null };

const SELECT = "SELECT pr.*, e.nombre AS espacio_nombre FROM proyectos pr LEFT JOIN espacios e ON e.id = pr.espacio_id";

function buscar(proyId: number, disp: string) {
  const f = db.prepare(`${SELECT} WHERE pr.id = ? AND pr.dispositivo = ?`).get(proyId, disp) as FilaProyecto | undefined;
  if (!f) throw noEncontrado("ese proyecto");
  return f;
}

function propuestasDe(proyId: number) {
  return db.prepare(
    `SELECT p.*, g.contexto FROM proyecto_propuestas pp
     JOIN propuestas p ON p.id = pp.propuesta_id JOIN generaciones g ON g.id = p.generacion_id
     WHERE pp.proyecto_id = ? ORDER BY pp.agregado DESC`,
  ).all(proyId) as (FilaPropuesta & { contexto: string })[];
}

async function vista(f: FilaProyecto, completo: boolean) {
  const trm = await obtenerTrm();
  const ps = propuestasDe(f.id).map((p) => propuesta(p, JSON.parse(p.contexto), trm));
  const totalCop = ps.reduce((s, p) => s + p.precio.cop, 0);
  return {
    id: f.id,
    nombre: f.nombre,
    espacio: f.espacio_id ? { id: f.espacio_id, nombre: f.espacio_nombre } : null,
    creado: iso(f.creado),
    cantidad: ps.length,
    presupuesto: precioConUsd(totalCop, trm),
    portadas: ps.slice(0, 3).map((p) => p.imagenUrl),
    ...(completo ? { propuestas: ps } : {}),
  };
}

proyectos.get("/proyectos", async (_req, res) => {
  const filas = db.prepare(`${SELECT} WHERE pr.dispositivo = ? ORDER BY pr.id DESC`).all(dispositivo(res)) as FilaProyecto[];
  res.json(await Promise.all(filas.map((f) => vista(f, false))));
});

proyectos.get("/proyectos/:id", async (req, res) => {
  res.json(await vista(buscar(id(req.params.id), dispositivo(res)), true));
});

proyectos.post("/proyectos", async (req, res) => {
  const disp = dispositivo(res);
  const nombre = texto(req.body?.nombre, "el nombre del proyecto", 40)!;
  const espacioId = req.body?.espacioId ? buscarEspacio(id(req.body.espacioId), disp).id : null;
  const r = db.prepare("INSERT INTO proyectos (dispositivo, nombre, espacio_id) VALUES (?, ?, ?)").run(disp, nombre, espacioId);
  res.status(201).json(await vista(buscar(Number(r.lastInsertRowid), disp), true));
});

proyectos.delete("/proyectos/:id", (req, res) => {
  const p = buscar(id(req.params.id), dispositivo(res));
  db.prepare("DELETE FROM proyectos WHERE id = ?").run(p.id);
  res.status(204).end();
});

proyectos.post("/proyectos/:id/propuestas", async (req, res) => {
  const disp = dispositivo(res);
  const p = buscar(id(req.params.id), disp);
  const propId = id(req.body?.propuestaId);
  const existe = db.prepare(
    "SELECT 1 FROM propuestas pr JOIN generaciones g ON g.id = pr.generacion_id WHERE pr.id = ? AND g.dispositivo = ? AND g.estado = 'listo'",
  ).get(propId, disp);
  if (!existe) throw noEncontrado("esa propuesta");
  const r = db.prepare("INSERT OR IGNORE INTO proyecto_propuestas (proyecto_id, propuesta_id) VALUES (?, ?)").run(p.id, propId);
  if (r.changes === 0) throw new ErrorApi(409, "ya_guardada", `Esta propuesta ya está en ${p.nombre}`);
  res.status(201).json(await vista(p, false));
});

proyectos.delete("/proyectos/:id/propuestas/:propuestaId", async (req, res) => {
  const p = buscar(id(req.params.id), dispositivo(res));
  db.prepare("DELETE FROM proyecto_propuestas WHERE proyecto_id = ? AND propuesta_id = ?").run(p.id, id(req.params.propuestaId));
  res.json(await vista(p, false));
});
