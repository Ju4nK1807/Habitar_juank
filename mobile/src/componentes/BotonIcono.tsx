import { Pressable } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { useTema } from "@/theme/tema";
import { alto, radio, type Colores } from "@/theme/tokens";
import { Icono } from "./Icono";

type Props = {
  icono: LucideIcon;
  etiqueta: string;
  onPress: () => void;
  color?: keyof Colores;
  fondo?: "ninguno" | "superficie" | "velo";
  deshabilitado?: boolean;
};

export function BotonIcono({ icono, etiqueta, onPress, color = "ink900", fondo = "ninguno", deshabilitado }: Props) {
  const { c } = useTema();
  const extra = (alto.tocable - alto.botonIcono) / 2;
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      hitSlop={extra}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: !!deshabilitado }}
      style={({ pressed }) => ({
        width: alto.botonIcono,
        height: alto.botonIcono,
        borderRadius: radio.completo,
        alignItems: "center",
        justifyContent: "center",
        opacity: deshabilitado ? 0.4 : 1,
        backgroundColor: pressed
          ? c.surface300
          : fondo === "superficie" ? c.surface100 : fondo === "velo" ? c.surface000 + "E6" : "transparent",
        borderWidth: fondo === "superficie" ? 1 : 0,
        borderColor: c.border200,
      })}
    >
      <Icono de={icono} color={color} />
    </Pressable>
  );
}
