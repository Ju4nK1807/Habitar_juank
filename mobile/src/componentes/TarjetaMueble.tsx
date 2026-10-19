import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { ImageOff } from "lucide-react-native";
import { useTema } from "@/theme/tema";
import { espacio, radio } from "@/theme/tokens";
import { urlArchivo } from "@/servicios/api";
import type { Propuesta } from "@/servicios/tipos";
import { usePreferencias } from "@/store/preferencias";
import { medidasTexto, precioTexto } from "@/lib/formato";
import { Texto } from "./Texto";
import { Icono } from "./Icono";
import { Etiqueta, textoAjusteCorto, tipoAjuste } from "./Etiqueta";
import { Esqueleto } from "./Esqueleto";

type Props = { propuesta: Propuesta; onPress: () => void; destacado?: string | null };

/**
 * Tarjeta de propuesta para rejillas de 2 columnas. El título reserva dos líneas
 * para que todas las tarjetas de una fila terminen a la misma altura.
 */
export function TarjetaMueble({ propuesta: p, onPress, destacado }: Props) {
  const { c } = useTema();
  const { moneda, unidades } = usePreferencias();
  // Si ya está puesto en la foto del espacio, la tarjeta muestra eso; si no, el mueble solo.
  const url = urlArchivo(p.enEspacioRecorteUrl ?? p.imagenUrl);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${p.nombre}. ${medidasTexto(p.medidas, unidades)}. ${p.materialTexto}. ${precioTexto(p.precio, moneda)}. ${p.etiquetaAjuste}`}
      style={({ pressed }) => ({
        flex: 1, borderRadius: radio.tarjeta, backgroundColor: c.surface100, overflow: "hidden",
        borderWidth: 1, borderColor: c.border200, opacity: pressed ? 0.9 : 1,
      })}
    >
      <View style={{ aspectRatio: 1, backgroundColor: c.surface200 }}>
        {url ? (
          <Image
            source={{ uri: url }}
            style={{ flex: 1 }}
            // En su foto, el mueble alto viene en recorte vertical: se muestra entero.
            contentFit={p.enEspacioRecorteUrl ? "contain" : "cover"}
            transition={200}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: espacio.s4, padding: espacio.s8 }}>
            <Icono de={ImageOff} color="ink600" />
            <Texto variante="bodySm" color="ink600" centrado>Imagen no disponible</Texto>
          </View>
        )}
        <View style={{ position: "absolute", top: espacio.s8, left: espacio.s8 }}>
          <Etiqueta tipo="ia" texto="IA" />
        </View>
        {destacado ? (
          <View style={{ position: "absolute", bottom: espacio.s8, left: espacio.s8, right: espacio.s8 }}>
            <Etiqueta tipo="marca" texto={destacado} />
          </View>
        ) : null}
      </View>
      <View style={{ padding: espacio.s12, gap: espacio.s4, flex: 1 }}>
        <Texto variante="titleSm" numberOfLines={2} style={{ minHeight: 48 }}>{p.nombre}</Texto>
        <Texto variante="bodySm" color="ink600" numberOfLines={1}>{medidasTexto(p.medidas, unidades)}</Texto>
        <Texto variante="bodySm" color="ink600" numberOfLines={1}>{p.materialTexto}</Texto>
        <Texto variante="labelLg" style={{ marginTop: espacio.s4 }} numberOfLines={1}>{precioTexto(p.precio, moneda)}</Texto>
        <View style={{ flex: 1 }} />
        <View style={{ marginTop: espacio.s8 }}>
          <Etiqueta tipo={tipoAjuste(p.ajuste)} texto={textoAjusteCorto(p.ajuste)} />
        </View>
      </View>
    </Pressable>
  );
}

export function TarjetaMuebleEsqueleto() {
  const { c } = useTema();
  return (
    <View style={{ flex: 1, borderRadius: radio.tarjeta, backgroundColor: c.surface100, overflow: "hidden", borderWidth: 1, borderColor: c.border200 }}>
      <Esqueleto radio={0} style={{ aspectRatio: 1 }} />
      <View style={{ padding: espacio.s12, gap: espacio.s8 }}>
        <Esqueleto alto={18} ancho="80%" />
        <Esqueleto alto={14} ancho="60%" />
        <Esqueleto alto={14} ancho="45%" />
        <Esqueleto alto={18} ancho="55%" />
      </View>
    </View>
  );
}

/** Pone las tarjetas en filas de dos que se estiran a la misma altura. */
export function Rejilla<T>({ datos, render, clave }: { datos: T[]; render: (d: T, i: number) => React.ReactNode; clave: (d: T, i: number) => string | number }) {
  const filas: T[][] = [];
  for (let i = 0; i < datos.length; i += 2) filas.push(datos.slice(i, i + 2));
  return (
    <View style={{ gap: espacio.s12 }}>
      {filas.map((fila, f) => (
        <View key={clave(fila[0], f * 2)} style={{ flexDirection: "row", gap: espacio.s12, alignItems: "stretch" }}>
          {fila.map((d, i) => <View key={clave(d, f * 2 + i)} style={{ flex: 1 }}>{render(d, f * 2 + i)}</View>)}
          {fila.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );
}
