import { Pressable, View } from "react-native";
import * as Haptics from "expo-haptics";
import Svg, { Circle, Line, Rect, Text as SvgText } from "react-native-svg";
import { RotateCcw } from "lucide-react-native";
import { useTema } from "@/theme/tema";
import { espacio, fuentes } from "@/theme/tokens";
import type { Marcas } from "@/servicios/tipos";
import { Texto } from "./Texto";
import { Boton } from "./Boton";
import { FotoMedible } from "./FotoMedible";

type Punto = { x: number; y: number };
type Props = { uri: string; etiquetaAncho: string; marcas: Marcas | null; onCambio: (m: Marcas | null) => void; puntoA: Punto | null; onPuntoA: (p: Punto | null) => void };

const CERCA = 0.08;

/**
 * La persona toca los dos extremos del ancho que midió, donde el muro toca el piso.
 * Con eso se sabe cuántos píxeles mide un centímetro en su foto.
 * Con las dos marcas puestas, tocar cerca de una la mueve a ese lugar.
 */
export function MarcarMuro({ uri, etiquetaAncho, marcas, onCambio, puntoA, onPuntoA }: Props) {
  const { c } = useTema();

  const tocar = (p: Punto) => {
    void Haptics.selectionAsync();
    if (marcas) {
      const d1 = Math.hypot(p.x - marcas.x1, p.y - marcas.y1);
      const d2 = Math.hypot(p.x - marcas.x2, p.y - marcas.y2);
      if (Math.min(d1, d2) > CERCA * 2) return;
      onCambio(d1 <= d2 ? { ...marcas, x1: p.x, y1: p.y } : { ...marcas, x2: p.x, y2: p.y });
      return;
    }
    if (!puntoA) return onPuntoA(p);
    if (Math.abs(p.x - puntoA.x) < 0.05) return onPuntoA(p); // demasiado cerca: se toma como nuevo primer punto
    onPuntoA(null);
    onCambio({ x1: puntoA.x, y1: puntoA.y, x2: p.x, y2: p.y });
  };

  const instruccion = marcas
    ? "Listo. Si un punto quedó corrido, toque cerca de él para moverlo."
    : puntoA
      ? "Ahora toque el otro extremo del ancho, también donde el muro toca el piso."
      : "Toque un extremo del ancho que midió, justo donde el muro toca el piso.";

  return (
    <View style={{ gap: espacio.s12 }}>
      <Texto variante="bodyMd" accessibilityLiveRegion="polite">{instruccion}</Texto>
      <FotoMedible
        uri={uri}
        altoMax={460}
        accessibilityLabel="Foto del muro. Toque los dos extremos del ancho medido"
        capa={(w, h) => (
          <Pressable
            style={{ flex: 1 }}
            onPress={(e) => tocar({ x: e.nativeEvent.locationX / w, y: e.nativeEvent.locationY / h })}
            accessibilityRole="adjustable"
            accessibilityLabel="Área para marcar el muro"
          >
            <Svg width={w} height={h} pointerEvents="none">
              {marcas ? (
                <>
                  <Line x1={marcas.x1 * w} y1={marcas.y1 * h} x2={marcas.x2 * w} y2={marcas.y2 * h} stroke={c.camaraFondo} strokeWidth={5} strokeOpacity={0.5} />
                  <Line x1={marcas.x1 * w} y1={marcas.y1 * h} x2={marcas.x2 * w} y2={marcas.y2 * h} stroke={c.brand500} strokeWidth={3} />
                  <Rect x={(marcas.x1 + marcas.x2) / 2 * w - 34} y={Math.min(marcas.y1, marcas.y2) * h - 32} width={68} height={22} rx={11} fill={c.brand600} />
                  <SvgText x={(marcas.x1 + marcas.x2) / 2 * w} y={Math.min(marcas.y1, marcas.y2) * h - 17} fill={c.onBrand} fontSize={12} fontFamily={fuentes.bold} textAnchor="middle">
                    {etiquetaAncho}
                  </SvgText>
                </>
              ) : null}
              {[marcas ? { x: marcas.x1, y: marcas.y1 } : puntoA, marcas ? { x: marcas.x2, y: marcas.y2 } : null].map((p, i) =>
                p ? (
                  <Circle key={i} cx={p.x * w} cy={p.y * h} r={9} fill={c.brand600} stroke={c.camaraTinta} strokeWidth={3} />
                ) : null,
              )}
            </Svg>
          </Pressable>
        )}
      />
      {marcas || puntoA ? (
        <Boton titulo="Marcar de nuevo" icono={RotateCcw} variante="texto" tamaño="pequeño" onPress={() => { onPuntoA(null); onCambio(null); }} style={{ alignSelf: "flex-start" }} />
      ) : null}
    </View>
  );
}
