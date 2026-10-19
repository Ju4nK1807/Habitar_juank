import { KeyboardAvoidingView, Platform, View } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { useTema } from "@/theme/tema";
import { espacio, margen } from "@/theme/tokens";

type Props = { children: React.ReactNode; bordes?: Edge[]; teclado?: boolean };

/** Contenedor base: fondo del tema y zona segura. */
export function Pantalla({ children, bordes = ["top"], teclado }: Props) {
  const { c } = useTema();
  const contenido = <SafeAreaView edges={bordes} style={{ flex: 1, backgroundColor: c.surface000 }}>{children}</SafeAreaView>;
  if (!teclado) return contenido;
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: c.surface000 }}>
      {contenido}
    </KeyboardAvoidingView>
  );
}

/** Barra fija inferior para la acción principal del flujo. */
export function BarraFija({ children }: { children: React.ReactNode }) {
  const { c } = useTema();
  return (
    <View
      style={{
        paddingHorizontal: margen.lateral, paddingTop: espacio.s12, paddingBottom: espacio.s12, gap: espacio.s8,
        backgroundColor: c.surface200, borderTopWidth: 1, borderTopColor: c.border200,
      }}
    >
      {children}
    </View>
  );
}
