import { Pressable, View } from "react-native";
import { ChevronRight, type LucideIcon } from "lucide-react-native";
import { useTema } from "@/theme/tema";
import { espacio, radio } from "@/theme/tokens";
import { Texto } from "./Texto";
import { Icono } from "./Icono";

type Props = { icono: LucideIcon; titulo: string; descripcion: string; onPress: () => void; deshabilitado?: boolean; motivo?: string };

/** Opción grande en tarjeta: icono, título y descripción. */
export function OpcionTarjeta({ icono, titulo, descripcion, onPress, deshabilitado, motivo }: Props) {
  const { c } = useTema();
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityHint={deshabilitado ? motivo : descripcion}
      accessibilityState={{ disabled: !!deshabilitado }}
      style={({ pressed }) => ({
        flexDirection: "row", alignItems: "center", gap: espacio.s16, padding: espacio.s16, minHeight: 88,
        borderRadius: radio.tarjeta, borderWidth: 1, borderColor: c.border200,
        backgroundColor: pressed ? c.surface200 : c.surface100,
      })}
    >
      <View style={{ width: 48, height: 48, borderRadius: radio.boton, alignItems: "center", justifyContent: "center", backgroundColor: deshabilitado ? c.surface200 : c.brand100 }}>
        <Icono de={icono} color={deshabilitado ? "ink600" : "brandInk"} />
      </View>
      <View style={{ flex: 1, gap: espacio.s4 }}>
        <Texto variante="titleSm" color={deshabilitado ? "ink600" : "ink900"}>{titulo}</Texto>
        <Texto variante="bodySm" color="ink600">{deshabilitado && motivo ? motivo : descripcion}</Texto>
      </View>
      {!deshabilitado && <Icono de={ChevronRight} color="ink600" />}
    </Pressable>
  );
}
