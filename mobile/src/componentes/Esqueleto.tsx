import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, type DimensionValue, type StyleProp, type ViewStyle } from "react-native";
import { useTema } from "@/theme/tema";
import { radio as radios } from "@/theme/tokens";

type Props = { ancho?: DimensionValue; alto?: DimensionValue; radio?: number; style?: StyleProp<ViewStyle> };

/** Bloque de carga con pulso suave. Respeta "reducir movimiento". */
export function Esqueleto({ ancho = "100%", alto, radio = radios.campo, style }: Props) {
  const { c } = useTema();
  const [opacidad] = useState(() => new Animated.Value(1));

  useEffect(() => {
    let bucle: Animated.CompositeAnimation | null = null;
    AccessibilityInfo.isReduceMotionEnabled().then((reducir) => {
      if (reducir) return;
      bucle = Animated.loop(
        Animated.sequence([
          Animated.timing(opacidad, { toValue: 0.5, duration: 700, useNativeDriver: true }),
          Animated.timing(opacidad, { toValue: 1, duration: 700, useNativeDriver: true }),
        ]),
      );
      bucle.start();
    });
    return () => bucle?.stop();
  }, [opacidad]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width: ancho, height: alto, borderRadius: radio, backgroundColor: c.surface300, opacity: opacidad }, style]}
    />
  );
}
