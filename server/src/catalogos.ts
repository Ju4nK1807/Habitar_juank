// Catálogos de negocio. Los precios son de referencia del mercado colombiano (COP, 2026)
// y son la base del cálculo de precio: la IA nunca pone precios.

export const TIPOS = [
  { id: "biblioteca", nombre: "Biblioteca" },
  { id: "mueble_tv", nombre: "Mueble de TV" },
  { id: "escritorio", nombre: "Escritorio" },
  { id: "closet", nombre: "Clóset" },
  { id: "aparador", nombre: "Aparador" },
  { id: "repisa", nombre: "Repisas" },
  { id: "zapatero", nombre: "Zapatero" },
  { id: "otro", nombre: "Otro" },
] as const;

export const MATERIALES = [
  { id: "melamina", nombre: "Melamina", descripcion: "Tablero de 18 mm con acabado laminado", precioM2: 58_000, factorDias: 1, acabado: "laminado mate" },
  { id: "contrachapado", nombre: "Contrachapado", descripcion: "Triplex de pino con canto visto", precioM2: 74_000, factorDias: 1.1, acabado: "sellador al agua" },
  { id: "mdf_lacado", nombre: "MDF lacado", descripcion: "MDF de 18 mm lacado en poliuretano", precioM2: 145_000, factorDias: 1.5, acabado: "laca poliuretano satinada" },
  { id: "pino", nombre: "Pino macizo", descripcion: "Madera de pino inmunizado", precioM2: 112_000, factorDias: 1.3, acabado: "aceite natural" },
  { id: "roble", nombre: "Roble macizo", descripcion: "Roble importado, alta durabilidad", precioM2: 365_000, factorDias: 1.6, acabado: "barniz mate protector" },
] as const;

export type MaterialId = (typeof MATERIALES)[number]["id"];
export const SIN_PREFERENCIA = "sin_preferencia";

export const PRESUPUESTOS = [
  { id: "economico", nombre: "Hasta $1 M", minCop: 0, maxCop: 1_000_000 },
  { id: "medio", nombre: "$1 M – $2,5 M", minCop: 1_000_000, maxCop: 2_500_000 },
  { id: "alto", nombre: "$2,5 M – $5 M", minCop: 2_500_000, maxCop: 5_000_000 },
  { id: "premium", nombre: "Más de $5 M", minCop: 5_000_000, maxCop: null },
] as const;

export const HERRAJES = { porPuerta: 28_000, porCajon: 65_000 };
export const MANO_DE_OBRA = { base: 220_000, porcentaje: 0.45 };
export const DESPERDICIO = 1.15;
export const MARGEN_INSTALACION_CM = 2;

export const LIMITES = {
  descripcionMax: 280,
  anchoCm: [20, 600],
  altoCm: [20, 300],
  fondoCm: [10, 120],
} as const;

export const material = (id: string) => MATERIALES.find((m) => m.id === id);
export const presupuesto = (id: string) => PRESUPUESTOS.find((p) => p.id === id);
export const tipo = (id: string) => TIPOS.find((t) => t.id === id);
