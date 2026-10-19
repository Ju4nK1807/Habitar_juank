import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { Check, Ruler } from "lucide-react-native";
import { useTema } from "@/theme/tema";
import { espacio, radio } from "@/theme/tokens";
import { urlArchivo } from "@/servicios/api";
import type { Espacio } from "@/servicios/tipos";
import { usePreferencias } from "@/store/preferencias";
import { medida } from "@/lib/formato";
import { Texto } from "./Texto";
import { Icono } from "./Icono";

type Props = { espacio: Espacio; onPress: () => void; ancho?: number; seleccionado?: boolean; horizontal?: boolean };

export function textoMedidasEspacio(e: Espacio, u: "cm" | "in") {
  const base = `${medida(e.anchoCm, u)} × ${medida(e.altoCm, u)}`;
  return e.fondoCm ? `${base} · fondo ${medida(e.fondoCm, u)}` : base;
}

export function TarjetaEspacio({ espacio: e, onPress, ancho, seleccionado, horizontal }: Props) {
  const { c } = useTema();
  const unidades = usePreferencias((p) => p.unidades);
  const url = urlArchivo(e.fotoUrl);

  const miniatura = (
    <View style={[{ backgroundColor: c.surface200, overflow: "hidden" }, horizontal ? { width: 72, height: 72, borderRadius: radio.campo } : { aspectRatio: 4 / 3 }]}>
      {url ? (
        <Image source={{ uri: url }} style={{ flex: 1 }} contentFit="cover" transition={150} />
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Icono de={Ruler} color="ink600" />
        </View>
      )}
    </View>
  );

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!seleccionado }}
      accessibilityLabel={`${e.nombre}, ${textoMedidasEspacio(e, unidades)}${seleccionado ? ", elegido" : ""}`}
      style={({ pressed }) => ({
        width: ancho,
        borderRadius: radio.tarjeta,
        backgroundColor: seleccionado ? c.brand100 : c.surface100,
        borderWidth: seleccionado ? 2 : 1,
        borderColor: seleccionado ? c.brandInk : c.border200,
        overflow: "hidden",
        opacity: pressed ? 0.9 : 1,
        flexDirection: horizontal ? "row" : "column",
        alignItems: horizontal ? "center" : "stretch",
        padding: horizontal ? espacio.s12 : 0,
        gap: horizontal ? espacio.s12 : 0,
      })}
    >
      {miniatura}
      <View style={{ padding: horizontal ? 0 : espacio.s12, gap: espacio.s4, flex: horizontal ? 1 : undefined }}>
        <Texto variante="titleSm" numberOfLines={1}>{e.nombre}</Texto>
        <Texto variante="bodySm" color="ink600" numberOfLines={1}>{textoMedidasEspacio(e, unidades)}</Texto>
      </View>
      {seleccionado ? <Icono de={Check} color="brandInk" /> : null}
    </Pressable>
  );
}
