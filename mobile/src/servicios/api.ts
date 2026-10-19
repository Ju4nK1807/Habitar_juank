// Única capa que habla con el backend. Las pantallas nunca llaman a fetch directamente.
import { File as ArchivoLocal } from "expo-file-system";
import { idDispositivo } from "./dispositivo";
import type {
  Catalogos, Creditos, Espacio, EspacioNuevo, Generacion, Movimiento, PedidoGeneracion, Propuesta, Proyecto, Analisis,
} from "./tipos";

export const URL_BASE = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export class ErrorApi extends Error {
  codigo: string;
  estado: number;
  constructor(mensaje: string, codigo: string, estado: number) {
    super(mensaje);
    this.codigo = codigo;
    this.estado = estado;
  }
  get sinConexion() {
    return this.codigo === "sin_conexion";
  }
}

const SIN_CONEXION = "No hay conexión con el servidor de Habita. Revise que el teléfono y el computador estén en la misma red";

async function pedir<T>(ruta: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  if (!URL_BASE) throw new ErrorApi("Falta configurar la dirección del servidor (EXPO_PUBLIC_API_URL)", "sin_configurar", 0);
  const headers = new Headers(init.headers);
  headers.set("X-Dispositivo", await idDispositivo());
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");

  // AbortSignal.timeout no está garantizado en Hermes: se arma a mano.
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), init.timeoutMs ?? 15_000);
  let r: Response;
  try {
    r = await fetch(`${URL_BASE}/api${ruta}`, { ...init, headers, signal: control.signal });
  } catch (e) {
    console.warn(`[api] ${init.method ?? "GET"} ${ruta} falló:`, e instanceof Error ? e.message : e);
    throw new ErrorApi(SIN_CONEXION, "sin_conexion", 0);
  } finally {
    clearTimeout(reloj);
  }
  if (r.status === 204) return undefined as T;
  const cuerpo = await r.json().catch(() => null);
  if (!r.ok) {
    const e = cuerpo?.error;
    throw new ErrorApi(e?.mensaje ?? "Algo falló en el servidor. Intente de nuevo", e?.codigo ?? "desconocido", r.status);
  }
  return cuerpo as T;
}

const json = (body: unknown) => JSON.stringify(body);

/** Las imágenes y fotos vienen como rutas relativas al backend. */
export const urlArchivo = (ruta: string | null | undefined) => (ruta ? `${URL_BASE}${ruta}` : null);

export const api = {
  salud: () => pedir<{ ok: true }>("/salud", { timeoutMs: 5_000 }),
  catalogos: () => pedir<Catalogos>("/catalogos"),

  creditos: () => pedir<Creditos>("/creditos"),
  movimientos: () => pedir<Movimiento[]>("/creditos/movimientos"),

  subirFoto: (uri: string) => {
    // En SDK 57 fetch solo acepta archivos reales en FormData: el objeto { uri, name, type }
    // de React Native falla con "Unsupported FormDataPart implementation".
    const form = new FormData();
    const archivo = new ArchivoLocal(uri);
    form.append("foto", archivo, archivo.name);
    return pedir<{ fotoUrl: string }>("/fotos", { method: "POST", body: form, timeoutMs: 60_000 });
  },
  analizarFoto: (fotoUrl: string) =>
    pedir<Analisis>("/fotos/analisis", { method: "POST", body: json({ fotoUrl }), timeoutMs: 90_000 }),

  espacios: () => pedir<Espacio[]>("/espacios"),
  espacio: (id: number) => pedir<Espacio>(`/espacios/${id}`),
  crearEspacio: (e: EspacioNuevo) => pedir<Espacio>("/espacios", { method: "POST", body: json(e) }),
  editarEspacio: (id: number, e: EspacioNuevo) => pedir<Espacio>(`/espacios/${id}`, { method: "PUT", body: json(e) }),
  borrarEspacio: (id: number) => pedir<void>(`/espacios/${id}`, { method: "DELETE" }),

  generar: (p: PedidoGeneracion) =>
    pedir<{ id: number; estado: "generando"; saldo: number }>("/generaciones", { method: "POST", body: json(p) }),
  generaciones: () => pedir<Generacion[]>("/generaciones"),
  generacion: (id: number) => pedir<Generacion>(`/generaciones/${id}`),
  cancelarGeneracion: (id: number) =>
    pedir<{ id: number; estado: string; saldo: number }>(`/generaciones/${id}/cancelar`, { method: "POST" }),
  propuesta: (id: number) => pedir<Propuesta>(`/propuestas/${id}`),
  verEnEspacio: (id: number, posicion: number) =>
    pedir<{ enEspacioUrl: string }>(`/propuestas/${id}/en-espacio`, { method: "POST", body: json({ posicion }), timeoutMs: 120_000 }),

  proyectos: () => pedir<Proyecto[]>("/proyectos"),
  proyecto: (id: number) => pedir<Proyecto>(`/proyectos/${id}`),
  crearProyecto: (nombre: string, espacioId?: number | null) =>
    pedir<Proyecto>("/proyectos", { method: "POST", body: json({ nombre, espacioId }) }),
  borrarProyecto: (id: number) => pedir<void>(`/proyectos/${id}`, { method: "DELETE" }),
  guardarEnProyecto: (proyectoId: number, propuestaId: number) =>
    pedir<Proyecto>(`/proyectos/${proyectoId}/propuestas`, { method: "POST", body: json({ propuestaId }) }),
  quitarDeProyecto: (proyectoId: number, propuestaId: number) =>
    pedir<Proyecto>(`/proyectos/${proyectoId}/propuestas/${propuestaId}`, { method: "DELETE" }),
};
