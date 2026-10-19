import { Tabs } from "expo-router";
import { BarraInferior } from "@/componentes/BarraInferior";
import { useTema } from "@/theme/tema";

export default function LayoutPestañas() {
  const { c } = useTema();
  return (
    <Tabs
      tabBar={(props) => <BarraInferior {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.surface000 } }}
    >
      <Tabs.Screen name="index" options={{ title: "Inicio" }} />
      <Tabs.Screen name="espacios" options={{ title: "Espacios" }} />
      <Tabs.Screen name="proyectos" options={{ title: "Proyectos" }} />
      <Tabs.Screen name="perfil" options={{ title: "Perfil" }} />
    </Tabs>
  );
}
