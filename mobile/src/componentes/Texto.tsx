import { Text, type TextProps } from "react-native";
import { useTema } from "@/theme/tema";
import { tipografia, type Colores, type VarianteTexto } from "@/theme/tokens";

type Props = TextProps & { variante?: VarianteTexto; color?: keyof Colores; centrado?: boolean };

export function Texto({ variante = "bodyMd", color = "ink900", centrado, style, ...resto }: Props) {
  const { c } = useTema();
  return (
    <Text
      maxFontSizeMultiplier={1.4}
      {...resto}
      style={[tipografia[variante], { color: c[color] }, centrado && { textAlign: "center" }, style]}
    />
  );
}
