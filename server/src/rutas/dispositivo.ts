import type { RequestHandler, Response } from "express";
import { ErrorApi } from "../errores.ts";
import { prepararDispositivo } from "../lib/creditos.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Identifica el dispositivo por el encabezado X-Dispositivo (no hay login). */
export const requiereDispositivo: RequestHandler = (req, res, next) => {
  const id = req.header("x-dispositivo");
  if (!id || !UUID.test(id)) {
    throw new ErrorApi(401, "sin_dispositivo", "La app no envió su identificador. Ciérrela y ábrala de nuevo");
  }
  prepararDispositivo(id.toLowerCase());
  res.locals.dispositivo = id.toLowerCase();
  next();
};

export const dispositivo = (res: Response): string => res.locals.dispositivo as string;
