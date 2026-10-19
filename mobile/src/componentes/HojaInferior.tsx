import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { useTema } from "@/theme/tema";
import { espacio, margen, radio } from "@/theme/tokens";
import { Texto } from "./Texto";
import { BotonIcono } from "./BotonIcono";

type Props = { visible: boolean; titulo: string; onCerrar: () => void; children: React.ReactNode; pie?: React.ReactNode };

export function HojaInferior({ visible, titulo, onCerrar, children, pie }: Props) {
  const { c } = useTema();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable style={{ position: "absolute", inset: 0, backgroundColor: c.scrim }} onPress={onCerrar} accessibilityLabel="Cerrar" accessibilityRole="button" />
        <View
          accessibilityViewIsModal
          style={{
            backgroundColor: c.surface200, borderTopLeftRadius: radio.hoja, borderTopRightRadius: radio.hoja,
            maxHeight: "85%", paddingBottom: insets.bottom + espacio.s16,
          }}
        >
          <View style={{ alignItems: "center", paddingTop: espacio.s8 }}>
            <View style={{ width: 36, height: 4, borderRadius: radio.completo, backgroundColor: c.border400 }} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", paddingLeft: margen.lateral, paddingRight: espacio.s8, paddingVertical: espacio.s8 }}>
            <Texto variante="titleMd" style={{ flex: 1 }} accessibilityRole="header">{titulo}</Texto>
            <BotonIcono icono={X} etiqueta="Cerrar" onPress={onCerrar} />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: margen.lateral, paddingBottom: espacio.s16, gap: espacio.s16 }}>
            {children}
          </ScrollView>
          {pie ? <View style={{ paddingHorizontal: margen.lateral, paddingTop: espacio.s8 }}>{pie}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
