import { useColorScheme } from "react-native";
import { usePreferencias } from "@/store/preferencias";
import { paletas } from "./tokens";

export function useTema() {
  const sistema = useColorScheme();
  const tema = usePreferencias((p) => p.tema);
  const oscuro = tema === "oscuro" || (tema === "sistema" && sistema === "dark");
  return { c: oscuro ? paletas.oscuro : paletas.claro, oscuro };
}

