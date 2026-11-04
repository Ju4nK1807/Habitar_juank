import { generarJson, MODELOS_VISION } from "../ia/gemini.ts";
import { LIMITES } from "../catalogos.ts";
import { fotoComoParte } from "./fotos.ts";
import type { Marcas } from "./composicion.ts";

export type MedidasEstimadas = {
  anchoCm: number;
  altoCm: number;
  fondoCm: number | null;
  confianza: "baja" | "media" | "alta";
  /** Qué objetos de tamaño conocido usó la IA para calcular, en una frase. */
  referencias: string;
};

export type Analisis = {
  /** Qué clase de espacio es: sala, habitación, cocina… Se usa para hablarle a la persona. */
  tipoEspacio: string;
  estilo: string;
  paleta: { nombre: string; hex: string }[];
  piso: string;
  luz: string;
  obstaculos: string[];
  /** Dónde está la zona libre para el mueble y qué la limita, en una o dos frases. */
  zonaLibre: string;
  medidas: MedidasEstimadas | null;
  /**
   * Extremos de la zona libre a nivel del piso, calculados de la caja que marca la IA.
   * Reemplazan las marcas que antes ponía la persona: con ellas se ubica el mueble en la foto.
   */
  marcas: Marcas | null;
};

type Respuesta = Omit<Analisis, "marcas"> & { cajaZona: number[] };

const ESQUEMA = {
  type: "object",
  properties: {
    tipoEspacio: { type: "string", enum: ["sala", "habitación", "cocina", "comedor", "estudio", "baño", "entrada", "balcón", "otro"] },
    estilo: { type: "string", description: "Estilo decorativo en 1 a 3 palabras, en español. Ej: nórdico cálido" },
    paleta: {
      type: "array", minItems: 3, maxItems: 5,
      description: "Colores dominantes reales de la foto (paredes, piso, muebles, textiles), del más al menos presente",
      items: { type: "object", properties: { nombre: { type: "string", description: "Nombre del color en español. Ej: beige arena" }, hex: { type: "string", description: "#RRGGBB" } }, required: ["nombre", "hex"] },
    },
    piso: { type: "string", description: "Tipo de piso visible, en español. 'No visible' si no se ve" },
    luz: { type: "string", description: "Luz del espacio: natural, cálida, fría o mixta, en una frase corta" },
    obstaculos: {
      type: "array", maxItems: 8, items: { type: "string" },
      description: "Elementos que limitan la instalación: enchufes, interruptores, zócalo, ventana, radiador, tubería, puerta. Vacío si no hay",
    },
    zonaLibre: {
      type: "string",
      description: "En español, una o dos frases: dónde está el espacio libre para un mueble nuevo y qué lo limita a cada lado (cama, puerta, esquina, ventana).",
    },
    cajaZona: {
      type: "array", minItems: 4, maxItems: 4, items: { type: "integer" },
      description: "box_2d [ymin, xmin, ymax, xmax] normalizado de 0 a 1000 de la zona libre donde iría el mueble nuevo. El borde inferior (ymax) es la línea donde el piso toca el muro en esa zona; xmin y xmax son los límites izquierdo y derecho del espacio libre.",
    },
    medidas: {
      type: "object",
      properties: {
        anchoCm: { type: "number", description: "Ancho real en cm de la misma zona de cajaZona (de xmin a xmax)" },
        altoCm: { type: "number", description: "Alto libre estimado desde el piso hasta el primer obstáculo arriba (ventana, repisa) o el techo, en cm" },
        fondoCm: { type: "number", description: "Profundidad libre estimada delante del muro, en cm. 0 si no se puede saber" },
        confianza: { type: "string", enum: ["baja", "media", "alta"] },
        referencias: { type: "string", description: "En español, qué objetos de tamaño conocido usaste para calcular. Ej: 'la placa del enchufe y el ancho de la puerta'" },
      },
      required: ["anchoCm", "altoCm", "fondoCm", "confianza", "referencias"],
    },
  },
  required: ["tipoEspacio", "estilo", "paleta", "piso", "luz", "obstaculos", "zonaLibre", "cajaZona", "medidas"],
};

const INSTRUCCIONES = `Analiza esta foto de un espacio de una casa donde la persona quiere poner un mueble nuevo. Responde en español.
Describe lo que se ve, sus colores reales, y ubica la zona libre más natural para un mueble nuevo (marca su caja en la imagen).
Estima las medidas de esa zona usando objetos de tamaño conocido como referencia, por ejemplo (Colombia):
- placa de enchufe o interruptor: 7 cm de ancho × 11,5 cm de alto
- zócalo: 7 a 10 cm de alto
- puerta interior: 80 a 90 cm de ancho, 200 a 210 cm de alto
- cama sencilla: 100 cm de ancho; doble: 140 cm; altura del colchón: 45 a 60 cm
- sofá de tres puestos: 190 a 220 cm de ancho, 80 a 90 cm de alto
- techo de apartamento: 230 a 250 cm
- tablas de piso laminado: 15 a 20 cm de ancho
Ten en cuenta la perspectiva. Si no hay referencias claras, da tu mejor estimación con confianza "baja".`;

const entre = (n: number, [min, max]: readonly [number, number]) => Math.round(Math.min(max, Math.max(min, n)));

/** La caja de la IA (0–1000) se vuelve dos puntos normalizados a nivel del piso. */
function marcasDeCaja(caja: number[]): Marcas | null {
  if (caja.length !== 4 || caja.some((n) => typeof n !== "number" || n < 0 || n > 1000)) return null;
  const [, xmin, ymax, xmax] = caja;
  const [x1, x2] = [Math.min(xmin, xmax) / 1000, Math.max(xmin, xmax) / 1000];
  const y = Math.min(1, ymax / 1000);
  // Una zona muy angosta o pegada al borde superior no sirve para apoyar un mueble.
  if (x2 - x1 < 0.1 || y < 0.3) return null;
  return { x1, y1: y, x2, y2: y };
}

export async function analizarFoto(fotoUrl: string): Promise<Analisis> {
  const foto = await fotoComoParte(fotoUrl);
  const { cajaZona, ...a } = await generarJson<Respuesta>([foto, { text: INSTRUCCIONES }], ESQUEMA, undefined, MODELOS_VISION);
  a.paleta = a.paleta.filter((c) => /^#[0-9a-f]{6}$/i.test(c.hex));
  // Las estimaciones se acotan a los límites del catálogo: son una aproximación y la app lo dice.
  const m = a.medidas;
  a.medidas = m
    ? {
        ...m,
        anchoCm: entre(m.anchoCm, LIMITES.anchoCm),
        altoCm: entre(m.altoCm, LIMITES.altoCm),
        fondoCm: m.fondoCm && m.fondoCm >= 10 && m.fondoCm <= 120 ? Math.round(m.fondoCm) : null,
      }
    : null;
  return { ...a, marcas: marcasDeCaja(cajaZona) };
}
