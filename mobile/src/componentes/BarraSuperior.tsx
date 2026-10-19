import { View } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, X } from "lucide-react-native";
import { espacio, margen } from "@/theme/tokens";
import { Texto } from "./Texto";
import { BotonIcono } from "./BotonIcono";
import { Pasos } from "./Pasos";

type Props =
  | { variante: "compacta"; titulo: string; atras?: () => void; acciones?: React.ReactNode }
  | { variante: "expandida"; titulo: string; subtitulo?: string; atras?: () => void; acciones?: React.ReactNode }
  | { variante: "flujo"; paso: number; atras?: () => void; onCerrar: () => void };

const volver = () => (router.canGoBack() ? router.back() : router.replace("/"));

export function BarraSuperior(p: Props) {
  if (p.variante === "flujo") {
    return (
      <View style={{ paddingHorizontal: espacio.s8, paddingTop: espacio.s4, gap: espacio.s8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          {p.paso > 1 ? <BotonIcono icono={ChevronLeft} etiqueta="Volver al paso anterior" onPress={p.atras ?? volver} /> : <View />}
          <BotonIcono icono={X} etiqueta="Cerrar y volver al inicio" onPress={p.onCerrar} />
        </View>
        <View style={{ paddingHorizontal: margen.lateral - espacio.s8 }}>
          <Pasos actual={p.paso} />
        </View>
      </View>
    );
  }

  if (p.variante === "compacta") {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", minHeight: 52, paddingHorizontal: espacio.s8 }}>
        <View style={{ width: 96, alignItems: "flex-start" }}>
          {p.atras !== undefined || router.canGoBack() ? <BotonIcono icono={ChevronLeft} etiqueta="Volver" onPress={p.atras ?? volver} /> : null}
        </View>
        <Texto variante="titleSm" centrado numberOfLines={1} style={{ flex: 1 }} accessibilityRole="header">{p.titulo}</Texto>
        <View style={{ width: 96, flexDirection: "row", justifyContent: "flex-end" }}>{p.acciones}</View>
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: margen.lateral, paddingTop: espacio.s8, paddingBottom: espacio.s8, gap: espacio.s4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", minHeight: 44, marginLeft: p.atras ? -espacio.s12 : 0 }}>
        {p.atras ? <BotonIcono icono={ChevronLeft} etiqueta="Volver" onPress={p.atras} /> : null}
        <View style={{ flex: 1 }} />
        {p.acciones}
      </View>
      <Texto variante="titleLg" accessibilityRole="header">{p.titulo}</Texto>
      {p.subtitulo ? <Texto variante="bodyMd" color="ink600">{p.subtitulo}</Texto> : null}
    </View>
  );
}
