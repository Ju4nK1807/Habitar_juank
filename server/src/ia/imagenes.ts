// Imágenes con Cloudflare Workers AI. flux-2-klein-4b genera 4 en paralelo en ~23 s;
// flux-1-schnell tardaba ~70 s porque Cloudflare las encola.
const MODELO = "@cf/black-forest-labs/flux-2-klein-4b";

/** El cupo gratis diario de Cloudflare (10.000 neuronas) se agotó; se renueva a las 00:00 UTC. */
export class ErrorCupo extends Error {}

/** Genera una imagen. El tamaño debe ser múltiplo de 16; ~768×768 px cuesta ~100 neuronas. */
export async function generarImagen(prompt: string, ancho: number, alto: number, señal?: AbortSignal): Promise<Buffer> {
  const modelo = MODELO;
  const { CLOUDFLARE_ACCOUNT_ID: cuenta, CLOUDFLARE_API_TOKEN: token } = process.env;
  if (!cuenta || !token) throw new Error("Faltan las llaves de Cloudflare en server/.env");

  let ultimoError = "";
  for (let intento = 0; intento < 2; intento++) {
    señal?.throwIfAborted();
    const form = new FormData();
    form.append("prompt", prompt);
    form.append("width", String(ancho));
    form.append("height", String(alto));
    try {
      const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cuenta}/ai/run/${modelo}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
        signal: señal ? AbortSignal.any([señal, AbortSignal.timeout(90_000)]) : AbortSignal.timeout(90_000),
      });
      const j = (await r.json()) as { result?: { image?: string }; errors?: { message: string; code?: number }[] };
      if (r.ok && j.result?.image) return Buffer.from(j.result.image, "base64");
      if (j.errors?.some((e) => e.code === 4006)) throw new ErrorCupo("Cupo diario de Cloudflare agotado");
      ultimoError = `${r.status} ${j.errors?.map((e) => e.message).join("; ")}`;
    } catch (e) {
      if (señal?.aborted || e instanceof ErrorCupo) throw e;
      ultimoError = (e as Error).message;
    }
  }
  throw new Error(`Cloudflare no generó la imagen: ${ultimoError}`);
}
