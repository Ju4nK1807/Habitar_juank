import { Router } from "express";
import { db, transaccion } from "../db.ts";
import { LIMITES, SIN_PREFERENCIA, material, presupuesto, tipo } from "../catalogos.ts";
import { ErrorApi, noEncontrado } from "../errores.ts";
import { cobrarGeneracion, reembolsar, saldo } from "../lib/creditos.ts";
import { cancelar, ejecutarGeneracion, type Contexto } from "../lib/generacion.ts";
import { obtenerTrm, type Trm } from "../lib/trm.ts";
import { verEnEspacio } from "../lib/enEspacio.ts";
import { iso, propuesta, type FilaPropuesta } from "../lib/vistas.ts";
import { id, numero, texto } from "../lib/validar.ts";
import { dispositivo } from "./dispositivo.ts";
import { buscarEspacio } from "./espacios.ts";

export const generaciones = Router();

type FilaGeneracion = {
  id: number; estado: string; etapa: string; imagenes_listas: number; error: string | null;
  contexto: string; creado: string; terminado: string | null;
};

function vista(g: FilaGeneracion, trm: Trm | null) {
  const contexto = JSON.parse(g.contexto) as Contexto;
  const filas = db.prepare("SELECT * FROM propuestas WHERE generacion_id = ? ORDER BY orden").all(g.id) as FilaPropuesta[];
  return {
    id: g.id,
    estado: g.estado,
    etapa: g.etapa,
    imagenesListas: g.imagenes_listas,
    error: g.error,
    contexto,
    creado: iso(g.creado),
    terminado: g.terminado,
    // Mientras se generan las imágenes las propuestas ya existen, pero solo se entregan al terminar.
    propuestas: g.estado === "listo" ? filas.map((f) => propuesta(f, contexto, trm)) : [],
  };
}

function buscar(genId: number, disp: string) {
  const g = db.prepare("SELECT * FROM generaciones WHERE id = ? AND dispositivo = ?").get(genId, disp) as FilaGeneracion | undefined;
  if (!g) throw noEncontrado("esa generación");
  return g;
}

generaciones.post("/generaciones", (req, res) => {
  const disp = dispositivo(res);
  const b = req.body ?? {};

  const t = tipo(String(b.tipo));
  if (!t) throw new ErrorApi(400, "dato_invalido", "Elija qué tipo de mueble necesita");
  const descripcion = texto(b.descripcion, "la descripción", LIMITES.descripcionMax)!;
  // Las medidas son opcionales: si faltan se usan las del espacio (medidas o estimadas por la IA).
  let anchoMaxCm = numero(b.anchoMaxCm, "El ancho", LIMITES.anchoCm, true);
  let altoMaxCm = numero(b.altoMaxCm, "El alto", LIMITES.altoCm, true);
  let medidasOrigen: "persona" | "ia" | null = anchoMaxCm && altoMaxCm ? (b.medidasOrigen === "ia" ? "ia" : "persona") : null;
  let fondoMaxCm = numero(b.fondoMaxCm, "El fondo", LIMITES.fondoCm, true);
  const mat = String(b.material ?? SIN_PREFERENCIA);
  if (mat !== SIN_PREFERENCIA && !material(mat)) throw new ErrorApi(400, "dato_invalido", "Elija un material de la lista");
  if (!presupuesto(String(b.presupuesto))) throw new ErrorApi(400, "dato_invalido", "Elija una franja de presupuesto");
  const referencias = Array.isArray(b.referencias) ? b.referencias.slice(0, 2).filter((r: unknown) => typeof r === "string") : [];

  let esp = null;
  if (b.espacioId) {
    esp = buscarEspacio(id(b.espacioId), disp);
    if (!anchoMaxCm || !altoMaxCm) {
      anchoMaxCm = esp.ancho_cm;
      altoMaxCm = esp.alto_cm;
      medidasOrigen = esp.medidas_origen === "ia" ? "ia" : "persona";
    }
    // Contra medidas tomadas con metro sí se valida; contra una estimación de la IA, no.
    if (esp.medidas_origen !== "ia") {
      if (anchoMaxCm > esp.ancho_cm) throw new ErrorApi(400, "excede_espacio", "El ancho supera el del muro guardado. Ajústelo para poder diseñar");
      if (altoMaxCm > esp.alto_cm) throw new ErrorApi(400, "excede_espacio", "El alto supera el del muro guardado. Ajústelo para poder diseñar");
    }
    fondoMaxCm ??= esp.fondo_cm;
  }

  const contexto: Contexto = {
    tipo: t.id, tipoNombre: t.nombre, descripcion, anchoMaxCm, altoMaxCm, fondoMaxCm, medidasOrigen,
    material: mat, presupuesto: String(b.presupuesto),
    espacioId: esp?.id ?? null, espacioNombre: esp?.nombre ?? null,
    fotoUrl: esp?.foto_url ?? null, analisis: esp?.analisis ? JSON.parse(esp.analisis) : null,
    referencias,
    ubicable: !!esp?.foto_url && !!esp.marcas,
  };

  const genId = transaccion(() => {
    const r = db.prepare("INSERT INTO generaciones (dispositivo, estado, contexto, espacio_id) VALUES (?, 'generando', ?, ?)")
      .run(disp, JSON.stringify(contexto), contexto.espacioId);
    const nuevo = Number(r.lastInsertRowid);
    cobrarGeneracion(disp, nuevo);
    return nuevo;
  });

  void ejecutarGeneracion(genId, disp, contexto);
  res.status(202).json({ id: genId, estado: "generando", saldo: saldo(disp) });
});

generaciones.get("/generaciones", async (_req, res) => {
  const trm = await obtenerTrm();
  const filas = db.prepare(
    "SELECT * FROM generaciones WHERE dispositivo = ? AND estado IN ('listo','generando') ORDER BY id DESC LIMIT 20",
  ).all(dispositivo(res)) as FilaGeneracion[];
  res.json(filas.map((g) => {
    const v = vista(g, trm);
    const guardadas = db.prepare(
      "SELECT COUNT(*) AS n FROM proyecto_propuestas pp JOIN propuestas p ON p.id = pp.propuesta_id WHERE p.generacion_id = ?",
    ).get(g.id) as { n: number };
    return { ...v, guardadas: guardadas.n };
  }));
});

generaciones.get("/generaciones/:id", async (req, res) => {
  res.json(vista(buscar(id(req.params.id), dispositivo(res)), await obtenerTrm()));
});

generaciones.post("/generaciones/:id/cancelar", (req, res) => {
  const disp = dispositivo(res);
  const g = buscar(id(req.params.id), disp);
  if (g.estado === "generando") {
    db.prepare("UPDATE generaciones SET estado = 'cancelado', terminado = ? WHERE id = ?").run(new Date().toISOString(), g.id);
    db.prepare("DELETE FROM propuestas WHERE generacion_id = ?").run(g.id);
    cancelar(g.id);
    reembolsar(disp, g.id);
  }
  res.json({ id: g.id, estado: g.estado === "generando" ? "cancelado" : g.estado, saldo: saldo(disp) });
});

generaciones.get("/propuestas/:id", async (req, res) => {
  const f = db.prepare(
    "SELECT p.*, g.contexto FROM propuestas p JOIN generaciones g ON g.id = p.generacion_id WHERE p.id = ? AND g.dispositivo = ? AND g.estado = 'listo'",
  ).get(id(req.params.id), dispositivo(res)) as (FilaPropuesta & { contexto: string }) | undefined;
  if (!f) throw noEncontrado("esa propuesta");
  const proyectos = db.prepare(
    "SELECT pr.id, pr.nombre FROM proyecto_propuestas pp JOIN proyectos pr ON pr.id = pp.proyecto_id WHERE pp.propuesta_id = ?",
  ).all(f.id);
  res.json({ ...propuesta(f, JSON.parse(f.contexto), await obtenerTrm()), proyectos });
});

generaciones.post("/propuestas/:id/en-espacio", async (req, res) => {
  const posicion = typeof req.body?.posicion === "number" ? req.body.posicion : 0.5;
  res.json({ enEspacioUrl: await verEnEspacio(id(req.params.id), dispositivo(res), posicion) });
});
