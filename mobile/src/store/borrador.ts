import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Analisis, Espacio } from "@/servicios/tipos";

/** Foto nueva del espacio: se sube y se analiza mientras la persona escribe lo que quiere. */
export type FotoBorrador = {
  uri: string;
  fotoUrl: string | null;
  analisis: Analisis | null;
  estado: "subiendo" | "analizando" | "lista" | "error";
  error: string | null;
};

/**
 * Lo que la persona va llenando en el flujo: dónde va el mueble (foto o espacio guardado) y qué
 * quiere. Se guarda en el teléfono: volver atrás o cerrar la app no borra lo escrito.
 */
type Borrador = {
  espacio: Espacio | null;
  foto: FotoBorrador | null;
  omitioEspacio: boolean;
  descripcion: string;
  actualizado: string | null;
  generacionEnCurso: number | null;
  cambiar: (p: Partial<Omit<Borrador, "cambiar" | "reiniciar" | "elegirEspacio" | "tieneDatos">>) => void;
  elegirEspacio: (e: Espacio | null) => void;
  reiniciar: () => void;
  tieneDatos: () => boolean;
};

const vacio = {
  espacio: null,
  foto: null,
  omitioEspacio: false,
  descripcion: "",
  actualizado: null,
  generacionEnCurso: null,
};

export const useBorrador = create<Borrador>()(
  persist(
    (set, get) => ({
      ...vacio,
      cambiar: (p) => set({ ...p, actualizado: new Date().toISOString() }),
      // Un espacio guardado reemplaza la foto nueva, y al revés.
      elegirEspacio: (e) => set({ espacio: e, foto: null, omitioEspacio: !e, actualizado: new Date().toISOString() }),
      reiniciar: () => set({ ...vacio }),
      tieneDatos: () => {
        const b = get();
        return !!(b.espacio || b.foto || b.descripcion.trim());
      },
    }),
    {
      name: "habita-borrador",
      storage: createJSONStorage(() => AsyncStorage),
      // La versión 1 tenía tipo, medidas, material y presupuesto: se conserva solo lo que sigue sirviendo.
      version: 2,
      migrate: (viejo) => {
        const v = (viejo ?? {}) as Partial<Borrador>;
        return { ...vacio, espacio: v.espacio ?? null, descripcion: v.descripcion ?? "", generacionEnCurso: v.generacionEnCurso ?? null } as Borrador;
      },
    },
  ),
);
