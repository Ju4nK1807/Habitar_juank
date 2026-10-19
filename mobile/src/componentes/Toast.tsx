import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CircleCheck, CircleX } from "lucide-react-native";
import { create } from "zustand";
import { useTema } from "@/theme/tema";
import { espacio, margen, radio } from "@/theme/tokens";
import { Texto } from "./Texto";
import { Icono } from "./Icono";

type Toast = { id: number; mensaje: string; tipo: "exito" | "error"; accion?: { texto: string; onPress: () => void } };

const useToasts = create<{ actual: Toast | null; mostrar: (t: Omit<Toast, "id">) => void; cerrar: () => void }>((set) => ({
  actual: null,
  mostrar: (t) => set({ actual: { ...t, id: Date.now() } }),
  cerrar: () => set({ actual: null }),
}));

export const toast = {
  exito: (mensaje: string, accion?: Toast["accion"]) => useToasts.getState().mostrar({ mensaje, tipo: "exito", accion }),
  error: (mensaje: string) => useToasts.getState().mostrar({ mensaje, tipo: "error" }),
};

/** Se monta una vez en la raíz. Aparece arriba para no tapar la barra inferior ni los botones fijos. */
export function AnfitrionToast() {
  const { actual, cerrar } = useToasts();
  const { c, oscuro } = useTema();
  const insets = useSafeAreaInsets();
  const [y] = useState(() => new Animated.Value(-120));

  useEffect(() => {
    if (!actual) return;
    AccessibilityInfo.announceForAccessibility(actual.mensaje);
    Animated.spring(y, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    const t = setTimeout(() => {
      Animated.timing(y, { toValue: -120, duration: 200, useNativeDriver: true }).start(() => cerrar());
    }, actual.accion ? 5000 : 3200);
    return () => clearTimeout(t);
  }, [actual, cerrar, y]);

  if (!actual) return null;
  return (
    <Animated.View
      pointerEvents="box-none"
      style={{ position: "absolute", left: margen.lateral, right: margen.lateral, top: insets.top + espacio.s8, transform: [{ translateY: y }] }}
    >
      <View
        style={{
          flexDirection: "row", alignItems: "center", gap: espacio.s12, padding: espacio.s16, borderRadius: radio.tarjeta,
          backgroundColor: oscuro ? c.surface300 : c.ink900,
        }}
      >
        <Icono de={actual.tipo === "exito" ? CircleCheck : CircleX} color={actual.tipo === "exito" ? (oscuro ? "accentInk" : "accent100") : (oscuro ? "danger600" : "danger100")} />
        <Texto variante="bodyMd" style={{ flex: 1, color: oscuro ? c.ink900 : c.surface000 }}>{actual.mensaje}</Texto>
        {actual.accion ? (
          <Pressable
            hitSlop={12}
            accessibilityRole="button"
            onPress={() => { actual.accion?.onPress(); cerrar(); }}
          >
            <Texto variante="labelLg" style={{ color: oscuro ? c.brandInk : c.brand100 }}>{actual.accion.texto}</Texto>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}
