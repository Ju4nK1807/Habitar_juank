import { api, ErrorApi } from "@/servicios/api";
import { useBorrador, type FotoBorrador } from "@/store/borrador";
import { fechaCorta } from "@/lib/formato";
import type { Espacio } from "@/servicios/tipos";

// La foto se sube y se analiza en segundo plano: la persona sigue al paso 2 sin esperar.
let enCurso: Promise<void> | null = null;

function actualizar(uri: string, cambios: Partial<FotoBorrador>) {
  const f = useBorrador.getState().foto;
  // Si la persona cambió de foto mientras tanto, este resultado ya no aplica.
  if (f?.uri !== uri) return false;
  useBorrador.getState().cambiar({ foto: { ...f, ...cambios } });
  return true;
}

async function correr(uri: string, fotoUrlPrevia: string | null) {
  try {
    const fotoUrl = fotoUrlPrevia ?? (await api.subirFoto(uri)).fotoUrl;
    if (!actualizar(uri, { fotoUrl, estado: "analizando", error: null })) return;
    const analisis = await api.analizarFoto(fotoUrl);
    actualizar(uri, { analisis, estado: "lista" });
  } catch (e) {
    actualizar(uri, { estado: "error", error: e instanceof ErrorApi ? e.message : "No pudimos mirar la foto" });
  }
}

function iniciar(f: FotoBorrador) {
  const trabajo = correr(f.uri, f.fotoUrl).finally(() => {
    if (enCurso === trabajo) enCurso = null;
  });
  enCurso = trabajo;
}

/** Usa una foto recién tomada o elegida como el espacio del diseño. */
export function usarFoto(uri: string) {
  const foto: FotoBorrador = { uri, fotoUrl: null, analisis: null, estado: "subiendo", error: null };
  useBorrador.getState().cambiar({ foto, espacio: null, omitioEspacio: false });
  iniciar(foto);
}

/** Vuelve a intentar, o retoma un análisis que quedó a medias al cerrar la app. */
export function retomarFoto(forzar = false) {
  const f = useBorrador.getState().foto;
  if (!f || f.estado === "lista" || (enCurso && !forzar)) return;
  if (f.estado === "error" && !forzar) return;
  useBorrador.getState().cambiar({ foto: { ...f, estado: f.fotoUrl ? "analizando" : "subiendo", error: null } });
  iniciar(useBorrador.getState().foto!);
}

/**
 * Espera a que termine el análisis y guarda la foto como espacio, con las medidas y la zona que
 * estimó la IA. Devuelve null si la foto no se pudo analizar (el diseño sigue, sin sus colores).
 */
export async function espacioDeLaFoto(): Promise<Espacio | null> {
  retomarFoto();
  if (enCurso) await enCurso;
  const f = useBorrador.getState().foto;
  const a = f?.analisis;
  if (!f || f.estado !== "lista" || !f.fotoUrl || !a?.medidas) return null;
  const tipo = a.tipoEspacio && a.tipoEspacio !== "otro" ? a.tipoEspacio : "espacio";
  const e = await api.crearEspacio({
    nombre: `${tipo[0].toUpperCase()}${tipo.slice(1)} · ${fechaCorta(new Date().toISOString())}`,
    anchoCm: a.medidas.anchoCm,
    altoCm: a.medidas.altoCm,
    fondoCm: a.medidas.fondoCm,
    alturaPisoCm: null,
    fotoUrl: f.fotoUrl,
    analisis: a,
    marcas: a.marcas ?? null,
    medidasOrigen: "ia",
  });
  // Queda como espacio elegido: si la persona vuelve a generar, no se guarda dos veces.
  useBorrador.getState().cambiar({ espacio: e, foto: null });
  return e;
}
