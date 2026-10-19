import { View } from "react-native";
import { useTema } from "@/theme/tema";
import { espacio, radio } from "@/theme/tokens";
import { Texto } from "./Texto";

export function Pasos({ actual, total = 4 }: { actual: number; total?: number }) {
  const { c } = useTema();
  return (
    <View style={{ gap: espacio.s8 }} accessibilityLabel={`Paso ${actual} de ${total}`} accessible>
      <Texto variante="labelSm" color="ink600">Paso {actual} de {total}</Texto>
      <View style={{ flexDirection: "row", gap: espacio.s4 }}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={{ flex: 1, height: 4, borderRadius: radio.completo, backgroundColor: i < actual ? c.brand600 : c.surface300 }} />
        ))}
      </View>
    </View>
  );
}
