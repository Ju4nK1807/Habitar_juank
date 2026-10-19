import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { ImagePlus, X } from "lucide-react-native";
import { api, ErrorApi } from "@/servicios/api";
import { useCatalogos } from "@/hooks/useCatalogos";
import { useTema } from "@/theme/tema";
import { espacio, margen, radio } from "@/theme/tokens";
import { useBorrador } from "@/store/borrador";
import { cerrarFlujo } from "@/lib/flujo";
import { Pantalla, BarraFija } from "@/componentes/Pantalla";
import { BarraSuperior } from "@/componentes/BarraSuperior";
import { Texto } from "@/componentes/Texto";
import { Icono } from "@/componentes/Icono";
import { Boton } from "@/componentes/Boton";
import { Chip, GrupoChips } from "@/componentes/Chip";
import { CampoTexto } from "@/componentes/CampoTexto";
import { Aviso } from "@/componentes/Aviso";
import { Esqueleto } from "@/componentes/Esqueleto";
import { toast } from "@/componentes/Toast";

const MAX = 280;
const MIN = 12;

export default function PasoNecesidad() {
  const b = useBorrador();
  const catalogos = useCatalogos();
  const largo = b.descripcion.trim().length;

  const motivo = !b.tipo ? "Elija el tipo de mueble para continuar" : largo < MIN ? "Describa un poco más lo que necesita" : undefined;

  return (
    <Pantalla bordes={["top", "bottom"]} teclado>
      <BarraSuperior variante="flujo" paso={2} onCerrar={cerrarFlujo} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: margen.lateral, gap: margen.secciones }}>
        <View style={{ gap: espacio.s8 }}>
          <Texto variante="titleLg" accessibilityRole="header">¿Qué necesita?</Texto>
          <Texto variante="bodyMd" color="ink600">Cuéntelo con sus palabras. Entre más contexto, mejores propuestas.</Texto>
        </View>

        <View style={{ gap: espacio.s12 }}>
          <Texto variante="labelLg">Tipo de mueble</Texto>
          {catalogos.error ? (
            <Aviso tipo={catalogos.error.sinConexion ? "sinConexion" : "error"} mensaje={catalogos.error.message} accion={{ texto: "Reintentar", onPress: catalogos.recargar }} />
          ) : catalogos.datos ? (
            <GrupoChips>
              {catalogos.datos.tipos.map((t) => (
                <Chip key={t.id} texto={t.nombre} activo={b.tipo === t.id} onPress={() => b.cambiar({ tipo: t.id })} />
              ))}
            </GrupoChips>
          ) : (
            <GrupoChips>{[90, 120, 100, 80, 110].map((w, i) => <Esqueleto key={i} ancho={w} alto={36} radio={radio.completo} />)}</GrupoChips>
          )}
        </View>

        <CampoTexto
          etiqueta="Descripción"
          value={b.descripcion}
          onChangeText={(descripcion) => b.cambiar({ descripcion })}
          placeholder="Ej: Un mueble para el TV de 55 pulgadas con espacio para libros y la consola, que no se vea recargado"
          lineas={5}
          max={MAX}
          ayuda="Qué guardará, quién lo usará y el estilo que le gusta."
        />

        <Referencias />
      </ScrollView>

      <BarraFija>
        <Boton titulo="Continuar" onPress={() => router.push("/nuevo/restricciones")} deshabilitado={!!motivo} motivo={motivo} ancho />
      </BarraFija>
    </Pantalla>
  );
}

/** Dos huecos opcionales para fotos de referencia de estilo. Se suben al elegirlas. */
function Referencias() {
  const { c } = useTema();
  const { referencias, cambiar } = useBorrador();
  const [subiendo, setSubiendo] = useState<number | null>(null);

  const elegir = async (i: number) => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7, allowsEditing: true });
    if (r.canceled) return;
    const uri = r.assets[0].uri;
    setSubiendo(i);
    try {
      const { fotoUrl } = await api.subirFoto(uri);
      const nuevas = [...useBorrador.getState().referencias];
      nuevas[i] = { uri, fotoUrl };
      cambiar({ referencias: nuevas.filter(Boolean) });
    } catch (e) {
      toast.error(e instanceof ErrorApi ? e.message : "No pudimos subir la imagen. Intente de nuevo");
    } finally {
      setSubiendo(null);
    }
  };

  return (
    <View style={{ gap: espacio.s12 }}>
      <View style={{ gap: espacio.s4 }}>
        <Texto variante="labelLg">Referencias <Texto variante="bodySm" color="ink600">(opcional)</Texto></Texto>
        <Texto variante="bodySm" color="ink600">Fotos de muebles o ambientes que le gusten. La IA toma el estilo, no los copia.</Texto>
      </View>
      <View style={{ flexDirection: "row", gap: espacio.s12 }}>
        {[0, 1].map((i) => {
          const ref = referencias[i];
          return (
            <View key={i} style={{ flex: 1, aspectRatio: 1 }}>
              {ref ? (
                <>
                  <Image source={{ uri: ref.uri }} style={{ flex: 1, borderRadius: radio.tarjeta }} contentFit="cover" accessibilityLabel={`Referencia ${i + 1}`} />
                  <Pressable
                    onPress={() => cambiar({ referencias: referencias.filter((_, j) => j !== i) })}
                    accessibilityRole="button"
                    accessibilityLabel={`Quitar referencia ${i + 1}`}
                    hitSlop={8}
                    style={{ position: "absolute", top: espacio.s8, right: espacio.s8, width: 32, height: 32, borderRadius: radio.completo, backgroundColor: c.surface000 + "E6", alignItems: "center", justifyContent: "center" }}
                  >
                    <Icono de={X} tamaño={18} />
                  </Pressable>
                </>
              ) : (
                <Pressable
                  onPress={() => elegir(i)}
                  disabled={subiendo !== null || (i === 1 && !referencias[0])}
                  accessibilityRole="button"
                  accessibilityLabel={`Agregar referencia ${i + 1}`}
                  style={({ pressed }) => ({
                    flex: 1, borderRadius: radio.tarjeta, borderWidth: 1, borderStyle: "dashed", borderColor: c.border400,
                    alignItems: "center", justifyContent: "center", gap: espacio.s8,
                    backgroundColor: pressed ? c.surface200 : "transparent",
                    opacity: i === 1 && !referencias[0] ? 0.5 : 1,
                  })}
                >
                  {subiendo === i ? <ActivityIndicator color={c.brand600} /> : <Icono de={ImagePlus} color="ink600" />}
                  <Texto variante="labelMd" color="ink600">{subiendo === i ? "Subiendo…" : "Agregar"}</Texto>
                </Pressable>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
