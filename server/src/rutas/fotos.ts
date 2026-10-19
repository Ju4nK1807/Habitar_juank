import { Router } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { DIR_FOTOS } from "../db.ts";
import { ErrorApi } from "../errores.ts";
import { analizarFoto } from "../lib/analisis.ts";
import { texto } from "../lib/validar.ts";

const EXT: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/heic": ".heic" };
const PERMITIDAS = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic"]);

// Algunos clientes no informan el tipo (llega como application/octet-stream): se usa la extensión.
const extension = (f: Express.Multer.File) => EXT[f.mimetype] ?? extname(f.originalname).toLowerCase();

const subir = multer({
  storage: multer.diskStorage({
    destination: DIR_FOTOS,
    filename: (_req, f, cb) => cb(null, randomUUID() + extension(f).replace(".jpeg", ".jpg")),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, f, cb) => cb(null, PERMITIDAS.has(extension(f))),
});

export const fotos = Router();

fotos.post("/fotos", subir.single("foto"), (req, res) => {
  if (!req.file) throw new ErrorApi(400, "sin_foto", "No recibimos la foto. Use una imagen JPG o PNG");
  res.status(201).json({ fotoUrl: `/fotos/${req.file.filename}` });
});

fotos.post("/fotos/analisis", async (req, res) => {
  const fotoUrl = texto(req.body?.fotoUrl, "la foto", 200)!;
  try {
    res.json(await analizarFoto(fotoUrl));
  } catch (e) {
    if (e instanceof ErrorApi) throw e;
    console.error("Análisis de foto falló:", (e as Error).message);
    throw new ErrorApi(503, "ia_no_disponible", "No pudimos analizar la foto. Puede seguir y escribir los datos usted");
  }
});
