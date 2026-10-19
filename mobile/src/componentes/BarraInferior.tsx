import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import type { BottomTabBarProps } from "expo-router/tabs";
import { FolderOpen, House, LayoutGrid, Plus, UserRound, type LucideIcon } from "lucide-react-native";
import { useTema } from "@/theme/tema";
import { espacio, radio } from "@/theme/tokens";
import { Texto } from "./Texto";
import { Icono } from "./Icono";

const PESTAÑAS: Record<string, { titulo: string; icono: LucideIcon }> = {
  index: { titulo: "Inicio", icono: House },
  espacios: { titulo: "Espacios", icono: LayoutGrid },
  proyectos: { titulo: "Proyectos", icono: FolderOpen },
  perfil: { titulo: "Perfil", icono: UserRound },
};

export function BotonFlotante({ onPress }: { onPress: () => void }) {
  const { c } = useTema();
  return (
    <Pressable
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel="Diseñar un mueble nuevo"
      style={({ pressed }) => ({
        width: 60, height: 60, borderRadius: radio.completo, marginTop: -28,
        alignItems: "center", justifyContent: "center",
        backgroundColor: pressed ? c.brand500 : c.brand600,
        borderWidth: 4, borderColor: c.surface200,
      })}
    >
      <Icono de={Plus} color="onBrand" tamaño={28} />
    </Pressable>
  );
}

/** Barra de 4 pestañas con el botón flotante central que abre el flujo de creación. */
export function BarraInferior({ state, navigation }: BottomTabBarProps) {
  const { c } = useTema();
  const insets = useSafeAreaInsets();
  const rutas = state.routes.filter((r) => PESTAÑAS[r.name]);

  const pestaña = (nombre: string) => {
    const i = state.routes.findIndex((r) => r.name === nombre);
    const ruta = state.routes[i];
    const activa = state.index === i;
    const { titulo, icono } = PESTAÑAS[nombre];
    return (
      <Pressable
        key={ruta.key}
        onPress={() => {
          const e = navigation.emit({ type: "tabPress", target: ruta.key, canPreventDefault: true });
          if (!activa && !e.defaultPrevented) navigation.navigate(ruta.name);
        }}
        accessibilityRole="tab"
        accessibilityState={{ selected: activa }}
        accessibilityLabel={titulo}
        style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: espacio.s4, minHeight: 56 }}
      >
        <View style={{ paddingHorizontal: espacio.s16, paddingVertical: espacio.s4, borderRadius: radio.completo, backgroundColor: activa ? c.brand100 : "transparent" }}>
          <Icono de={icono} color={activa ? "brandInk" : "ink600"} />
        </View>
        <Texto variante="labelMd" color={activa ? "brandInk" : "ink600"}>{titulo}</Texto>
      </Pressable>
    );
  };

  const nombres = rutas.map((r) => r.name);
  return (
    <View
      style={{
        flexDirection: "row", alignItems: "flex-start", backgroundColor: c.surface200,
        borderTopWidth: 1, borderTopColor: c.border200, paddingTop: espacio.s8, paddingBottom: Math.max(insets.bottom, espacio.s8),
      }}
    >
      {nombres.slice(0, 2).map(pestaña)}
      <View style={{ width: 72, alignItems: "center" }}>
        <BotonFlotante onPress={() => router.push("/nuevo/espacio")} />
      </View>
      {nombres.slice(2).map(pestaña)}
    </View>
  );
}
