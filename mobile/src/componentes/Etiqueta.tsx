import { View } from "react-native";
import { CircleAlert, CircleCheck, CircleX, Sparkles, type LucideIcon } from "lucide-react-native";
import { useTema } from "@/theme/tema";
import { espacio, radio, type Colores } from "@/theme/tokens";
import { Texto } from "./Texto";
import { Icono } from "./Icono";
import type { Ajuste } from "@/servicios/tipos";

type Tipo = "ia" | "marca" | "exito" | "alerta" | "error";

const ESTILO: Record<Tipo, { fondo: keyof Colores; texto: keyof Colores; icono?: LucideIcon }> = {
  ia: { fondo: "accent100", texto: "accentInk", icono: Sparkles },
  marca: { fondo: "brand100", texto: "brandInk" },
  exito: { fondo: "accent100", texto: "accentInk", icono: CircleCheck },
  alerta: { fondo: "warning100", texto: "warning600", icono: CircleAlert },
  error: { fondo: "danger100", texto: "danger600", icono: CircleX },
};

export function Etiqueta({ tipo, texto }: { tipo: Tipo; texto: string }) {
  const { c } = useTema();
  const e = ESTILO[tipo];
  return (
    <View
      style={{
        flexDirection: "row", alignItems: "center", gap: espacio.s4, alignSelf: "flex-start",
        paddingHorizontal: espacio.s8, paddingVertical: espacio.s4, borderRadius: radio.completo, backgroundColor: c[e.fondo],
      }}
    >
      {e.icono && <Icono de={e.icono} tamaño={14} color={e.texto} />}
      <Texto variante="labelMd" color={e.texto} numberOfLines={1}>{texto}</Texto>
    </View>
  );
}

export const tipoAjuste = (a: Ajuste): Tipo => (a === "cabe" ? "exito" : a === "ajustado" ? "alerta" : a === "no_cabe" ? "error" : "marca");

/** Etiqueta corta del ajuste para tarjetas: el texto completo va en el detalle. */
export const textoAjusteCorto = (a: Ajuste) =>
  a === "cabe" ? "Cabe" : a === "ajustado" ? "Al límite" : a === "no_cabe" ? "No cabe" : "Sin medidas";
