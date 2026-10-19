import express from "express";
import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import { DIR_FOTOS, DIR_IMAGENES } from "./db.ts";
import { manejarErrores } from "./errores.ts";
import { recuperarInterrumpidas } from "./lib/generacion.ts";
import { requiereDispositivo } from "./rutas/dispositivo.ts";
import { general } from "./rutas/general.ts";
import { fotos } from "./rutas/fotos.ts";
import { espacios } from "./rutas/espacios.ts";
import { generaciones } from "./rutas/generaciones.ts";
import { proyectos } from "./rutas/proyectos.ts";

const app = express();

// Registro breve de cada petición: ayuda a ver si el teléfono está llegando.
app.use((req, res, next) => {
  const inicio = Date.now();
  res.on("finish", () => {
    if (req.originalUrl.startsWith("/api")) console.log(`${req.method} ${req.originalUrl.split("?")[0]} → ${res.statusCode} (${Date.now() - inicio} ms)`);
  });
  next();
});
app.use(express.json({ limit: "200kb" }));

// Archivos con nombre UUID: se sirven sin identificar el dispositivo para que <Image> los cargue.
app.use("/fotos", express.static(DIR_FOTOS, { maxAge: "30d", immutable: true }));
app.use("/imagenes", express.static(DIR_IMAGENES, { maxAge: "30d", immutable: true }));

const api = express.Router();
api.get("/salud", (_req, res) => {
  res.json({ ok: true, servicio: "habita", hora: new Date().toISOString() });
});
api.use(requiereDispositivo);
api.use(general, fotos, espacios, generaciones, proyectos);
api.use((_req, res) => {
  res.status(404).json({ error: { codigo: "ruta", mensaje: "Esa ruta no existe" } });
});

app.use("/api", api);
app.use(manejarErrores);

const puerto = Number(process.env.PORT ?? 3000);
// En Express 5 el callback de app.listen también se llama con error: se usa el evento "listening".
const servidor = createServer(app);
servidor.listen(puerto, "0.0.0.0");
servidor.on("listening", () => {
  // Solo la instancia que obtuvo el puerto puede cerrar generaciones a medias.
  recuperarInterrumpidas();
  const ips = Object.values(networkInterfaces()).flat()
    .filter((i) => i && i.family === "IPv4" && !i.internal).map((i) => i!.address);
  console.log(`Habita backend en el puerto ${puerto}`);
  for (const ip of ips) console.log(`  En la red local: http://${ip}:${puerto}/api`);
});
servidor.on("error", (e: NodeJS.ErrnoException) => {
  if (e.code === "EADDRINUSE") {
    console.error(`El puerto ${puerto} ya está en uso: probablemente el backend ya está corriendo en otra terminal.`);
    process.exit(1);
  }
  throw e;
});
