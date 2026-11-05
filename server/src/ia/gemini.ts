const URL_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// La capa gratuita a veces responde 503 por saturación (y tarda hasta 14 s en decirlo).
// Cada modelo tiene su propio cupo y su propia saturación: con seis en la cadena casi siempre
// responde alguno. Lite va primero porque responde más rápido. (2.5 ya no está disponible.)
const MODELOS = ["gemini-flash-lite-latest", "gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-3.6-flash", "gemini-flash-latest"];
const RONDAS = 2;
const LIMITE_TOTAL_MS = 100_000;

/**
 * Para analizar fotos (estimar medidas, entender el espacio) conviene un modelo más capaz primero.
 * Cuando Flash está saturado responde 503 al instante y se pasa al siguiente.
 */
export const MODELOS_VISION = ["gemini-3.5-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemini-3.1-flash-lite", "gemini-flash-latest"];

export type Parte = { text: string } | { inlineData: { mimeType: string; data: string } };

export class ErrorIa extends Error {}

/** Pide a Gemini una respuesta JSON que cumple el esquema dado. */
export async function generarJson<T>(partes: Parte[], esquema: object, señal?: AbortSignal, modelos = MODELOS): Promise<T> {
  const clave = process.env.GEMINI_API_KEY;
  if (!clave) throw new ErrorIa("Falta GEMINI_API_KEY en server/.env");

  let ultimoError = "";
  // Tope total: con todo saturado es mejor avisar a tiempo que dejar a la persona esperando minutos.
  const limite = Date.now() + LIMITE_TOTAL_MS;
  for (let ronda = 0; ronda < RONDAS; ronda++) {
    if (ronda > 0) await new Promise((ok) => setTimeout(ok, 1500));
    for (const modelo of modelos) {
      if (Date.now() > limite) throw new ErrorIa(`Gemini no respondió a tiempo. Último error: ${ultimoError}`);
      const inicio = Date.now();
      señal?.throwIfAborted();
      let r: Response;
      try {
        r = await fetch(`${URL_BASE}/${modelo}:generateContent`, {
          method: "POST",
          headers: { "x-goog-api-key": clave, "content-type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: partes }],
            generationConfig: { responseMimeType: "application/json", responseSchema: esquema, temperature: 0.9 },
          }),
          signal: señal ? AbortSignal.any([señal, AbortSignal.timeout(30_000)]) : AbortSignal.timeout(30_000),
        });
      } catch (e) {
        if (señal?.aborted) throw e;
        ultimoError = `${modelo}: ${(e as Error).message}`;
        continue;
      }
      const cuerpo = (await r.json().catch(() => ({}))) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
        error?: { message?: string };
      };
      if (r.ok) {
        const texto = cuerpo.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("");
        if (texto) {
          try {
            const datos = JSON.parse(texto) as T;
            console.log(`Gemini ${modelo} respondió en ${((Date.now() - inicio) / 1000).toFixed(1)} s`);
            return datos;
          } catch {
            ultimoError = `${modelo}: JSON inválido`;
            continue;
          }
        }
        ultimoError = `${modelo}: respuesta vacía`;
        continue;
      }
      ultimoError = `${modelo}: ${r.status} ${cuerpo.error?.message ?? ""}`;
      console.warn(`Gemini ${ultimoError}`);
      // 400 = petición mal formada: ningún modelo la aceptará. 404 u otros: pasar al siguiente.
      if (r.status === 400) throw new ErrorIa(ultimoError);
    }
  }
  throw new ErrorIa(`Gemini no respondió. Último error: ${ultimoError}`);
}
