import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type Tema = "sistema" | "claro" | "oscuro";
export type Unidades = "cm" | "in";
export type Moneda = "COP" | "USD";

type Preferencias = {
  tema: Tema;
  unidades: Unidades;
  moneda: Moneda;
  nombre: string;
  cambiar: (p: Partial<Pick<Preferencias, "tema" | "unidades" | "moneda" | "nombre">>) => void;
};

export const usePreferencias = create<Preferencias>()(
  persist(
    (set) => ({
      tema: "sistema",
      unidades: "cm",
      moneda: "COP",
      nombre: "",
      cambiar: (p) => set(p),
    }),
    { name: "habita-preferencias", storage: createJSONStorage(() => AsyncStorage) },
  ),
);
