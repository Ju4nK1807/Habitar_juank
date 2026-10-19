import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

export const RAIZ = join(import.meta.dirname, "..");
// En la nube DATOS apunta al volumen persistente (base y archivos); en local, la carpeta del servidor.
const DATOS = process.env.DATOS ?? RAIZ;
export const DIR_FOTOS = join(DATOS, "uploads", "fotos");
export const DIR_IMAGENES = join(DATOS, "uploads", "imagenes");
mkdirSync(DIR_FOTOS, { recursive: true });
mkdirSync(DIR_IMAGENES, { recursive: true });

export const db = new DatabaseSync(join(DATOS, "habita.db"));

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS dispositivos (
    id      TEXT PRIMARY KEY,
    creado  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- El saldo de créditos es la suma de este libro; nunca se guarda aparte.
  CREATE TABLE IF NOT EXISTS movimientos (
    id             INTEGER PRIMARY KEY,
    dispositivo    TEXT NOT NULL REFERENCES dispositivos(id),
    tipo           TEXT NOT NULL CHECK (tipo IN ('bienvenida','generacion','reembolso','recarga')),
    cantidad       INTEGER NOT NULL,
    generacion_id  INTEGER,
    fecha          TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS espacios (
    id              INTEGER PRIMARY KEY,
    dispositivo     TEXT NOT NULL REFERENCES dispositivos(id),
    nombre          TEXT NOT NULL,
    ancho_cm        REAL NOT NULL,
    alto_cm         REAL NOT NULL,
    fondo_cm        REAL,
    altura_piso_cm  REAL,
    foto_url        TEXT,
    analisis        TEXT,
    creado          TEXT NOT NULL DEFAULT (datetime('now')),
    actualizado     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS generaciones (
    id               INTEGER PRIMARY KEY,
    dispositivo      TEXT NOT NULL REFERENCES dispositivos(id),
    estado           TEXT NOT NULL CHECK (estado IN ('generando','listo','error','cancelado')),
    etapa            TEXT NOT NULL DEFAULT 'propuestas',
    imagenes_listas  INTEGER NOT NULL DEFAULT 0,
    error            TEXT,
    contexto         TEXT NOT NULL,
    espacio_id       INTEGER REFERENCES espacios(id) ON DELETE SET NULL,
    creado           TEXT NOT NULL DEFAULT (datetime('now')),
    terminado        TEXT
  );

  CREATE TABLE IF NOT EXISTS propuestas (
    id             INTEGER PRIMARY KEY,
    generacion_id  INTEGER NOT NULL REFERENCES generaciones(id) ON DELETE CASCADE,
    orden          INTEGER NOT NULL,
    datos          TEXT NOT NULL,
    imagen_url     TEXT
  );

  CREATE TABLE IF NOT EXISTS proyectos (
    id           INTEGER PRIMARY KEY,
    dispositivo  TEXT NOT NULL REFERENCES dispositivos(id),
    nombre       TEXT NOT NULL,
    espacio_id   INTEGER REFERENCES espacios(id) ON DELETE SET NULL,
    creado       TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS proyecto_propuestas (
    proyecto_id   INTEGER NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    propuesta_id  INTEGER NOT NULL REFERENCES propuestas(id) ON DELETE CASCADE,
    agregado      TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (proyecto_id, propuesta_id)
  );

  CREATE TABLE IF NOT EXISTS trm (
    fecha  TEXT PRIMARY KEY,
    valor  REAL NOT NULL
  );
`);

// Migraciones simples: columnas añadidas después de la primera versión.
const columnas = (tabla: string) => (db.prepare(`PRAGMA table_info(${tabla})`).all() as { name: string }[]).map((c) => c.name);
if (!columnas("propuestas").includes("en_espacio_url")) db.exec("ALTER TABLE propuestas ADD COLUMN en_espacio_url TEXT");
if (!columnas("propuestas").includes("en_espacio_pos")) db.exec("ALTER TABLE propuestas ADD COLUMN en_espacio_pos REAL");
if (!columnas("propuestas").includes("en_espacio_recorte_url")) db.exec("ALTER TABLE propuestas ADD COLUMN en_espacio_recorte_url TEXT");
if (!columnas("espacios").includes("marcas")) db.exec("ALTER TABLE espacios ADD COLUMN marcas TEXT");
// "persona" = las midió con metro; "ia" = las estimó la IA mirando la foto.
if (!columnas("espacios").includes("medidas_origen")) db.exec("ALTER TABLE espacios ADD COLUMN medidas_origen TEXT NOT NULL DEFAULT 'persona'");

/** Ejecuta fn dentro de una transacción; si lanza, deshace todo. */
export function transaccion<T>(fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const r = fn();
    db.exec("COMMIT");
    return r;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
