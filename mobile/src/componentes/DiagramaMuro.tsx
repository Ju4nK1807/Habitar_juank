import { View } from "react-native";
import Svg, { Line, Path, Polygon, Rect, Text as SvgText } from "react-native-svg";
import { useTema } from "@/theme/tema";
import { fuentes } from "@/theme/tokens";

export type Cota = "ancho" | "alto" | "fondo" | "piso";

type Props = { valores: Partial<Record<Cota, string>>; activa?: Cota | null; conPiso?: boolean; unidades: string };

/** Diagrama que indica dónde medir. La cota del campo enfocado se resalta. */
export function DiagramaMuro({ valores, activa, conPiso, unidades }: Props) {
  const { c } = useTema();
  const color = (k: Cota) => (activa === k ? c.brand600 : c.ink600);
  const grosor = (k: Cota) => (activa === k ? 2.5 : 1.5);
  const etiqueta = (k: Cota, nombre: string) => (valores[k] ? `${valores[k]} ${unidades}` : nombre);
  const texto = (x: number, y: number, k: Cota, nombre: string, anchor: "middle" | "start" | "end" = "middle", rot?: number) => (
    <SvgText x={x} y={y} fill={color(k)} fontSize={12} fontFamily={activa === k ? fuentes.bold : fuentes.semibold} textAnchor={anchor} rotation={rot} origin={`${x},${y}`}>
      {etiqueta(k, nombre)}
    </SvgText>
  );
  const flecha = (x1: number, y1: number, x2: number, y2: number, k: Cota) => (
    <>
      <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color(k)} strokeWidth={grosor(k)} />
      <Line x1={x1} y1={y1} x2={x1 + (y2 - y1 ? 5 : 0)} y2={y1 + (x2 - x1 ? 5 : 0)} stroke={color(k)} strokeWidth={grosor(k)} />
      <Line x1={x1} y1={y1} x2={x1 - (y2 - y1 ? 5 : 0)} y2={y1 - (x2 - x1 ? 5 : 0)} stroke={color(k)} strokeWidth={grosor(k)} />
      <Line x1={x2} y1={y2} x2={x2 + (y2 - y1 ? 5 : 0)} y2={y2 + (x2 - x1 ? 5 : 0)} stroke={color(k)} strokeWidth={grosor(k)} />
      <Line x1={x2} y1={y2} x2={x2 - (y2 - y1 ? 5 : 0)} y2={y2 - (x2 - x1 ? 5 : 0)} stroke={color(k)} strokeWidth={grosor(k)} />
    </>
  );

  return (
    <View style={{ aspectRatio: 320 / 210 }} accessible accessibilityRole="image" accessibilityLabel="Diagrama: el ancho se mide de lado a lado del muro, el alto del piso al techo o al límite, y el fondo desde el muro hacia afuera">
      <Svg width="100%" height="100%" viewBox="0 0 320 210">
        {/* Piso en perspectiva (fondo) */}
        <Polygon points="70,160 250,160 290,195 30,195" fill={c.surface300} stroke={c.border400} strokeWidth={1} />
        {/* Muro */}
        <Rect x={70} y={20} width={180} height={140} fill={c.surface200} stroke={c.border400} strokeWidth={1.5} />
        {/* Zona del mueble */}
        <Rect x={95} y={70} width={130} height={90} fill="none" stroke={c.border400} strokeWidth={1} strokeDasharray="5 4" />
        {/* Ancho */}
        {flecha(70, 12, 250, 12, "ancho")}
        {texto(160, 8, "ancho", "Ancho")}
        {/* Alto */}
        {flecha(56, 20, 56, 160, "alto")}
        {texto(44, 90, "alto", "Alto", "middle", -90)}
        {/* Fondo: del muro hacia afuera, sobre el piso */}
        <Path d="M 250 160 L 285 192" stroke={color("fondo")} strokeWidth={grosor("fondo")} />
        {texto(292, 182, "fondo", "Fondo", "start")}
        {/* Altura desde el piso */}
        {conPiso ? (
          <>
            {flecha(235, 70, 235, 160, "piso")}
            {texto(242, 120, "piso", "Desde piso", "start")}
          </>
        ) : null}
      </Svg>
    </View>
  );
}
