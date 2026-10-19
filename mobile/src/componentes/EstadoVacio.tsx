import { View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { useTema } from "@/theme/tema";
import { espacio, radio } from "@/theme/tokens";
import { Texto } from "./Texto";
import { Icono } from "./Icono";
import { Boton } from "./Boton";

type Props = {
  icono: LucideIcon;
  titulo: string;
  mensaje: string;
  accion?: { texto: string; onPress: () => void; icono?: LucideIcon };
  /** En pantallas que ya tienen su pieza display, el título va en titleLg. */
  compacto?: boolean;
};

export function EstadoVacio({ icono, titulo, mensaje, accion, compacto }: Props) {
  const { c } = useTema();
  return (
    <View style={{ alignItems: "center", paddingVertical: compacto ? espacio.s32 : espacio.s48, paddingHorizontal: espacio.s24, gap: espacio.s16 }}>
      <View style={{ width: 72, height: 72, borderRadius: radio.completo, backgroundColor: c.brand100, alignItems: "center", justifyContent: "center" }}>
        <Icono de={icono} tamaño={32} color="brandInk" />
      </View>
      <Texto variante={compacto ? "titleMd" : "displayMd"} centrado accessibilityRole="header">{titulo}</Texto>
      <Texto variante="bodyMd" color="ink600" centrado style={{ maxWidth: 320 }}>{mensaje}</Texto>
      {accion ? <Boton titulo={accion.texto} onPress={accion.onPress} icono={accion.icono} variante="secundario" style={{ marginTop: espacio.s8 }} /> : null}
    </View>
  );
}
