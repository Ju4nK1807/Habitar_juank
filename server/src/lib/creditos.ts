import { db, transaccion } from "../db.ts";
import { ErrorApi } from "../errores.ts";
import { hoyBogota } from "./trm.ts";

export const BIENVENIDA = 10;
export const RECARGA_DIARIA_HASTA = 3;
export const COSTO_GENERACION = 1;

export function saldo(dispositivo: string): number {
  const r = db.prepare("SELECT COALESCE(SUM(cantidad), 0) AS s FROM movimientos WHERE dispositivo = ?").get(dispositivo) as { s: number };
  return r.s;
}

function registrar(dispositivo: string, tipo: string, cantidad: number, generacionId: number | null = null) {
  db.prepare("INSERT INTO movimientos (dispositivo, tipo, cantidad, generacion_id) VALUES (?, ?, ?, ?)")
    .run(dispositivo, tipo, cantidad, generacionId);
}

/** Crea el dispositivo con su bono de bienvenida, o aplica la recarga diaria si toca. */
export function prepararDispositivo(id: string) {
  transaccion(() => {
    const nuevo = db.prepare("INSERT OR IGNORE INTO dispositivos (id) VALUES (?)").run(id).changes > 0;
    if (nuevo) {
      registrar(id, "bienvenida", BIENVENIDA);
      return;
    }
    const s = saldo(id);
    if (s >= RECARGA_DIARIA_HASTA) return;
    // Las fechas de SQLite son UTC; la recarga se cuenta por día de Bogotá.
    const ultimas = db.prepare(
      "SELECT fecha FROM movimientos WHERE dispositivo = ? AND tipo IN ('recarga','bienvenida') ORDER BY id DESC LIMIT 1",
    ).get(id) as { fecha: string } | undefined;
    const diaUltima = ultimas ? hoyBogota(new Date(ultimas.fecha.replace(" ", "T") + "Z")) : "";
    if (diaUltima < hoyBogota()) registrar(id, "recarga", RECARGA_DIARIA_HASTA - s);
  });
}

export function proximaRecarga(): string {
  // Medianoche de Bogotá (UTC-5, sin horario de verano).
  const manana = new Date(hoyBogota() + "T00:00:00-05:00");
  manana.setUTCDate(manana.getUTCDate() + 1);
  return manana.toISOString();
}

/** Descuenta el costo de una generación. Debe llamarse dentro de una transacción. */
export function cobrarGeneracion(dispositivo: string, generacionId: number) {
  if (saldo(dispositivo) < COSTO_GENERACION) {
    throw new ErrorApi(402, "sin_creditos", "No le quedan créditos. Mañana recibe nuevos");
  }
  registrar(dispositivo, "generacion", -COSTO_GENERACION, generacionId);
}

/** Devuelve el crédito de una generación fallida o cancelada, una sola vez. */
export function reembolsar(dispositivo: string, generacionId: number) {
  transaccion(() => {
    const ya = db.prepare("SELECT 1 FROM movimientos WHERE generacion_id = ? AND tipo = 'reembolso'").get(generacionId);
    const cobrado = db.prepare("SELECT 1 FROM movimientos WHERE generacion_id = ? AND tipo = 'generacion'").get(generacionId);
    if (!ya && cobrado) registrar(dispositivo, "reembolso", COSTO_GENERACION, generacionId);
  });
}

export function movimientos(dispositivo: string) {
  return db.prepare(
    "SELECT id, tipo, cantidad, generacion_id AS generacionId, replace(fecha, ' ', 'T') || 'Z' AS fecha FROM movimientos WHERE dispositivo = ? ORDER BY id DESC LIMIT 100",
  ).all(dispositivo);
}
