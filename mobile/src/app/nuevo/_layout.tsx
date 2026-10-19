import { Stack } from "expo-router";
import { useTema } from "@/theme/tema";

/** Flujo de creación: cubre la barra inferior. Atrás vuelve al paso anterior sin borrar nada. */
export default function LayoutFlujo() {
  const { c } = useTema();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.surface000 } }}>
      <Stack.Screen name="espacio" />
      <Stack.Screen name="necesidad" />
      <Stack.Screen name="restricciones" />
      <Stack.Screen name="disenando" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
