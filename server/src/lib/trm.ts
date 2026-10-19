import { db } from "../db.ts";

// TRM oficial (Superfinanciera) publicada en datos abiertos de Colombia.
const URL_TRM = "https://www.datos.gov.co/resource/32sa-8pi3.json?$order=vigenciadesde%20DESC&$limit=1";

export const hoyBogota = (d = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(d);

export type Trm = { valor: number; fecha: string };

let consultando: Promise<void> | null = null;

/** Devuelve la TRM más reciente; consulta la fuente como máximo una vez al día. */
export async function obtenerTrm(): Promise<Trm | null> {
  const ultima = () => db.prepare("SELECT fecha, valor FROM trm ORDER BY fecha DESC LIMIT 1").get() as Trm | undefined;
  const actual = ultima();
  if (actual && actual.fecha >= hoyBogota()) return actual;

  consultando ??= (async () => {
    try {
      const r = await fetch(URL_TRM, { signal: AbortSignal.timeout(5000) });
      const [fila] = (await r.json()) as { valor: string; vigenciadesde: string }[];
      const valor = Number(fila?.valor);
      if (valor > 0) {
        db.prepare("INSERT OR REPLACE INTO trm (fecha, valor) VALUES (?, ?)").run(fila.vigenciadesde.slice(0, 10), valor);
      }
    } catch (e) {
      console.warn("No se pudo actualizar la TRM; se usa la última guardada.", (e as Error).message);
    } finally {
      consultando = null;
    }
  })();
  await consultando;
  return ultima() ?? null;
}

export function precioConUsd(cop: number, trm: Trm | null) {
  return {
    cop,
    usd: trm ? Math.round(cop / trm.valor) : null,
    trm: trm?.valor ?? null,
    fechaTrm: trm?.fecha ?? null,
  };
}
