import { Router } from "express";
import { LIMITES, MATERIALES, PRESUPUESTOS, SIN_PREFERENCIA, TIPOS } from "../catalogos.ts";
import { COSTO_GENERACION, movimientos, proximaRecarga, RECARGA_DIARIA_HASTA, saldo } from "../lib/creditos.ts";
import { obtenerTrm } from "../lib/trm.ts";
import { dispositivo } from "./dispositivo.ts";

export const general = Router();

general.get("/catalogos", async (_req, res) => {
  res.json({
    tipos: TIPOS,
    materiales: [
      { id: SIN_PREFERENCIA, nombre: "Sin preferencia", descripcion: "La IA propone el material" },
      ...MATERIALES.map(({ id, nombre, descripcion }) => ({ id, nombre, descripcion })),
    ],
    presupuestos: PRESUPUESTOS,
    limites: LIMITES,
    costoGeneracion: COSTO_GENERACION,
    trm: await obtenerTrm(),
  });
});

general.get("/creditos", (_req, res) => {
  const s = saldo(dispositivo(res));
  res.json({ saldo: s, recargaHasta: RECARGA_DIARIA_HASTA, proximaRecarga: s < RECARGA_DIARIA_HASTA ? proximaRecarga() : null });
});

general.get("/creditos/movimientos", (_req, res) => {
  res.json(movimientos(dispositivo(res)));
});
