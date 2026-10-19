import { useEffect } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { Fraunces_700Bold } from "@expo-google-fonts/fraunces";
import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { useTema } from "@/theme/tema";
import { AnfitrionToast } from "@/componentes/Toast";

export default function Raiz() {
  const { c, oscuro } = useTema();
  const [listas] = useFonts({ Fraunces_700Bold, Inter_400Regular, Inter_600SemiBold, Inter_700Bold });

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(c.surface000);
  }, [c.surface000]);

  if (!listas) return <View style={{ flex: 1, backgroundColor: c.surface000 }} />;

  return (
    <SafeAreaProvider>
      <StatusBar style={oscuro ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.surface000 } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="nuevo" options={{ gestureEnabled: false }} />
      </Stack>
      <AnfitrionToast />
    </SafeAreaProvider>
  );
}
