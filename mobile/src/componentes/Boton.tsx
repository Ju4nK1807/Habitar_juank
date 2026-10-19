import { ActivityIndicator, Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import type { LucideIcon } from "lucide-react-native";
import { useTema } from "@/theme/tema";
import { alto, espacio, radio, type Colores } from "@/theme/tokens";
import { Texto } from "./Texto";
import { Icono } from "./Icono";

type Variante = "primario" | "acento" | "secundario" | "texto" | "peligro";
type Tamaño = "grande" | "mediano" | "pequeño";

type Props = {
  titulo: string;
  onPress: () => void;
  variante?: Variante;
  tamaño?: Tamaño;
  icono?: LucideIcon;
  cargando?: boolean;
  deshabilitado?: boolean;
  /** Obligatorio cuando el botón está deshabilitado: explica por qué. */
  motivo?: string;
  ancho?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

const ALTURAS: Record<Tamaño, number> = { grande: alto.boton, mediano: alto.botonPequeño, pequeño: alto.botonMini };

function colores(v: Variante, c: Colores, presionado: boolean) {
  switch (v) {
    case "primario": return { fondo: presionado ? c.brand500 : c.brand600, texto: "onBrand" as const, borde: undefined };
    case "acento": return { fondo: c.accent600, texto: "onAccent" as const, borde: undefined, opacidad: presionado ? 0.85 : 1 };
    case "secundario": return { fondo: presionado ? c.surface200 : c.surface100, texto: "ink900" as const, borde: c.border400 };
    case "texto": return { fondo: presionado ? c.brand100 : "transparent", texto: "brandInk" as const, borde: undefined };
    case "peligro": return { fondo: presionado ? c.danger100 : "transparent", texto: "danger600" as const, borde: c.danger600 };
  }
}

export function Boton({
  titulo, onPress, variante = "primario", tamaño = "grande", icono, cargando, deshabilitado, motivo, ancho, style, accessibilityHint,
}: Props) {
  const { c } = useTema();
  const inactivo = deshabilitado || cargando;
  const altura = ALTURAS[tamaño];
  const extra = Math.max(0, (alto.tocable - altura) / 2);

  return (
    <View style={[ancho && { alignSelf: "stretch" }, style]}>
      <Pressable
        onPress={() => {
          if (variante === "primario") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        disabled={inactivo}
        hitSlop={{ top: extra, bottom: extra }}
        accessibilityRole="button"
        accessibilityLabel={titulo}
        accessibilityHint={deshabilitado ? motivo : accessibilityHint}
        accessibilityState={{ disabled: !!inactivo, busy: !!cargando }}
        style={({ pressed }) => {
          const k = colores(variante, c, pressed);
          return {
            height: altura,
            borderRadius: radio.boton,
            paddingHorizontal: tamaño === "pequeño" ? espacio.s12 : espacio.s20,
            backgroundColor: deshabilitado ? c.surface300 : k.fondo,
            borderWidth: k.borde && !deshabilitado ? 1 : 0,
            borderColor: k.borde,
            opacity: k.opacidad ?? 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: espacio.s8,
          };
        }}
      >
        {cargando ? (
          <ActivityIndicator color={c[colores(variante, c, false).texto]} />
        ) : (
          <>
            {icono && <Icono de={icono} tamaño={tamaño === "pequeño" ? 18 : 20} color={deshabilitado ? "ink600" : colores(variante, c, false).texto} />}
            <Texto variante={tamaño === "pequeño" ? "labelMd" : "labelLg"} color={deshabilitado ? "ink600" : colores(variante, c, false).texto} numberOfLines={1}>
              {titulo}
            </Texto>
          </>
        )}
      </Pressable>
      {deshabilitado && motivo ? (
        <Texto variante="bodySm" color="ink600" centrado style={{ marginTop: espacio.s8 }}>
          {motivo}
        </Texto>
      ) : null}
    </View>
  );
}
