// Convierte filas de la base en la forma pública de la API (ver CLAUDE.md).
import { material, presupuesto } from "../catalogos.ts";
import { calcularAjuste } from "./ajuste.ts";
import { precioConUsd, type Trm } from "./trm.ts";
import type { Contexto } from "./generacion.ts";
import type { Pieza } from "./precio.ts";

export type FilaPropuesta = { id: number; generacion_id: number; orden: number; datos: string; imagen_url: string | null; en_espacio_url?: string | null; en_espacio_pos?: number | null; en_espacio_recorte_url?: string | null };

type Datos = {
  nombre: string; concepto: string; material: string; acabado: string;
  tipoMueble?: string; color?: string; porQue?: string;
  /** Producto real de tienda: el precio es el de la tienda y lleva su enlace. */
  tienda?: string; url?: string;
  anchoCm: number; altoCm: number; fondoCm: number; puertas: number; cajones: number;
  despiece: Pieza[]; precioCop: number; areaM2: number; fabricacionDias: number;
};

/** SQLite guarda "AAAA-MM-DD HH:MM:SS" en UTC; la app necesita ISO 8601. */
export const iso = (s: string) => s.replace(" ", "T") + "Z";

/**
 * Con medidas estimadas por la IA mirando la foto no se puede afirmar si cabe: la estimación puede
 * fallar por mucho. Se trata como sin medir y se invita a medir antes de fabricar.
 */
function ajusteConOrigen(d: { anchoCm: number; altoCm: number; fondoCm: number }, c: Contexto) {
  const a = calcularAjuste(d, c);
  return c.medidasOrigen === "ia" ? { ...a, ajuste: "sin_medidas" as const, diferenciaCm: 0, etiquetaAjuste: "Sin medir · mida el espacio antes de fabricar" } : a;
}

const cm = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");

export function propuesta(f: FilaPropuesta, c: Contexto, trm: Trm | null) {
  const d = JSON.parse(f.datos) as Datos;
  const franja = c.presupuesto ? presupuesto(c.presupuesto) : undefined;
  return {
    id: f.id,
    generacionId: f.generacion_id,
    orden: f.orden,
    nombre: d.nombre,
    concepto: d.concepto,
    // Las propuestas anteriores a la recomendación por colores no tienen estos datos.
    tipoMueble: d.tipoMueble ?? null,
    color: d.color ?? null,
    porQue: d.porQue ?? null,
    tienda: d.tienda && d.url ? { nombre: d.tienda, url: d.url } : null,
    medidas: { anchoCm: d.anchoCm, altoCm: d.altoCm, fondoCm: d.fondoCm },
    medidasTexto: `${cm(d.anchoCm)} × ${cm(d.altoCm)} × ${cm(d.fondoCm)} cm`,
    material: d.material,
    // Los diseños a medida guardan el id del catálogo; los productos de tienda, el texto.
    materialTexto: material(d.material)?.nombre ?? (d.material ? d.material[0].toUpperCase() + d.material.slice(1) : ""),
    acabado: d.acabado,
    puertas: d.puertas,
    cajones: d.cajones,
    areaM2: d.areaM2,
    precio: precioConUsd(d.precioCop, trm),
    dentroPresupuesto: franja ? d.precioCop >= franja.minCop && (franja.maxCop === null || d.precioCop <= franja.maxCop) : null,
    fabricacionDias: d.fabricacionDias,
    despiece: d.despiece,
    imagenUrl: f.imagen_url,
    // Visualización aproximada en la foto del espacio; null si aún no se pidió.
    enEspacioUrl: f.en_espacio_url ?? null,
    enEspacioPos: f.en_espacio_pos ?? null,
    enEspacioRecorteUrl: f.en_espacio_recorte_url ?? null,
    espacioId: c.espacioId,
    fotoEspacioUrl: c.fotoUrl,
    limites: { anchoMaxCm: c.anchoMaxCm, altoMaxCm: c.altoMaxCm, fondoMaxCm: c.fondoMaxCm },
    ...ajusteConOrigen(d, c),
    medidasOrigen: c.medidasOrigen ?? (c.anchoMaxCm ? "persona" : null),
    generadoConIa: true,
  };
}

export type FilaEspacio = {
  id: number; nombre: string; ancho_cm: number; alto_cm: number; fondo_cm: number | null;
  altura_piso_cm: number | null; foto_url: string | null; analisis: string | null; marcas: string | null; medidas_origen: string; creado: string; actualizado: string;
};

export const espacio = (f: FilaEspacio) => ({
  id: f.id,
  nombre: f.nombre,
  anchoCm: f.ancho_cm,
  altoCm: f.alto_cm,
  fondoCm: f.fondo_cm,
  alturaPisoCm: f.altura_piso_cm,
  fotoUrl: f.foto_url,
  analisis: f.analisis ? JSON.parse(f.analisis) : null,
  marcas: f.marcas ? JSON.parse(f.marcas) : null,
  medidasOrigen: f.medidas_origen === "ia" ? "ia" : "persona",
  creado: iso(f.creado),
  actualizado: iso(f.actualizado),
});
