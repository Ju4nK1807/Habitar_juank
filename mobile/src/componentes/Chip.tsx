import { Pressable, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Check } from "lucide-react-native";
import { useTema } from "@/theme/tema";
import { alto, espacio, radio } from "@/theme/tokens";
import { Texto } from "./Texto";
import { Icono } from "./Icono";

type Props = { texto: string; activo: boolean; onPress: () => void; multiple?: boolean; deshabilitado?: boolean };

/** Chip simple o múltiple. El activo muestra una marca además del color. */
export function Chip({ texto, activo, onPress, multiple, deshabilitado }: Props) {
  const { c } = useTema();
  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      disabled={deshabilitado}
      hitSlop={{ top: (alto.tocable - alto.chip) / 2, bottom: (alto.tocable - alto.chip) / 2 }}
      accessibilityRole={multiple ? "checkbox" : "radio"}
      accessibilityState={{ checked: activo, disabled: !!deshabilitado }}
      accessibilityLabel={texto}
      style={({ pressed }) => ({
        height: alto.chip,
        paddingHorizontal: espacio.s16,
        borderRadius: radio.completo,
        flexDirection: "row",
        alignItems: "center",
        gap: espacio.s4,
        borderWidth: 1,
        borderColor: activo ? c.brandInk : c.border400,
        backgroundColor: activo ? c.brand100 : pressed ? c.surface200 : c.surface100,
        opacity: deshabilitado ? 0.45 : 1,
      })}
    >
      {activo && <Icono de={Check} tamaño={16} color="brandInk" />}
      <Texto variante="labelMd" color={activo ? "brandInk" : "ink900"}>{texto}</Texto>
    </Pressable>
  );
}

export function GrupoChips({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: espacio.s8 }}>{children}</View>;
}
