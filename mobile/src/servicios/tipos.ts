// Formas de la API de Habita (ver CLAUDE.md). Si cambia el backend, se cambia aquí.

export type Ajuste = "cabe" | "ajustado" | "no_cabe" | "sin_medidas";
/** "persona" = medidas con metro; "ia" = estimadas por la IA a partir de la foto. */
export type OrigenMedidas = "persona" | "ia";
export type EstadoGeneracion = "generando" | "listo" | "error" | "cancelado";
export type Etapa = "propuestas" | "imagenes" | "ubicando" | "listo";

/** Extremos del ancho medido, a nivel del piso, normalizados (0 a 1) sobre la foto. */
export type Marcas = { x1: number; y1: number; x2: number; y2: number };

export type Precio = { cop: number; usd: number | null; trm: number | null; fechaTrm: string | null };

export type Medidas = { anchoCm: number; altoCm: number; fondoCm: number };

export type Pieza = { pieza: string; cantidad: number; anchoCm: number; altoCm: number };

export type Propuesta = {
  id: number;
  generacionId: number;
  orden: number;
  nombre: string;
  concepto: string;
  medidas: Medidas;
  medidasTexto: string;
  material: string;
  materialTexto: string;
  acabado: string;
  puertas: number;
  cajones: number;
  areaM2: number;
  precio: Precio;
  dentroPresupuesto: boolean | null;
  fabricacionDias: number;
  despiece: Pieza[];
  imagenUrl: string | null;
  /** Visualización aproximada del mueble en la foto del espacio (se genera al pedirla). */
  enEspacioUrl: string | null;
  /** Recorte cuadrado centrado en el mueble, para tarjetas y detalle. */
  enEspacioRecorteUrl: string | null;
  enEspacioPos: number | null;
  espacioId: number | null;
  fotoEspacioUrl: string | null;
  limites: { anchoMaxCm: number | null; altoMaxCm: number | null; fondoMaxCm: number | null };
  medidasOrigen: OrigenMedidas | null;
  ajuste: Ajuste;
  diferenciaCm: number;
  dimensionCritica: "ancho" | "alto" | "fondo";
  etiquetaAjuste: string;
  generadoConIa: true;
  proyectos?: { id: number; nombre: string }[];
};

export type Analisis = {
  estilo: string;
  paleta: { nombre: string; hex: string }[];
  piso: string;
  luz: string;
  obstaculos: string[];
  zonaLibre?: string;
  medidas?: { anchoCm: number; altoCm: number; fondoCm: number | null; confianza: "baja" | "media" | "alta"; referencias: string } | null;
};

export type Espacio = {
  id: number;
  nombre: string;
  anchoCm: number;
  altoCm: number;
  fondoCm: number | null;
  alturaPisoCm: number | null;
  fotoUrl: string | null;
  analisis: Analisis | null;
  marcas: Marcas | null;
  medidasOrigen: OrigenMedidas;
  creado: string;
  actualizado: string;
};

export type EspacioNuevo = Omit<Espacio, "id" | "creado" | "actualizado" | "medidasOrigen"> & { medidasOrigen?: OrigenMedidas };

export type Contexto = {
  tipo: string;
  tipoNombre: string;
  descripcion: string;
  anchoMaxCm: number | null;
  altoMaxCm: number | null;
  medidasOrigen?: OrigenMedidas | null;
  fondoMaxCm: number | null;
  material: string;
  presupuesto: string;
  espacioId: number | null;
  espacioNombre: string | null;
  fotoUrl: string | null;
  referencias: string[];
  ubicable?: boolean;
};

export type Generacion = {
  id: number;
  estado: EstadoGeneracion;
  etapa: Etapa;
  imagenesListas: number;
  error: string | null;
  contexto: Contexto;
  creado: string;
  terminado: string | null;
  propuestas: Propuesta[];
  guardadas?: number;
};

export type PedidoGeneracion = {
  tipo: string;
  descripcion: string;
  anchoMaxCm?: number | null;
  altoMaxCm?: number | null;
  medidasOrigen?: OrigenMedidas | null;
  fondoMaxCm?: number | null;
  material: string;
  presupuesto: string;
  espacioId?: number | null;
  referencias?: string[];
};

export type Proyecto = {
  id: number;
  nombre: string;
  espacio: { id: number; nombre: string } | null;
  creado: string;
  cantidad: number;
  presupuesto: Precio;
  portadas: (string | null)[];
  propuestas?: Propuesta[];
};

export type Creditos = { saldo: number; recargaHasta: number; proximaRecarga: string | null };

export type Movimiento = {
  id: number;
  tipo: "bienvenida" | "generacion" | "reembolso" | "recarga";
  cantidad: number;
  generacionId: number | null;
  fecha: string;
};

export type Opcion = { id: string; nombre: string; descripcion?: string };

export type Catalogos = {
  tipos: Opcion[];
  materiales: Opcion[];
  presupuestos: (Opcion & { minCop: number; maxCop: number | null })[];
  limites: { descripcionMax: number; anchoCm: [number, number]; altoCm: [number, number]; fondoCm: [number, number] };
  costoGeneracion: number;
  trm: { valor: number; fecha: string } | null;
};
