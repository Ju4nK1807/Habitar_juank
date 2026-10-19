import { useState } from "react";
import { View } from "react-native";
import Svg, { Line, Rect, Text as SvgText, G } from "react-native-svg";
import { useTema } from "@/theme/tema";
import { espacio, fuentes, radio } from "@/theme/tokens";
import { usePreferencias } from "@/store/preferencias";
import { medida } from "@/lib/formato";
import type { Propuesta } from "@/servicios/tipos";
import { Texto } from "./Texto";

const PAD = { izq: 44, der: 12, arriba: 28, abajo: 36 };

/**
 * Dibujo a escala del muro disponible con el mueble apoyado en el piso y centrado.
 * Sale de los números exactos: si el mueble excede, se ve por dónde y cuánto.
 */
export function DibujoEscala({ propuesta: p }: { propuesta: Propuesta }) {
  if (p.limites.anchoMaxCm === null || p.limites.altoMaxCm === null) {
    return (
      <Texto variante="bodyMd" color="ink600">
        Este diseño se hizo sin medidas del espacio, así que no hay muro con qué compararlo. El mueble mide {p.medidasTexto}.
      </Texto>
    );
  }
  return <Dibujo propuesta={p} muro={{ w: p.limites.anchoMaxCm, h: p.limites.altoMaxCm }} />;
}

function Dibujo({ propuesta: p, muro }: { propuesta: Propuesta; muro: { w: number; h: number } }) {
  const { c } = useTema();
  const unidades = usePreferencias((s) => s.unidades);
  const [ancho, setAncho] = useState(0);

  const mueble = { w: p.medidas.anchoCm, h: p.medidas.altoCm };
  const altoMax = ancho * 0.85;
  const escala = Math.min(
    (ancho - PAD.izq - PAD.der) / Math.max(muro.w, mueble.w),
    (altoMax - PAD.arriba - PAD.abajo) / Math.max(muro.h, mueble.h),
  );
  const alto = PAD.arriba + Math.max(muro.h, mueble.h) * escala + PAD.abajo;

  // Coordenadas: el piso es la línea base común.
  const piso = alto - PAD.abajo;
  const centro = PAD.izq + (Math.max(muro.w, mueble.w) * escala) / 2;
  const mx = centro - (muro.w * escala) / 2;
  const fx = centro - (mueble.w * escala) / 2;
  const tinta = p.ajuste === "cabe" ? c.accentInk : p.ajuste === "ajustado" ? c.warning600 : c.danger600;
  const relleno = p.ajuste === "cabe" ? c.accent100 : p.ajuste === "ajustado" ? c.warning100 : c.danger100;
  const t = (x: number, y: number, texto: string, color: string, anchor: "start" | "middle" | "end" = "middle", rot?: number) => (
    <SvgText x={x} y={y} fill={color} fontSize={12} fontFamily={fuentes.semibold} textAnchor={anchor} rotation={rot} origin={`${x},${y}`}>{texto}</SvgText>
  );

  const fondoMax = p.limites.fondoMaxCm;
  const resumen = `Muro de ${medida(muro.w, unidades)} por ${medida(muro.h, unidades)}. Mueble de ${medida(mueble.w, unidades)} por ${medida(mueble.h, unidades)}. ${p.etiquetaAjuste}`;

  return (
    <View style={{ gap: espacio.s16 }}>
      <View onLayout={(e) => setAncho(e.nativeEvent.layout.width)} accessible accessibilityRole="image" accessibilityLabel={resumen}>
        {ancho > 0 && escala > 0 ? (
          <Svg width={ancho} height={alto}>
            {/* Muro disponible */}
            <Rect x={mx} y={piso - muro.h * escala} width={muro.w * escala} height={muro.h * escala} fill={c.surface200} stroke={c.border400} strokeWidth={1} strokeDasharray="6 4" />
            {/* Piso */}
            <Line x1={PAD.izq - 8} y1={piso} x2={ancho - PAD.der} y2={piso} stroke={c.ink600} strokeWidth={2} />
            {/* Mueble */}
            <Rect x={fx} y={piso - mueble.h * escala} width={mueble.w * escala} height={mueble.h * escala} fill={relleno} stroke={tinta} strokeWidth={2} rx={2} />
            {/* Cotas del muro */}
            <G>
              {t(mx + (muro.w * escala) / 2, piso - muro.h * escala - 8, `Muro ${medida(muro.w, unidades)}`, c.ink600)}
              {t(PAD.izq - 14, piso - (muro.h * escala) / 2, medida(muro.h, unidades), c.ink600, "middle", -90)}
            </G>
            {/* Medidas del mueble, debajo del piso y dentro */}
            {t(centro, piso + 20, `Mueble ${medida(mueble.w, unidades)} × ${medida(mueble.h, unidades)}`, tinta)}
          </Svg>
        ) : (
          <View style={{ height: 200 }} />
        )}
      </View>

      {fondoMax ? (
        <View style={{ gap: espacio.s8 }} accessible accessibilityLabel={`Fondo: ${medida(p.medidas.fondoCm, unidades)} de ${medida(fondoMax, unidades)} disponibles`}>
          <Texto variante="labelMd" color="ink600">Fondo: {medida(p.medidas.fondoCm, unidades)} de {medida(fondoMax, unidades)}</Texto>
          <View style={{ height: 12, borderRadius: radio.completo, backgroundColor: c.surface300, overflow: "hidden" }}>
            <View style={{ width: `${Math.min(100, (p.medidas.fondoCm / fondoMax) * 100)}%`, height: "100%", backgroundColor: tinta, borderRadius: radio.completo }} />
          </View>
        </View>
      ) : null}

      <View style={{ flexDirection: "row", gap: espacio.s16, flexWrap: "wrap" }}>
        <Leyenda color={c.surface200} borde={c.border400} texto="Espacio disponible" punteado />
        <Leyenda color={relleno} borde={tinta} texto="Mueble propuesto" />
      </View>
    </View>
  );
}

function Leyenda({ color, borde, texto, punteado }: { color: string; borde: string; texto: string; punteado?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.s8 }}>
      <View style={{ width: 16, height: 16, borderRadius: 3, backgroundColor: color, borderWidth: punteado ? 1 : 2, borderColor: borde, borderStyle: punteado ? "dashed" : "solid" }} />
      <Texto variante="bodySm" color="ink600">{texto}</Texto>
    </View>
  );
}
