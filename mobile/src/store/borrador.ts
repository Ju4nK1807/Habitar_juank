import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Espacio } from "@/servicios/tipos";

/**
 * Lo que la persona va llenando en el flujo de 4 pasos. Se guarda en el teléfono:
 * volver atrás o cerrar la app no borra lo escrito; Inicio ofrece continuar.
 */
type Borrador = {
  espacio: Espacio | null;
  omitioEspacio: boolean;
  tipo: string | null;
  descripcion: string;
  referencias: { uri: string; fotoUrl: string | null }[];
  anchoCm: number | null;
  altoCm: number | null;
  fondoCm: number | null;
  material: string;
  presupuesto: string | null;
  actualizado: string | null;
  generacionEnCurso: number | null;
  cambiar: (p: Partial<Omit<Borrador, "cambiar" | "reiniciar" | "elegirEspacio" | "tieneDatos">>) => void;
  elegirEspacio: (e: Espacio | null) => void;
  reiniciar: () => void;
  tieneDatos: () => boolean;
};

const vacio = {
  espacio: null,
  omitioEspacio: false,
  tipo: null,
  descripcion: "",
  referencias: [],
  anchoCm: null,
  altoCm: null,
  fondoCm: null,
  material: "sin_preferencia",
  presupuesto: null,
  actualizado: null,
  generacionEnCurso: null,
};

export const useBorrador = create<Borrador>()(
  persist(
    (set, get) => ({
      ...vacio,
      cambiar: (p) => set({ ...p, actualizado: new Date().toISOString() }),
      // Al elegir un espacio, sus medidas llenan el paso 3 (la persona puede reducirlas).
      elegirEspacio: (e) =>
        set({
          espacio: e,
          omitioEspacio: !e,
          anchoCm: e ? e.anchoCm : get().anchoCm,
          altoCm: e ? e.altoCm : get().altoCm,
          fondoCm: e ? e.fondoCm : get().fondoCm,
          actualizado: new Date().toISOString(),
        }),
      reiniciar: () => set({ ...vacio }),
      tieneDatos: () => {
        const b = get();
        return !!(b.espacio || b.tipo || b.descripcion.trim() || b.referencias.length);
      },
    }),
    { name: "habita-borrador", storage: createJSONStorage(() => AsyncStorage) },
  ),
);
