import { useState } from "react";
import { View, type LayoutChangeEvent } from "react-native";
import { Image } from "expo-image";
import { useTema } from "@/theme/tema";
import { radio } from "@/theme/tokens";

type Props = {
  uri: string;
  /** Alto máximo en pantalla; fotos verticales muy altas se angostan para caber. */
  altoMax?: number;
  /** Capa encima de la foto, con su tamaño en pantalla. */
  capa?: (ancho: number, alto: number) => React.ReactNode;
  accessibilityLabel: string;
};

/** Muestra la foto completa (sin recortar) y permite dibujar encima en sus coordenadas. */
export function FotoMedible({ uri, altoMax = 480, capa, accessibilityLabel }: Props) {
  const { c } = useTema();
  const [contenedor, setContenedor] = useState(0);
  const [aspecto, setAspecto] = useState<number | null>(null);

  const ancho = aspecto ? Math.min(contenedor, altoMax * aspecto) : contenedor;
  const alto = aspecto ? ancho / aspecto : altoMax * 0.6;

  return (
    <View onLayout={(e: LayoutChangeEvent) => setContenedor(e.nativeEvent.layout.width)} style={{ alignItems: "center" }}>
      <View style={{ width: ancho, height: alto, borderRadius: radio.campo, overflow: "hidden", backgroundColor: c.surface300 }}>
        <Image
          source={{ uri }}
          style={{ width: "100%", height: "100%" }}
          contentFit="fill"
          onLoad={(e) => setAspecto(e.source.width / e.source.height)}
          accessibilityLabel={accessibilityLabel}
        />
        {aspecto && ancho > 0 && capa ? <View style={{ position: "absolute", inset: 0 }}>{capa(ancho, alto)}</View> : null}
      </View>
    </View>
  );
}
