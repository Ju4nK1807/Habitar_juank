import { generarJson, MODELOS_VISION } from "../ia/gemini.ts";
import { fotoComoParte } from "./fotos.ts";

export type MedidasEstimadas = {
  anchoCm: number;
  altoCm: number;
  fondoCm: number | null;
  confianza: "baja" | "media" | "alta";
  /** Qué objetos de tamaño conocido usó la IA para calcular, en una frase. */
  referencias: string;
};

export type Analisis = {
  estilo: string;
  paleta: { nombre: string; hex: string }[];
  piso: string;
  luz: string;
  obstaculos: string[];
  /** Dónde está la zona libre para el mueble y qué la limita, en una o dos frases. */
  zonaLibre: string;
  medidas: MedidasEstimadas | null;
};

const ESQUEMA = {
  type: "object",
  properties: {
    estilo: { type: "string", description: "Estilo decorativo en 1 a 3 palabras, en español. Ej: nórdico cálido" },
    paleta: {
      type: "array", minItems: 3, maxItems: 5,
      items: { type: "object", properties: { nombre: { type: "string" }, hex: { type: "string", description: "#RRGGBB" } }, required: ["nombre", "hex"] },
    },
    piso: { type: "string", description: "Tipo de piso visible, en español. 'No visible' si no se ve" },
    luz: { type: "string", description: "Luz del espacio: natural, cálida, fría o mixta, en una frase corta" },
    obstaculos: {
      type: "array", maxItems: 8, items: { type: "string" },
      description: "Elementos del muro que limitan la instalación: enchufes, interruptores, zócalo, ventana, radiador, tubería, puerta. Vacío si no hay",
    },
    zonaLibre: {
      type: "string",
      description: "En español, una o dos frases: dónde está el espacio libre del muro para el mueble y qué lo limita a cada lado (cama, puerta, esquina, ventana).",
    },
    medidas: {
      type: "object",
      properties: {
        anchoCm: { type: "number", description: "Ancho libre estimado de la zona del muro donde iría el mueble, en cm" },
        altoCm: { type: "number", description: "Alto libre estimado desde el piso hasta el primer obstáculo arriba (ventana, repisa) o el techo, en cm" },
        fondoCm: { type: "number", description: "Profundidad libre estimada delante del muro, en cm. 0 si no se puede saber" },
        confianza: { type: "string", enum: ["baja", "media", "alta"] },
        referencias: { type: "string", description: "En español, qué objetos de tamaño conocido usaste para calcular. Ej: 'la placa del enchufe y el ancho de la puerta'" },
      },
      required: ["anchoCm", "altoCm", "fondoCm", "confianza", "referencias"],
    },
  },
  required: ["estilo", "paleta", "piso", "luz", "obstaculos", "zonaLibre", "medidas"],
};

const INSTRUCCIONES = `Analiza esta foto de un muro o rincón donde se instalará un mueble a medida. Responde en español.
Describe lo que se ve y estima las medidas del espacio libre para el mueble usando objetos de tamaño conocido como referencia, por ejemplo (Colombia):
- placa de enchufe o interruptor: 7 cm de ancho × 11,5 cm de alto
- zócalo: 7 a 10 cm de alto
- puerta interior: 80 a 90 cm de ancho, 200 a 210 cm de alto
- cama sencilla: 100 cm de ancho; doble: 140 cm; altura del colchón: 45 a 60 cm
- techo de apartamento: 230 a 250 cm
- tablas de piso laminado: 15 a 20 cm de ancho
Ten en cuenta la perspectiva. Si no hay referencias claras, da tu mejor estimación con confianza "baja".`;

export async function analizarFoto(fotoUrl: string): Promise<Analisis> {
  const foto = await fotoComoParte(fotoUrl);
  const a = await generarJson<Analisis>([foto, { text: INSTRUCCIONES }], ESQUEMA, undefined, MODELOS_VISION);
  a.paleta = a.paleta.filter((c) => /^#[0-9a-f]{6}$/i.test(c.hex));
  // Estimaciones fuera de lo razonable se descartan: mejor sin medida que una medida absurda.
  const m = a.medidas;
  if (!m || m.anchoCm < 20 || m.anchoCm > 600 || m.altoCm < 20 || m.altoCm > 300) {
    a.medidas = null;
  } else {
    a.medidas = {
      ...m,
      anchoCm: Math.round(m.anchoCm),
      altoCm: Math.round(m.altoCm),
      fondoCm: m.fondoCm && m.fondoCm >= 10 && m.fondoCm <= 120 ? Math.round(m.fondoCm) : null,
    };
  }
  return a;
}
