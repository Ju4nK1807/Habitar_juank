import { useMemo } from "react";
import { StyleSheet, useColorScheme } from "react-native";
import { usePreferencias } from "@/store/preferencias";
import { paletas, type Colores } from "./tokens";

export function useTema() {
  const sistema = useColorScheme();
  const tema = usePreferencias((p) => p.tema);
  const oscuro = tema === "oscuro" || (tema === "sistema" && sistema === "dark");
  return { c: oscuro ? paletas.oscuro : paletas.claro, oscuro };
}

/** Crea estilos que dependen del tema; se recalculan solo cuando cambia el tema. */
export function crearEstilos<T extends StyleSheet.NamedStyles<T>>(fn: (c: Colores) => T) {
  return function useEstilos() {
    const { c } = useTema();
    return useMemo(() => StyleSheet.create(fn(c)), [c]);
  };
}
