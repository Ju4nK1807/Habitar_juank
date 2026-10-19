import { View } from "react-native";
import { CircleAlert, CircleCheck, CircleX, Info, WifiOff, type LucideIcon } from "lucide-react-native";
import { useTema } from "@/theme/tema";
import { espacio, radio, type Colores } from "@/theme/tokens";
import { Texto } from "./Texto";
import { Icono } from "./Icono";
import { Boton } from "./Boton";

type Tipo = "info" | "exito" | "alerta" | "error" | "sinConexion";

const ESTILO: Record<Tipo, { fondo: keyof Colores; tinta: keyof Colores; icono: LucideIcon }> = {
  info: { fondo: "brand100", tinta: "brandInk", icono: Info },
  exito: { fondo: "accent100", tinta: "accentInk", icono: CircleCheck },
  alerta: { fondo: "warning100", tinta: "warning600", icono: CircleAlert },
  error: { fondo: "danger100", tinta: "danger600", icono: CircleX },
  sinConexion: { fondo: "surface200", tinta: "ink900", icono: WifiOff },
};

type Props = {
  tipo?: Tipo;
  titulo?: string;
  mensaje: string;
  accion?: { texto: string; onPress: () => void };
};

/** Dice qué pasó y qué sigue. */
export function Aviso({ tipo = "info", titulo, mensaje, accion }: Props) {
  const { c } = useTema();
  const e = ESTILO[tipo];
  return (
    <View
      accessibilityRole="alert"
      style={{ flexDirection: "row", gap: espacio.s12, padding: espacio.s16, borderRadius: radio.tarjeta, backgroundColor: c[e.fondo] }}
    >
      <Icono de={e.icono} color={e.tinta} />
      <View style={{ flex: 1, gap: espacio.s4 }}>
        {titulo ? <Texto variante="labelLg" color={e.tinta}>{titulo}</Texto> : null}
        <Texto variante="bodyMd" color="ink900">{mensaje}</Texto>
        {accion ? (
          <Boton titulo={accion.texto} onPress={accion.onPress} variante="texto" tamaño="pequeño" style={{ alignSelf: "flex-start", marginLeft: -espacio.s12, marginTop: espacio.s4 }} />
        ) : null}
      </View>
    </View>
  );
}
